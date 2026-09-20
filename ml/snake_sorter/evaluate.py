from __future__ import annotations

import argparse
import json

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

from dataset import TAXA, SnakeSorterDataset
from model import SnakeSorterModel
from train import build_collate


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--media-root", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--batch-size", type=int, default=16)
    return parser.parse_args()


def main():
    args = parse_args()
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    config = checkpoint["config"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    processor = AutoImageProcessor.from_pretrained(config["encoder"])
    test_data = SnakeSorterDataset(args.manifest, args.media_root, "test")
    loader = DataLoader(
        test_data,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=4,
        collate_fn=build_collate(processor),
    )

    model = SnakeSorterModel(
        encoder_name=config["encoder"],
        embedding_dim=config["embedding_dim"],
        freeze_backbone=config["freeze_backbone"],
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    truth = []
    pred = []
    with torch.no_grad():
        for batch in loader:
            out = model(batch["pixel_values"].to(device))
            truth.extend(batch["taxon"].tolist())
            pred.extend(out["taxon_logits"].argmax(1).cpu().tolist())

    metrics = {
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
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
