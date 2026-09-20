from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import torch
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from torch.utils.data import DataLoader
from transformers import AutoImageProcessor

from calibration import TemperatureScaler, expected_calibration_error
from dataset import COLORS, STAGES, TAXA, SnakeSorterDataset
from model import SnakeSorterModel
from train import build_collate


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--media-root", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--output")
    parser.add_argument("--calibration-output")
    return parser.parse_args()


def metadata_collate(processor):
    base = build_collate(processor)

    def collate(items):
        batch = base(items)
        batch["animal_id"] = [item["animal_id"] for item in items]
        batch["view_type"] = [item["view_type"] for item in items]
        return batch

    return collate


@torch.no_grad()
def collect(model, loader, device):
    logits: list[torch.Tensor] = []
    truth: list[int] = []
    stages: list[int] = []
    colors: list[int] = []
    animal_ids: list[str] = []
    views: list[str] = []

    for batch in loader:
        out = model(batch["pixel_values"].to(device))
        logits.append(out["taxon_logits"].cpu())
        truth.extend(batch["taxon"].tolist())
        stages.extend(batch["stage"].tolist())
        colors.extend(batch["color"].tolist())
        animal_ids.extend(batch["animal_id"])
        views.extend(batch["view_type"])

    return torch.cat(logits), truth, stages, colors, animal_ids, views


def aggregate_logits_by_animal(
    logits: torch.Tensor,
    truth: list[int],
    animal_ids: list[str],
) -> tuple[torch.Tensor, list[int], list[str]]:
    positions: dict[str, list[int]] = defaultdict(list)
    for index, animal_id in enumerate(animal_ids):
        positions[animal_id].append(index)

    aggregated: list[torch.Tensor] = []
    labels: list[int] = []
    ordered_ids: list[str] = []

    for animal_id, indices in positions.items():
        label_set = {truth[index] for index in indices}
        if len(label_set) != 1:
            raise RuntimeError(
                f"Animal {animal_id} has conflicting taxon labels inside one split"
            )
        aggregated.append(logits[indices].mean(dim=0))
        labels.append(next(iter(label_set)))
        ordered_ids.append(animal_id)

    return torch.stack(aggregated), labels, ordered_ids


def classification_metrics(truth: list[int], pred: list[int]) -> dict:
    return {
        "accuracy": accuracy_score(truth, pred),
        "balanced_accuracy": balanced_accuracy_score(truth, pred),
        "macro_f1": f1_score(truth, pred, average="macro", zero_division=0),
        "classification_report": classification_report(
            truth,
            pred,
            labels=list(range(len(TAXA))),
            target_names=TAXA,
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": confusion_matrix(
            truth,
            pred,
            labels=list(range(len(TAXA))),
        ).tolist(),
    }


def subgroup_metrics(truth, pred, group, names):
    result = {}
    for idx, name in enumerate(names):
        positions = [i for i, value in enumerate(group) if value == idx]
        if not positions:
            continue
        t = [truth[i] for i in positions]
        p = [pred[i] for i in positions]
        result[name] = {
            "images": len(positions),
            "accuracy": accuracy_score(t, p),
            "macro_f1": f1_score(t, p, average="macro", zero_division=0),
        }
    return result


def view_metrics(truth, pred, views):
    result = {}
    for view in sorted(set(views)):
        positions = [i for i, value in enumerate(views) if value == view]
        if not positions:
            continue
        t = [truth[i] for i in positions]
        p = [pred[i] for i in positions]
        result[view] = {
            "images": len(positions),
            "accuracy": accuracy_score(t, p),
            "macro_f1": f1_score(t, p, average="macro", zero_division=0),
        }
    return result


def build_loader(manifest, media_root, split, processor, batch_size):
    data = SnakeSorterDataset(manifest, media_root, split)
    return DataLoader(
        data,
        batch_size=batch_size,
        shuffle=False,
        num_workers=4,
        collate_fn=metadata_collate(processor),
    )


def main():
    args = parse_args()
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    config = checkpoint["config"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    processor = AutoImageProcessor.from_pretrained(config["encoder"])
    val_loader = build_loader(
        args.manifest, args.media_root, "validation", processor, args.batch_size
    )
    test_loader = build_loader(
        args.manifest, args.media_root, "test", processor, args.batch_size
    )

    model = SnakeSorterModel(
        encoder_name=config["encoder"],
        embedding_dim=config["embedding_dim"],
        freeze_backbone=config["freeze_backbone"],
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    (
        val_logits,
        val_truth,
        _,
        _,
        val_animals,
        _,
    ) = collect(model, val_loader, device)
    val_animal_logits, val_animal_truth, _ = aggregate_logits_by_animal(
        val_logits, val_truth, val_animals
    )

    # Fit calibration on unseen validation individuals, not individual images.
    scaler = TemperatureScaler()
    temperature = scaler.fit(
        val_animal_logits,
        torch.tensor(val_animal_truth),
    )

    (
        test_logits,
        truth,
        stages,
        colors,
        test_animals,
        views,
    ) = collect(model, test_loader, device)

    calibrated_image_probs = (test_logits / temperature).softmax(-1)
    image_pred = calibrated_image_probs.argmax(1).tolist()

    test_animal_logits, test_animal_truth, ordered_animal_ids = aggregate_logits_by_animal(
        test_logits, truth, test_animals
    )
    animal_probabilities = (test_animal_logits / temperature).softmax(-1)
    animal_pred = animal_probabilities.argmax(1).tolist()

    individual = classification_metrics(test_animal_truth, animal_pred)
    image_level = classification_metrics(truth, image_pred)

    metrics = {
        # Primary release-gating scores are per held-out individual.
        "accuracy": individual["accuracy"],
        "balanced_accuracy": individual["balanced_accuracy"],
        "macro_f1": individual["macro_f1"],
        "individual_level": {
            **individual,
            "animals": len(ordered_animal_ids),
            "animal_ids": ordered_animal_ids,
            "expected_calibration_error": expected_calibration_error(
                animal_probabilities,
                torch.tensor(test_animal_truth),
            ),
        },
        "image_level": {
            **image_level,
            "images": len(truth),
            "expected_calibration_error": expected_calibration_error(
                calibrated_image_probs,
                torch.tensor(truth),
            ),
        },
        "temperature": temperature,
        "expected_calibration_error": expected_calibration_error(
            animal_probabilities,
            torch.tensor(test_animal_truth),
        ),
        "classification_report": individual["classification_report"],
        "confusion_matrix": individual["confusion_matrix"],
        "by_stage": subgroup_metrics(truth, image_pred, stages, STAGES),
        "by_color": subgroup_metrics(truth, image_pred, colors, COLORS),
        "by_view": view_metrics(truth, image_pred, views),
        "notes": {
            "primary_metric_unit": "held-out individual animal",
            "calibration_unit": "held-out individual animal",
            "subgroup_unit": "images from held-out individuals",
        },
    }

    rendered = json.dumps(metrics, indent=2)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
    if args.calibration_output:
        calibration_path = Path(args.calibration_output)
        calibration_path.parent.mkdir(parents=True, exist_ok=True)
        calibration_path.write_text(
            json.dumps(
                {
                    "temperature": temperature,
                    "expected_calibration_error": metrics[
                        "expected_calibration_error"
                    ],
                    "calibration_unit": "held-out individual animal",
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    print(rendered)


if __name__ == "__main__":
    main()
