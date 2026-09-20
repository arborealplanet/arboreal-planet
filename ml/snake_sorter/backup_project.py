from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import quote

import requests
from tqdm import tqdm

TABLES = [
    "snake_sorter_reference_animals",
    "snake_sorter_reference_media",
    "snake_sorter_dataset_snapshots",
    "snake_sorter_dataset_snapshot_items",
    "snake_sorter_model_versions",
    "snake_sorter_reference_embeddings",
    "snake_sorter_analysis_runs",
    "snake_sorter_scan_feedback",
]
BUCKETS = ["snake-sorter-reference", "snake-sorter-models"]


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def headers(api_key: str, token: str) -> dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch_all(
    base: str,
    table: str,
    api_key: str,
    token: str,
) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        request_headers = headers(api_key, token)
        request_headers["Range"] = f"{offset}-{offset + 999}"
        response = requests.get(
            f"{base}/rest/v1/{table}",
            params={"select": "*", "order": "id.asc"},
            headers=request_headers,
            timeout=60,
        )
        response.raise_for_status()
        batch = response.json()
        rows.extend(batch)
        if len(batch) < 1000:
            return rows
        offset += len(batch)


def list_objects(
    base: str,
    bucket: str,
    api_key: str,
    token: str,
) -> list[dict]:
    objects: list[dict] = []
    offset = 0
    while True:
        response = requests.post(
            f"{base}/storage/v1/object/list/{bucket}",
            headers={
                **headers(api_key, token),
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "prefix": "",
                "limit": 1000,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            }),
            timeout=60,
        )
        response.raise_for_status()
        batch = response.json()
        files = [item for item in batch if item.get("id")]
        objects.extend(files)
        if len(batch) < 1000:
            return objects
        offset += len(batch)


def download_object(
    base: str,
    bucket: str,
    name: str,
    destination: Path,
    api_key: str,
    token: str,
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    url = (
        f"{base}/storage/v1/object/authenticated/"
        f"{bucket}/{quote(name, safe='/')}"
    )
    with requests.get(
        url,
        headers=headers(api_key, token),
        stream=True,
        timeout=(30, 300),
    ) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            for chunk in response.iter_content(1024 * 1024):
                if chunk:
                    handle.write(chunk)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Back up Snake Sorter metadata and private Storage."
    )
    parser.add_argument("--output", required=True)
    parser.add_argument("--skip-storage", action="store_true")
    args = parser.parse_args()

    base = required_env("SUPABASE_URL").rstrip("/")
    api_key = required_env("SUPABASE_PUBLISHABLE_KEY")
    token = required_env("SUPABASE_ACCESS_TOKEN")
    root = Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=True)

    manifest: dict = {"version": 1, "tables": {}, "buckets": {}}

    for table in TABLES:
        rows = fetch_all(base, table, api_key, token)
        target = root / "metadata" / f"{table}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(rows, indent=2), encoding="utf-8")
        manifest["tables"][table] = {
            "rows": len(rows),
            "sha256": sha256_path(target),
        }

    if not args.skip_storage:
        for bucket in BUCKETS:
            entries: list[dict] = []
            for item in tqdm(
                list_objects(base, bucket, api_key, token),
                desc=bucket,
            ):
                name = str(item["name"])
                target = root / "storage" / bucket / name
                download_object(base, bucket, name, target, api_key, token)
                entries.append({
                    "name": name,
                    "size": target.stat().st_size,
                    "sha256": sha256_path(target),
                })
            manifest["buckets"][bucket] = entries

    manifest_path = root / "backup-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8",
    )

    print(json.dumps({
        "ok": True,
        "output": str(root),
        "tables": {
            name: info["rows"]
            for name, info in manifest["tables"].items()
        },
        "buckets": {
            name: len(items)
            for name, items in manifest["buckets"].items()
        },
    }, indent=2))


if __name__ == "__main__":
    main()
