from __future__ import annotations

import argparse
import json
from collections import defaultdict

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
    return parser.parse_args()


@torch.no_grad()
def collect(model, loader, device):
    logits, truth, stages, colors = [], [], [], []
    for batch in loader:
        out = model(batch["pixel_values"].to(device))
        logits.append(out["taxon_logits"].cpu())
        truth.extend(batch["taxon"].tolist())
        stages.extend(batch["stage"].tolist())
        colors.extend(batch["color"].tolist())
    return torch.cat(logits), truth, stages, colors


def subgroup_metrics(truth, pred, group, names):
    result = {}
    for idx, name in enumerate(names):
        positions = [i for i, value in enumerate(group) if value == idx]
        if not positions:
            continue
        t = [truth[i] for i in positions]
        p = [pred[i] for i in positions]
        result[name] = {
            "samples": len(positions),
            "animals_not_images_note": "sample count is images; primary benchmark remains unseen individuals",
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
        collate_fn=build_collate(processor),
    )


def main():
    args = parse_args()
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    config = checkpoint["config"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    processor = AutoImageProcessor.from_pretrained(config["encoder"])
    val_loader = build_loader(args.manifest, args.media_root, "validation", processor, args.batch_size)
    test_loader = build_loader(args.manifest, args.media_root, "test", processor, args.batch_size)

    model = SnakeSorterModel(
        encoder_name=config["encoder"],
        embedding_dim=config["embedding_dim"],
        freeze_backbone=config["freeze_backbone"],
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    val_logits, val_truth, _, _ = collect(model, val_loader, device)
    scaler = TemperatureScaler()
    temperature = scaler.fit(val_logits, torch.tensor(val_truth))

    test_logits, truth, stages, colors = collect(model, test_loader, device)
    calibrated_logits = test_logits / temperature
    probabilities = calibrated_logits.softmax(-1)
    pred = probabilities.argmax(1).tolist()

    metrics = {
        "accuracy": accuracy_score(truth, pred),
        "balanced_accuracy": balanced_accuracy_score(truth, pred),
        "macro_f1": f1_score(truth, pred, average="macro", zero_division=0),
        "temperature": temperature,
        "expected_calibration_error": expected_calibration_error(
            probabilities,
            torch.tensor(truth),
        ),
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
        "by_stage": subgroup_metrics(truth, pred, stages, STAGES),
        "by_color": subgroup_metrics(truth, pred, colors, COLORS),
    }
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
