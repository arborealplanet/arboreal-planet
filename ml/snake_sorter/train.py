from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from sklearn.metrics import f1_score
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import transforms
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
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--num-workers", type=int, default=4)
    parser.add_argument("--unfreeze-backbone", action="store_true")
    return parser.parse_args()


def taxon_weights_by_individual(dataset: SnakeSorterDataset) -> torch.Tensor:
    animals = dataset.frame[["animal_id", "taxon"]].drop_duplicates()
    counts = animals["taxon"].value_counts()
    total = float(len(animals))
    weights = []
    for taxon in TAXA:
        count = float(counts.get(taxon, 0))
        weights.append(0.0 if count <= 0 else total / (len(TAXA) * count))
    tensor = torch.tensor(weights, dtype=torch.float32)
    positive = tensor[tensor > 0]
    if len(positive):
        tensor = tensor / positive.mean()
    return tensor


def individual_balanced_sampler(
    dataset: SnakeSorterDataset,
    seed: int,
) -> WeightedRandomSampler:
    image_counts = dataset.frame["animal_id"].value_counts()
    weights = [
        1.0 / float(image_counts[str(animal_id)])
        for animal_id in dataset.frame["animal_id"]
    ]
    generator = torch.Generator()
    generator.manual_seed(seed)
    return WeightedRandomSampler(
        weights=torch.tensor(weights, dtype=torch.double),
        num_samples=len(dataset),
        replacement=True,
        generator=generator,
    )


def build_train_transform():
    # Preserve diagnostic morphology and red/yellow phase while teaching the
    # encoder normal handheld-camera variation.
    return transforms.Compose([
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomApply([
            transforms.RandomAffine(
                degrees=8,
                translate=(0.04, 0.04),
                scale=(0.94, 1.06),
                fill=0,
            )
        ], p=0.65),
        transforms.RandomApply([
            transforms.ColorJitter(
                brightness=0.10,
                contrast=0.10,
                saturation=0.04,
                hue=0.0,
            )
        ], p=0.45),
    ])


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

    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    processor = AutoImageProcessor.from_pretrained(args.encoder)
    collate = build_collate(processor)

    train_data = SnakeSorterDataset(
        args.manifest,
        args.media_root,
        "train",
        image_transform=build_train_transform(),
    )
    val_data = SnakeSorterDataset(args.manifest, args.media_root, "validation")
    train_loader = DataLoader(
        train_data,
        batch_size=args.batch_size,
        sampler=individual_balanced_sampler(train_data, args.seed),
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
        collate_fn=collate,
    )
    val_loader = DataLoader(
        val_data,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
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
    taxon_ce = nn.CrossEntropyLoss(weight=taxon_weights_by_individual(train_data).to(device))
    auxiliary_ce = nn.CrossEntropyLoss()
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    best_f1 = -1.0

    config = {
        "encoder": args.encoder,
        "embedding_dim": args.embedding_dim,
        "taxa": TAXA,
        "stages": STAGES,
        "colors": COLORS,
        "freeze_backbone": not args.unfreeze_backbone,
        "seed": args.seed,
        "taxon_weighting": "inverse distinct-animal frequency",
        "sampling": {
            "strategy": "inverse images-per-individual",
            "replacement": True,
            "samples_per_epoch": len(train_data),
        },
        "augmentation": {
            "horizontal_flip_probability": 0.5,
            "random_affine_probability": 0.65,
            "rotation_degrees": 8,
            "translation_fraction": 0.04,
            "scale_range": [0.94, 1.06],
            "color_jitter_probability": 0.45,
            "brightness": 0.10,
            "contrast": 0.10,
            "saturation": 0.04,
            "hue": 0.0,
        },
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
                out = model(pixel_values, stage_targets=stage)
                taxon_loss = taxon_ce(out["taxon_logits"], taxon)
                stage_loss = auxiliary_ce(out["stage_logits"], stage)
                color_loss = auxiliary_ce(out["color_logits"], color)
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
