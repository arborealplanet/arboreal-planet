from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run a reproducible Snake Sorter training experiment from one prepared snapshot."
    )
    parser.add_argument("--dataset", required=True, help="Directory created by prepare_snapshot.py")
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


def run(command: list[str]) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, check=True)


def main():
    args = parse_args()
    root = Path(__file__).resolve().parent
    dataset = Path(args.dataset).resolve()
    output = Path(args.output).resolve()
    manifest = dataset / "manifest.csv"
    media_root = dataset / "media"
    snapshot_metadata = dataset / "snapshot.json"

    for required in (manifest, media_root, snapshot_metadata):
        if not required.exists():
            raise RuntimeError(
                f"Prepared dataset is incomplete: missing {required}. "
                "Run prepare_snapshot.py first."
            )

    output.mkdir(parents=True, exist_ok=True)
    train_dir = output / "training"
    metrics_path = output / "test-metrics.json"
    calibration_path = output / "calibration.json"
    embeddings_path = output / "reference-embeddings-train.jsonl"
    experiment_path = output / "experiment.json"

    snapshot = json.loads(snapshot_metadata.read_text(encoding="utf-8"))
    experiment = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "snapshot": snapshot.get("snapshot", {}),
        "encoder": args.encoder,
        "embedding_dim": args.embedding_dim,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.lr,
        "weight_decay": args.weight_decay,
        "seed": args.seed,
        "unfreeze_backbone": args.unfreeze_backbone,
        "evaluation_policy": {
            "validation": "unseen individuals, predicted stage",
            "test": "untouched unseen individuals, predicted stage",
            "retrieval_embeddings": "train split only",
        },
    }
    experiment_path.write_text(json.dumps(experiment, indent=2), encoding="utf-8")

    train_command = [
        sys.executable,
        str(root / "train.py"),
        "--manifest", str(manifest),
        "--media-root", str(media_root),
        "--output", str(train_dir),
        "--encoder", args.encoder,
        "--embedding-dim", str(args.embedding_dim),
        "--epochs", str(args.epochs),
        "--batch-size", str(args.batch_size),
        "--lr", str(args.lr),
        "--weight-decay", str(args.weight_decay),
        "--seed", str(args.seed),
        "--num-workers", str(args.num_workers),
    ]
    if args.unfreeze_backbone:
        train_command.append("--unfreeze-backbone")
    run(train_command)

    checkpoint = train_dir / "best.pt"
    if not checkpoint.exists():
        raise RuntimeError("Training completed without a best.pt checkpoint")

    run([
        sys.executable,
        str(root / "evaluate.py"),
        "--manifest", str(manifest),
        "--media-root", str(media_root),
        "--checkpoint", str(checkpoint),
        "--batch-size", str(args.batch_size),
        "--output", str(metrics_path),
        "--calibration-output", str(calibration_path),
    ])

    run([
        sys.executable,
        str(root / "export_embeddings.py"),
        "--manifest", str(manifest),
        "--media-root", str(media_root),
        "--checkpoint", str(checkpoint),
        "--split", "train",
        "--output", str(embeddings_path),
        "--batch-size", str(args.batch_size),
    ])

    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    calibration = json.loads(calibration_path.read_text(encoding="utf-8"))
    experiment.update({
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "checkpoint": str(checkpoint),
        "metrics": metrics,
        "calibration": calibration,
        "reference_embeddings": str(embeddings_path),
    })
    experiment_path.write_text(json.dumps(experiment, indent=2), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "output": str(output),
        "checkpoint": str(checkpoint),
        "metrics": str(metrics_path),
        "calibration": str(calibration_path),
        "reference_embeddings": str(embeddings_path),
    }, indent=2))


if __name__ == "__main__":
    main()
