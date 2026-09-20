from __future__ import annotations

import argparse
import csv
import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image


CORE_VIEWS = {"full_body", "head", "dorsal"}
LATERAL_VIEWS = {"left_lateral", "right_lateral"}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Audit a prepared Snake Sorter dataset before training."
    )
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output")
    parser.add_argument(
        "--near-duplicate-distance",
        type=int,
        default=5,
        help="64-bit dHash Hamming distance used for possible near-duplicate warnings.",
    )
    return parser.parse_args()


def dhash(image: Image.Image) -> int:
    gray = image.convert("L").resize((9, 8))
    pixels = np.asarray(gray, dtype=np.int16)
    difference = pixels[:, 1:] > pixels[:, :-1]
    value = 0
    for bit in difference.flatten():
        value = (value << 1) | int(bit)
    return value


def hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def sharpness_score(image: Image.Image) -> float:
    gray = np.asarray(image.convert("L").resize((256, 256)), dtype=np.float32)
    gx = np.abs(np.diff(gray, axis=1)).mean()
    gy = np.abs(np.diff(gray, axis=0)).mean()
    return float((gx + gy) / 2.0)


def main():
    args = parse_args()
    dataset = Path(args.dataset).resolve()
    manifest = dataset / "manifest.csv"
    media_root = dataset / "media"
    if not manifest.exists() or not media_root.exists():
        raise RuntimeError("Dataset must be prepared with prepare_snapshot.py first")

    with manifest.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise RuntimeError("Manifest is empty")

    critical: list[dict] = []
    warnings: list[dict] = []
    info: list[dict] = []

    image_records = []
    animal_rows: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        animal_rows[row["animal_id"]].append(row)
        path = media_root / row["storage_path"]
        if not path.exists():
            critical.append({
                "type": "missing_file",
                "media_id": row["media_id"],
                "path": str(path),
            })
            continue
        try:
            with Image.open(path) as source:
                image = source.convert("RGB")
                width, height = image.size
                image_hash = dhash(image)
                sharpness = sharpness_score(image)
        except Exception as exc:
            critical.append({
                "type": "decode_failure",
                "media_id": row["media_id"],
                "path": str(path),
                "detail": str(exc),
            })
            continue

        if max(width, height) < 512:
            warnings.append({
                "type": "low_resolution",
                "media_id": row["media_id"],
                "animal_id": row["animal_id"],
                "dimensions": [width, height],
            })
        if sharpness < 5.0:
            warnings.append({
                "type": "low_sharpness",
                "media_id": row["media_id"],
                "animal_id": row["animal_id"],
                "score": sharpness,
            })

        image_records.append({
            "media_id": row["media_id"],
            "animal_id": row["animal_id"],
            "split": row["dataset_split"],
            "taxon": row["taxon"],
            "view_type": row.get("view_type") or "unknown",
            "dhash": image_hash,
            "dimensions": [width, height],
            "sharpness": sharpness,
        })

    # Cross-animal near duplicates are especially dangerous when they cross
    # train/validation/test, because they can create hidden leakage even when
    # the owner records use different animal IDs.
    for i, left in enumerate(image_records):
        for right in image_records[i + 1:]:
            if left["animal_id"] == right["animal_id"]:
                continue
            distance = hamming(left["dhash"], right["dhash"])
            if distance > args.near_duplicate_distance:
                continue
            issue = {
                "type": "possible_cross_animal_near_duplicate",
                "distance": distance,
                "left": {
                    "media_id": left["media_id"],
                    "animal_id": left["animal_id"],
                    "split": left["split"],
                },
                "right": {
                    "media_id": right["media_id"],
                    "animal_id": right["animal_id"],
                    "split": right["split"],
                },
            }
            if left["split"] != right["split"]:
                critical.append({
                    **issue,
                    "type": "possible_cross_split_near_duplicate",
                })
            else:
                warnings.append(issue)

    images_per_animal = [len(items) for items in animal_rows.values()]
    median_images = statistics.median(images_per_animal)
    high_image_threshold = max(12, median_images * 4)
    for animal_id, items in animal_rows.items():
        if len(items) > high_image_threshold:
            warnings.append({
                "type": "image_count_imbalance",
                "animal_id": animal_id,
                "images": len(items),
                "median_images_per_animal": median_images,
            })

        accepted_views = {row.get("view_type") or "unknown" for row in items}
        missing = sorted(CORE_VIEWS - accepted_views)
        if not (accepted_views & LATERAL_VIEWS):
            missing.append("lateral")
        if missing:
            warnings.append({
                "type": "missing_core_views",
                "animal_id": animal_id,
                "missing": missing,
            })

    split_counts = Counter(row["dataset_split"] for row in rows)
    taxon_animals: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        taxon_animals[row["taxon"]].add(row["animal_id"])

    info.extend([
        {
            "type": "summary",
            "animals": len(animal_rows),
            "images": len(rows),
            "split_image_counts": dict(split_counts),
            "distinct_animals_by_taxon": {
                taxon: len(ids) for taxon, ids in sorted(taxon_animals.items())
            },
            "median_images_per_animal": median_images,
        }
    ])

    result = {
        "ok": len(critical) == 0,
        "critical_count": len(critical),
        "warning_count": len(warnings),
        "critical": critical,
        "warnings": warnings,
        "info": info,
        "policy": {
            "near_duplicate_dhash_distance": args.near_duplicate_distance,
            "critical_near_duplicate_rule": "different animal IDs and different dataset splits",
            "quality_findings_are_warnings_only": True,
        },
    }

    rendered = json.dumps(result, indent=2)
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
    print(rendered)

    if critical:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
