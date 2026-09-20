from __future__ import annotations

import argparse
import hashlib
import json
import os
import tarfile
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests
from tusclient import client as tus_client


BUCKET = "snake-sorter-models"
CHUNK_SIZE = 6 * 1024 * 1024


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--name", default="Snake Sorter DINOv3")
    parser.add_argument("--version", required=True)
    parser.add_argument("--snapshot-id", required=True)
    parser.add_argument("--metrics-json")
    parser.add_argument("--calibration-json")
    parser.add_argument("--reference-embeddings")
    parser.add_argument("--error-review-json")
    parser.add_argument("--rules-version", default="rules-v1")
    parser.add_argument("--notes", default="")
    parser.add_argument("--status", choices=["evaluating", "candidate"], default="candidate")
    return parser.parse_args()


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def api_headers(key: str, token: str, content_type: bool = False) -> dict[str, str]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if content_type:
        headers["Content-Type"] = "application/json"
    return headers


def load_json(path: str | None) -> dict:
    if not path:
        return {}
    return json.loads(Path(path).read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def storage_hostname(supabase_url: str) -> str:
    parsed = urlparse(supabase_url)
    project = parsed.hostname.split(".")[0] if parsed.hostname else ""
    if not project:
        raise RuntimeError("Could not derive Supabase project ref")
    return f"https://{project}.storage.supabase.co"


def build_bundle(
    checkpoint: Path,
    metrics_path: str | None,
    calibration_path: str | None,
    embeddings_path: str | None,
    error_review_path: str | None,
    metadata: dict,
) -> Path:
    temp = Path(tempfile.mkdtemp(prefix="snake-sorter-model-"))
    bundle = temp / "snake-sorter-model.tar.gz"
    metadata_path = temp / "release.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    with tarfile.open(bundle, "w:gz") as archive:
        archive.add(checkpoint, arcname="checkpoint.pt")
        archive.add(metadata_path, arcname="release.json")
        if metrics_path:
            archive.add(metrics_path, arcname="metrics.json")
        if calibration_path:
            archive.add(calibration_path, arcname="calibration.json")
        if embeddings_path:
            archive.add(embeddings_path, arcname="reference-embeddings.jsonl")
        if error_review_path:
            archive.add(error_review_path, arcname="error-review.json")
    return bundle


def main():
    args = parse_args()
    supabase_url = env("SUPABASE_URL").rstrip("/")
    publishable_key = env("SUPABASE_PUBLISHABLE_KEY")
    access_token = env("SUPABASE_ACCESS_TOKEN")

    checkpoint_path = Path(args.checkpoint)
    checkpoint = __import__("torch").load(checkpoint_path, map_location="cpu", weights_only=False)
    config = checkpoint["config"]

    user_response = requests.get(
        f"{supabase_url}/auth/v1/user",
        headers=api_headers(publishable_key, access_token),
        timeout=30,
    )
    user_response.raise_for_status()
    user_id = user_response.json()["id"]

    snapshot_response = requests.get(
        f"{supabase_url}/rest/v1/snake_sorter_dataset_snapshots",
        params={"id": f"eq.{args.snapshot_id}", "select": "*", "limit": "1"},
        headers=api_headers(publishable_key, access_token),
        timeout=30,
    )
    snapshot_response.raise_for_status()
    snapshots = snapshot_response.json()
    if not snapshots:
        raise RuntimeError("Dataset snapshot was not found or is not accessible")
    snapshot = snapshots[0]

    metrics = load_json(args.metrics_json)
    calibration = load_json(args.calibration_json)

    release_metadata = {
        "name": args.name,
        "version": args.version,
        "dataset_snapshot_id": args.snapshot_id,
        "dataset_manifest_sha256": snapshot["manifest_sha256"],
        "encoder": config["encoder"],
        "embedding_dimension": config["embedding_dim"],
        "rules_version": args.rules_version,
        "metrics": metrics,
        "calibration": calibration,
    }

    bundle = build_bundle(
        checkpoint_path,
        args.metrics_json,
        args.calibration_json,
        args.reference_embeddings,
        args.error_review_json,
        release_metadata,
    )
    artifact_hash = sha256_file(bundle)
    object_path = f"{args.name.lower().replace(' ', '-')}/{args.version}/{artifact_hash}.tar.gz"

    tus = tus_client.TusClient(
        f"{storage_hostname(supabase_url)}/storage/v1/upload/resumable",
        headers={
            "Authorization": f"Bearer {access_token}",
            "apikey": publishable_key,
            "x-upsert": "false",
        },
    )
    uploader = tus.uploader(
        str(bundle),
        chunk_size=CHUNK_SIZE,
        metadata={
            "bucketName": BUCKET,
            "objectName": object_path,
            "contentType": "application/gzip",
            "cacheControl": "3600",
            "metadata": json.dumps({
                "model_name": args.name,
                "model_version": args.version,
                "sha256": artifact_hash,
            }),
        },
    )
    uploader.upload()

    row = {
        "name": args.name,
        "version": args.version,
        "status": args.status,
        "architecture": "DINOv3 stage-conditioned multi-head",
        "encoder_name": config["encoder"],
        "embedding_dimension": int(config["embedding_dim"]),
        "labels": {
            "taxa": config.get("taxa", []),
            "stages": config.get("stages", []),
            "colors": config.get("colors", []),
        },
        "training_manifest_hash": snapshot["manifest_sha256"],
        "training_animal_count": snapshot["animal_count"],
        "training_media_count": snapshot["media_count"],
        "metrics": metrics,
        "calibration": calibration,
        "notes": args.notes or None,
        "created_by": user_id,
        "dataset_snapshot_id": args.snapshot_id,
        "artifact_storage_path": object_path,
        "artifact_sha256": artifact_hash,
        "artifact_size_bytes": bundle.stat().st_size,
        "artifact_format": "tar.gz",
        "rules_version": args.rules_version,
        "inference_config": {
            "temperature": calibration.get("temperature", 1.0),
            "reference_embeddings_in_bundle": bool(args.reference_embeddings),
            "error_review_in_bundle": bool(args.error_review_json),
        },
    }

    registry_response = requests.post(
        f"{supabase_url}/rest/v1/snake_sorter_model_versions",
        headers={
            **api_headers(publishable_key, access_token, content_type=True),
            "Prefer": "return=representation",
        },
        data=json.dumps(row),
        timeout=30,
    )
    if not registry_response.ok:
        raise RuntimeError(
            "Artifact uploaded but model registry insert failed: "
            + registry_response.text[:1000]
        )

    registered = registry_response.json()[0]
    print(json.dumps({
        "ok": True,
        "model_id": registered["id"],
        "status": registered["status"],
        "artifact_storage_path": object_path,
        "artifact_sha256": artifact_hash,
        "artifact_size_bytes": bundle.stat().st_size,
        "dataset_snapshot_id": args.snapshot_id,
    }, indent=2))


if __name__ == "__main__":
    main()
