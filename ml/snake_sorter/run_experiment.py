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
    parser.add_argument("--near-duplicate-distance", type=int, default=5)
    parser.add_argument(
        "--challenge-dataset",
        help="Optional prepared challenge snapshot directory.",
    )
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
    error_review_path = output / "error-review.json"
    embeddings_path = output / "reference-embeddings-train.jsonl"
    audit_path = output / "dataset-audit.json"
    rejection_eval_path = output / "rejection-evaluation.json"
    rejection_policy_path = output / "rejection-policy.json"
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
        "dataset_audit": {
            "near_duplicate_distance": args.near_duplicate_distance,
            "cross_split_near_duplicates_are_fatal": True,
            "quality_findings_are_warnings": True,
        },
        "evaluation_policy": {
            "validation": "unseen individuals, predicted stage",
            "test": "untouched unseen individuals, predicted stage",
            "retrieval_embeddings": "train split only",
            "challenge_dataset": (
                str(Path(args.challenge_dataset).resolve())
                if args.challenge_dataset
                else None
            ),
        },
    }
    experiment_path.write_text(json.dumps(experiment, indent=2), encoding="utf-8")

    run([
        sys.executable,
        str(root / "audit_snapshot.py"),
        "--dataset", str(dataset),
        "--output", str(audit_path),
        "--near-duplicate-distance", str(args.near_duplicate_distance),
    ])

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
        "--error-review-output", str(error_review_path),
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

    if args.challenge_dataset:
        challenge_dataset = Path(args.challenge_dataset).resolve()
        for required in (
            challenge_dataset / "manifest.csv",
            challenge_dataset / "media",
            challenge_dataset / "snapshot.json",
        ):
            if not required.exists():
                raise RuntimeError(
                    f"Prepared challenge dataset is incomplete: missing {required}"
                )

        run([
            sys.executable,
            str(root / "evaluate_rejection.py"),
            "--classifier-dataset", str(dataset),
            "--challenge-dataset", str(challenge_dataset),
            "--checkpoint", str(checkpoint),
            "--reference-embeddings", str(embeddings_path),
            "--calibration-json", str(calibration_path),
            "--output", str(rejection_eval_path),
            "--policy-output", str(rejection_policy_path),
            "--batch-size", str(args.batch_size),
            "--num-workers", str(args.num_workers),
        ])

    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    calibration = json.loads(calibration_path.read_text(encoding="utf-8"))
    rejection_evaluation = (
        json.loads(rejection_eval_path.read_text(encoding="utf-8"))
        if rejection_eval_path.exists()
        else None
    )
    rejection_policy = (
        json.loads(rejection_policy_path.read_text(encoding="utf-8"))
        if rejection_policy_path.exists()
        else None
    )

    experiment.update({
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "checkpoint": str(checkpoint),
        "dataset_audit": json.loads(audit_path.read_text(encoding="utf-8")),
        "metrics": metrics,
        "calibration": calibration,
        "error_review": json.loads(error_review_path.read_text(encoding="utf-8")),
        "reference_embeddings": str(embeddings_path),
        "rejection_evaluation": rejection_evaluation,
        "rejection_policy": rejection_policy,
    })
    experiment_path.write_text(json.dumps(experiment, indent=2), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "output": str(output),
        "checkpoint": str(checkpoint),
        "dataset_audit": str(audit_path),
        "metrics": str(metrics_path),
        "calibration": str(calibration_path),
        "error_review": str(error_review_path),
        "reference_embeddings": str(embeddings_path),
        "rejection_evaluation": (
            str(rejection_eval_path) if rejection_eval_path.exists() else None
        ),
        "rejection_policy": (
            str(rejection_policy_path) if rejection_policy_path.exists() else None
        ),
    }, indent=2))


if __name__ == "__main__":
    main()
