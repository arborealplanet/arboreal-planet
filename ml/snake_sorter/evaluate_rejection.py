from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from transformers import AutoImageProcessor

from dataset import TAXA
from inference import aggregate_views, nearest_similarity_ood
from model import SnakeSorterModel


DEFAULT_POLICY = {
    "confidence_floor": 0.60,
    "margin_floor": 0.15,
    "ood_ceiling": 0.38,
    "evidence_quality_floor": 0.42,
}


class ManifestDataset(Dataset):
    def __init__(self, manifest: Path, media_root: Path, split: str | None = None):
        frame = pd.read_csv(manifest)
        if split is not None:
            frame = frame.loc[frame["dataset_split"].astype(str) == split].copy()
        if frame.empty:
            raise ValueError(f"No rows available for split={split!r}")
        self.frame = frame.reset_index(drop=True)
        self.media_root = media_root

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, index: int):
        row = self.frame.iloc[index]
        path = self.media_root / str(row["storage_path"])
        with Image.open(path) as source:
            image = source.convert("RGB")
        return {
            "image": image,
            "animal_id": str(row["animal_id"]),
            "taxon": str(row["taxon"]),
            "view_type": str(row.get("view_type") or "unknown"),
            "split_group": clean(row.get("split_group")),
            "challenge_expectation": clean(row.get("challenge_expectation")) or "review",
            "media_id": str(row.get("media_id") or ""),
        }


def clean(value) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Calibrate and evaluate Snake Sorter rejection behavior."
    )
    parser.add_argument("--classifier-dataset", required=True)
    parser.add_argument("--challenge-dataset", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--reference-embeddings", required=True)
    parser.add_argument("--calibration-json", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--policy-output", required=True)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--num-workers", type=int, default=4)
    return parser.parse_args()


def collate_for(processor):
    def collate(items):
        encoded = processor(
            images=[item["image"] for item in items],
            return_tensors="pt",
        )
        return {
            "pixel_values": encoded["pixel_values"],
            "items": [
                {key: value for key, value in item.items() if key != "image"}
                for item in items
            ],
        }
    return collate


@torch.no_grad()
def infer_images(model, loader, device):
    rows = []
    for batch in loader:
        out = model(batch["pixel_values"].to(device))
        logits = out["taxon_logits"].detach().cpu()
        embeddings = out["embedding"].detach().cpu()
        for index, item in enumerate(batch["items"]):
            rows.append({
                **item,
                "logits": logits[index],
                "embedding": embeddings[index],
            })
    return rows


def load_reference_matrix(path: Path) -> torch.Tensor:
    vectors = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            vector = row.get("embedding")
            if isinstance(vector, list) and len(vector) == 256:
                vectors.append(vector)
    if not vectors:
        raise RuntimeError("Reference embeddings are empty")
    return torch.tensor(vectors, dtype=torch.float32)


def aggregate_animals(rows: list[dict], temperature: float) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["animal_id"]].append(row)

    output = []
    for animal_id, items in grouped.items():
        taxa = {item["taxon"] for item in items}
        if len(taxa) != 1:
            raise RuntimeError(f"Animal {animal_id} has conflicting taxon labels")
        expectations = {item["challenge_expectation"] for item in items}
        if len(expectations) != 1:
            raise RuntimeError(
                f"Animal {animal_id} has conflicting challenge expectations"
            )
        groups = {item["split_group"] for item in items if item["split_group"]}
        if len(groups) > 1:
            raise RuntimeError(
                f"Animal {animal_id} has conflicting split groups"
            )

        aggregate = aggregate_views(
            torch.stack([item["logits"] for item in items]),
            torch.stack([item["embedding"] for item in items]),
            [item["view_type"] for item in items],
            temperature=temperature,
        )
        ordered = sorted(
            aggregate.scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )
        predicted_taxon = ordered[0][0]
        true_taxon = next(iter(taxa))
        output.append({
            "animal_id": animal_id,
            "group_key": next(iter(groups), animal_id),
            "taxon": true_taxon,
            "expectation": next(iter(expectations)),
            "predicted_taxon": predicted_taxon,
            "confidence": aggregate.confidence,
            "margin": aggregate.top_two_margin,
            "entropy": aggregate.entropy,
            "embedding": aggregate.embedding,
            "scores": aggregate.scores,
            "images": len(items),
            "views": sorted({item["view_type"] for item in items}),
            "correct": (
                true_taxon in TAXA and predicted_taxon == true_taxon
            ),
        })
    return output


def assign_challenge_partitions(rows: list[dict]) -> dict[str, str]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["group_key"]].append(row)

    by_expectation: dict[str, list[str]] = defaultdict(list)
    for group_key, members in grouped.items():
        expectations = {member["expectation"] for member in members}
        if len(expectations) != 1:
            raise RuntimeError(
                f"Challenge split group {group_key} has conflicting expectations"
            )
        expectation = next(iter(expectations))
        by_expectation[expectation].append(group_key)

    assignments: dict[str, str] = {}
    for expectation, group_keys in by_expectation.items():
        ordered = sorted(
            group_keys,
            key=lambda key: hashlib.sha256(
                f"{expectation}:{key}".encode("utf-8")
            ).hexdigest(),
        )
        if expectation == "review":
            for key in ordered:
                assignments[key] = "review"
            continue
        if len(ordered) == 1:
            assignments[ordered[0]] = "test"
            continue
        for index, key in enumerate(ordered):
            assignments[key] = "calibration" if index % 2 == 0 else "test"

    return assignments


def rejection_decision(row: dict, policy: dict) -> bool:
    return (
        row["confidence"] < policy["confidence_floor"]
        or row["margin"] < policy["margin_floor"]
        or row["ood_score"] > policy["ood_ceiling"]
    )


def independent_group_count(rows: list[dict]) -> int:
    return len({row["group_key"] for row in rows})


def group_balanced_rate(rows: list[dict], predicate) -> float | None:
    if not rows:
        return None
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["group_key"]].append(row)

    group_scores = []
    for members in grouped.values():
        group_scores.append(
            sum(1 for row in members if predicate(row)) / len(members)
        )
    return sum(group_scores) / len(group_scores)


def harmonic(a: float, b: float) -> float:
    if a <= 0 or b <= 0:
        return 0.0
    return 2 * a * b / (a + b)


def tune_policy(calibration_rows: list[dict]) -> tuple[dict, dict]:
    classify = [
        row for row in calibration_rows
        if row["expected_behavior"] == "classify"
    ]
    reject = [
        row for row in calibration_rows
        if row["expected_behavior"] == "reject"
    ]

    counts = {
        "classify_animals": len(classify),
        "reject_animals": len(reject),
        "classify_groups": independent_group_count(classify),
        "reject_groups": independent_group_count(reject),
    }
    if not classify or not reject:
        return {
            **DEFAULT_POLICY,
            "source": "fallback",
            "validated": False,
        }, {
            "reason": "Need both classify and reject calibration examples.",
            "counts": counts,
        }

    confidence_values = [round(value / 100, 3) for value in range(35, 91, 5)]
    margin_values = [round(value / 100, 3) for value in range(0, 41, 5)]
    ood_values = [round(value / 100, 3) for value in range(10, 61, 5)]

    best = None
    best_metrics = None
    for confidence_floor in confidence_values:
        for margin_floor in margin_values:
            for ood_ceiling in ood_values:
                policy = {
                    "confidence_floor": confidence_floor,
                    "margin_floor": margin_floor,
                    "ood_ceiling": ood_ceiling,
                    "evidence_quality_floor": DEFAULT_POLICY[
                        "evidence_quality_floor"
                    ],
                }
                classify_success = group_balanced_rate(
                    classify,
                    lambda row: (
                        not rejection_decision(row, policy)
                        and row["correct"]
                    ),
                ) or 0.0
                reject_success = group_balanced_rate(
                    reject,
                    lambda row: rejection_decision(row, policy),
                ) or 0.0
                score = harmonic(classify_success, reject_success)
                key = (
                    score,
                    min(classify_success, reject_success),
                    classify_success + reject_success,
                    -confidence_floor,
                    -margin_floor,
                    ood_ceiling,
                )
                if best is None or key > best:
                    best = key
                    best_metrics = {
                        "policy": policy,
                        "classify_success_rate": classify_success,
                        "reject_success_rate": reject_success,
                        "balanced_harmonic_score": score,
                    }

    assert best_metrics is not None
    policy = {
        **best_metrics["policy"],
        "source": "challenge_calibrated",
        "validated": (
            independent_group_count(classify) >= 8
            and independent_group_count(reject) >= 3
        ),
    }
    return policy, {
        **best_metrics,
        "counts": counts,
    }


def summarize(rows: list[dict], policy: dict) -> dict:
    classify = [row for row in rows if row["expected_behavior"] == "classify"]
    reject = [row for row in rows if row["expected_behavior"] == "reject"]
    review = [row for row in rows if row["expected_behavior"] == "review"]

    return {
        "counts": {
            "classify_animals": len(classify),
            "reject_animals": len(reject),
            "review_animals": len(review),
            "classify_groups": independent_group_count(classify),
            "reject_groups": independent_group_count(reject),
            "review_groups": independent_group_count(review),
        },
        "classify_success_rate": group_balanced_rate(
            classify,
            lambda row: (
                not rejection_decision(row, policy)
                and row["correct"]
            ),
        ),
        "classify_accept_rate": group_balanced_rate(
            classify,
            lambda row: not rejection_decision(row, policy),
        ),
        "classify_correct_if_accepted": (
            None
            if not [row for row in classify if not rejection_decision(row, policy)]
            else group_balanced_rate(
                [
                    row
                    for row in classify
                    if not rejection_decision(row, policy)
                ],
                lambda row: row["correct"],
            )
        ),
        "reject_success_rate": group_balanced_rate(
            reject,
            lambda row: rejection_decision(row, policy),
        ),
        "false_accept_rate": group_balanced_rate(
            reject,
            lambda row: not rejection_decision(row, policy),
        ),
        "review_rejection_rate": group_balanced_rate(
            review,
            lambda row: rejection_decision(row, policy),
        ),
    }


def main():
    args = parse_args()
    classifier_root = Path(args.classifier_dataset).resolve()
    challenge_root = Path(args.challenge_dataset).resolve()

    classifier_manifest = pd.read_csv(classifier_root / "manifest.csv")
    challenge_manifest = pd.read_csv(challenge_root / "manifest.csv")
    classifier_animals = set(classifier_manifest["animal_id"].astype(str))
    challenge_animals = set(challenge_manifest["animal_id"].astype(str))
    overlapping_animals = sorted(classifier_animals & challenge_animals)
    if overlapping_animals:
        raise RuntimeError(
            "Classifier and challenge snapshots must be animal-disjoint. "
            f"Found {len(overlapping_animals)} overlapping animal(s); "
            "remove dual-role animals from one frozen snapshot before rejection evaluation."
        )

    checkpoint = torch.load(
        args.checkpoint,
        map_location="cpu",
        weights_only=False,
    )
    config = checkpoint["config"]
    calibration = json.loads(
        Path(args.calibration_json).read_text(encoding="utf-8")
    )
    temperature = float(calibration.get("temperature", 1.0))

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    processor = AutoImageProcessor.from_pretrained(config["encoder"])
    model = SnakeSorterModel(
        encoder_name=config["encoder"],
        embedding_dim=int(config["embedding_dim"]),
        freeze_backbone=bool(config.get("freeze_backbone", True)),
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    collate = collate_for(processor)

    classifier_rows: list[dict] = []
    for split in ("validation", "test"):
        dataset = ManifestDataset(
            classifier_root / "manifest.csv",
            classifier_root / "media",
            split=split,
        )
        loader = DataLoader(
            dataset,
            batch_size=args.batch_size,
            shuffle=False,
            num_workers=args.num_workers,
            collate_fn=collate,
        )
        inferred = infer_images(model, loader, device)
        animals = aggregate_animals(inferred, temperature)
        for row in animals:
            row["origin"] = "classifier"
            row["partition"] = "calibration" if split == "validation" else "test"
            row["expected_behavior"] = "classify"
        classifier_rows.extend(animals)

    challenge_dataset = ManifestDataset(
        challenge_root / "manifest.csv",
        challenge_root / "media",
        split="challenge",
    )
    challenge_loader = DataLoader(
        challenge_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        collate_fn=collate,
    )
    challenge_rows = aggregate_animals(
        infer_images(model, challenge_loader, device),
        temperature,
    )
    challenge_partitions = assign_challenge_partitions(challenge_rows)
    for row in challenge_rows:
        row["origin"] = "challenge"
        row["partition"] = challenge_partitions[row["group_key"]]
        row["expected_behavior"] = row["expectation"]

    reference_matrix = load_reference_matrix(
        Path(args.reference_embeddings)
    )
    all_rows = classifier_rows + challenge_rows
    for row in all_rows:
        embedding = torch.tensor(row["embedding"], dtype=torch.float32)
        row["ood_score"] = nearest_similarity_ood(
            embedding,
            reference_matrix,
        )

    calibration_rows = [
        row
        for row in all_rows
        if row["partition"] == "calibration"
        and row["expected_behavior"] in {"classify", "reject"}
    ]
    test_rows = [
        row
        for row in all_rows
        if row["partition"] == "test"
        and row["expected_behavior"] in {"classify", "reject"}
    ]
    review_rows = [
        row
        for row in all_rows
        if row["expected_behavior"] == "review"
    ]

    policy, tuning = tune_policy(calibration_rows)
    policy["calibration_counts"] = tuning.get("counts", {})
    policy["test_counts"] = {
        "classify_animals": sum(
            row["expected_behavior"] == "classify"
            for row in test_rows
        ),
        "reject_animals": sum(
            row["expected_behavior"] == "reject"
            for row in test_rows
        ),
        "classify_groups": independent_group_count([
            row for row in test_rows
            if row["expected_behavior"] == "classify"
        ]),
        "reject_groups": independent_group_count([
            row for row in test_rows
            if row["expected_behavior"] == "reject"
        ]),
    }

    result = {
        "policy": policy,
        "tuning": tuning,
        "calibration": summarize(calibration_rows, policy),
        "test": summarize(test_rows + review_rows, policy),
        "animals": [
            {
                key: value
                for key, value in row.items()
                if key != "embedding"
            }
            for row in sorted(
                all_rows,
                key=lambda row: (
                    row["partition"],
                    row["expected_behavior"],
                    row["animal_id"],
                ),
            )
        ],
        "notes": {
            "classifier_validation_role": "threshold calibration only",
            "classifier_test_role": "untouched rejection evaluation",
            "challenge_partitioning": "deterministic by related group within expectation",
            "review_examples_tune_thresholds": False,
            "policy_validated_rule": ">=8 independent classify groups and >=3 independent reject calibration groups",
            "rate_weighting": "each related group contributes equal weight",
        },
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")

    policy_output = Path(args.policy_output)
    policy_output.parent.mkdir(parents=True, exist_ok=True)
    policy_output.write_text(json.dumps(policy, indent=2), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "policy": policy,
        "calibration": result["calibration"],
        "test": result["test"],
        "output": str(output),
        "policy_output": str(policy_output),
    }, indent=2))


if __name__ == "__main__":
    main()
