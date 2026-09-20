from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from sklearn.metrics import f1_score
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader
from tqdm import tqdm
from transformers import AutoImageProcessor

from dataset import COLORS, STAGES, TAXA, SnakeSorterDataset
from model import SnakeSorterModel


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--media-root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--encoder",
        default="facebook/dinov3-vitb16-pretrain-lvd1689m",
    )
    parser.add_argument("--embedding-dim", type=int, default=256)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--weight-decay", type=float, default=0.02)
    parser.add_argument("--unfreeze-backbone", action="store_true")
    return parser.parse_args()


def build_collate(processor):
    def collate(items):
        images = [item["image"] for item in items]
        encoded = processor(images=images, return_tensors="pt")
        return {
            "pixel_values": encoded["pixel_values"],
            "taxon": torch.tensor([item["taxon"] for item in items]),
            "stage": torch.tensor([item["stage"] for item in items]),
            "color": torch.tensor([item["color"] for item in items]),
        }
    return collate


@torch.no_grad()
def validate(model, loader, device):
    model.eval()
    losses = []
    truth = []
    pred = []
    ce = nn.CrossEntropyLoss()
    for batch in loader:
        pixel_values = batch["pixel_values"].to(device)
        taxon = batch["taxon"].to(device)
        stage = batch["stage"].to(device)
        color = batch["color"].to(device)
        out = model(pixel_values)
        loss = (
            ce(out["taxon_logits"], taxon)
            + 0.25 * ce(out["stage_logits"], stage)
            + 0.20 * ce(out["color_logits"], color)
        )
        losses.append(float(loss.item()))
        truth.extend(taxon.cpu().tolist())
        pred.extend(out["taxon_logits"].argmax(1).cpu().tolist())

    return {
        "loss": sum(losses) / max(1, len(losses)),
        "macro_f1": f1_score(truth, pred, average="macro", zero_division=0),
        "accuracy": sum(a == b for a, b in zip(truth, pred)) / max(1, len(truth)),
    }


def main():
    args = parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    processor = AutoImageProcessor.from_pretrained(args.encoder)
    collate = build_collate(processor)

    train_data = SnakeSorterDataset(args.manifest, args.media_root, "train")
    val_data = SnakeSorterDataset(args.manifest, args.media_root, "validation")
    train_loader = DataLoader(
        train_data,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=4,
        pin_memory=torch.cuda.is_available(),
        collate_fn=collate,
    )
    val_loader = DataLoader(
        val_data,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=4,
        pin_memory=torch.cuda.is_available(),
        collate_fn=collate,
    )

    model = SnakeSorterModel(
        encoder_name=args.encoder,
        embedding_dim=args.embedding_dim,
        freeze_backbone=not args.unfreeze_backbone,
    ).to(device)

    optimizer = AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=args.lr,
        weight_decay=args.weight_decay,
    )
    ce = nn.CrossEntropyLoss()
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    best_f1 = -1.0

    config = {
        "encoder": args.encoder,
        "embedding_dim": args.embedding_dim,
        "taxa": TAXA,
        "stages": STAGES,
        "colors": COLORS,
        "freeze_backbone": not args.unfreeze_backbone,
    }
    (output / "config.json").write_text(json.dumps(config, indent=2))

    for epoch in range(1, args.epochs + 1):
        model.train()
        running = 0.0
        progress = tqdm(train_loader, desc=f"epoch {epoch}/{args.epochs}")
        for batch in progress:
            pixel_values = batch["pixel_values"].to(device, non_blocking=True)
            taxon = batch["taxon"].to(device, non_blocking=True)
            stage = batch["stage"].to(device, non_blocking=True)
            color = batch["color"].to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(
                device_type=device.type,
                dtype=torch.bfloat16 if device.type == "cuda" else torch.float32,
                enabled=device.type == "cuda",
            ):
                out = model(pixel_values)
                taxon_loss = ce(out["taxon_logits"], taxon)
                stage_loss = ce(out["stage_logits"], stage)
                color_loss = ce(out["color_logits"], color)
                loss = taxon_loss + 0.25 * stage_loss + 0.20 * color_loss

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            running += float(loss.item())
            progress.set_postfix(loss=f"{running / max(1, progress.n):.4f}")

        metrics = validate(model, val_loader, device)
        print(json.dumps({"epoch": epoch, **metrics}))

        checkpoint = {
            "state_dict": model.state_dict(),
            "config": config,
            "epoch": epoch,
            "validation": metrics,
        }
        torch.save(checkpoint, output / "last.pt")
        if metrics["macro_f1"] > best_f1:
            best_f1 = metrics["macro_f1"]
            torch.save(checkpoint, output / "best.pt")


if __name__ == "__main__":
    main()
