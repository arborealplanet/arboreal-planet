from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from transformers import AutoImageProcessor

from dataset import SnakeSorterDataset, TAXA
from model import SnakeSorterModel
from train import build_collate


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--media-root", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--split", default="train", choices=["train", "validation", "test"])
    parser.add_argument("--output", required=True)
    parser.add_argument("--batch-size", type=int, default=16)
    return parser.parse_args()


def main():
    args = parse_args()
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    config = checkpoint["config"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    processor = AutoImageProcessor.from_pretrained(config["encoder"])
    data = SnakeSorterDataset(args.manifest, args.media_root, args.split)

    def collate(items):
        batch = build_collate(processor)(items)
        batch["animal_id"] = [item["animal_id"] for item in items]
        batch["media_id"] = [item["media_id"] for item in items]
        batch["path"] = [item["path"] for item in items]
        batch["view_type"] = [item["view_type"] for item in items]
        batch["taxon_name"] = [item["taxon_name"] for item in items]
        batch["locality"] = [item["locality"] for item in items]
        batch["stage_name"] = [item["stage_name"] for item in items]
        batch["color_name"] = [item["color_name"] for item in items]
        return batch

    loader = DataLoader(
        data,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=4,
        collate_fn=collate,
    )

    model = SnakeSorterModel(
        encoder_name=config["encoder"],
        embedding_dim=config["embedding_dim"],
        freeze_backbone=config["freeze_backbone"],
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    with output.open("w", encoding="utf-8") as handle:
        with torch.no_grad():
            for batch in loader:
                out = model(batch["pixel_values"].to(device))
                probabilities = out["taxon_logits"].softmax(-1).cpu()
                embeddings = out["embedding"].cpu()
                for i in range(len(batch["animal_id"])):
                    handle.write(json.dumps({
                        "animal_id": batch["animal_id"][i],
                        "media_id": batch["media_id"][i] or None,
                        "path": batch["path"][i],
                        "view_type": batch["view_type"][i],
                        "taxon": batch["taxon_name"][i],
                        "locality": batch["locality"][i],
                        "life_stage": batch["stage_name"][i],
                        "neonate_color": batch["color_name"][i],
                        "embedding": embeddings[i].tolist(),
                        "taxon_scores": {
                            taxon: float(probabilities[i, j].item())
                            for j, taxon in enumerate(TAXA)
                        },
                    }) + "\n")


if __name__ == "__main__":
    main()
