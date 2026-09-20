from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import quote

import requests
from tqdm import tqdm


REFERENCE_BUCKET = "snake-sorter-reference"
PAGE_SIZE = 1000


def parse_args():
    parser = argparse.ArgumentParser(
        description="Download and verify one immutable Snake Sorter dataset snapshot."
    )
    parser.add_argument("--snapshot-id", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def headers(api_key: str, access_token: str) -> dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }


def fetch_one(
    supabase_url: str,
    table: str,
    filters: dict[str, str],
    api_key: str,
    access_token: str,
) -> dict:
    params = {"select": "*", "limit": "1", **filters}
    response = requests.get(
        f"{supabase_url}/rest/v1/{table}",
        params=params,
        headers=headers(api_key, access_token),
        timeout=30,
    )
    response.raise_for_status()
    rows = response.json()
    if not rows:
        raise RuntimeError(f"No accessible row found in {table}")
    return rows[0]


def fetch_all(
    supabase_url: str,
    table: str,
    filters: dict[str, str],
    api_key: str,
    access_token: str,
    order: str,
) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        request_headers = headers(api_key, access_token)
        request_headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
        response = requests.get(
            f"{supabase_url}/rest/v1/{table}",
            params={"select": "*", "order": order, **filters},
            headers=request_headers,
            timeout=60,
        )
        response.raise_for_status()
        batch = response.json()
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += len(batch)
    return rows


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def download_object(
    supabase_url: str,
    storage_path: str,
    destination: Path,
    api_key: str,
    access_token: str,
) -> None:
    encoded_path = quote(storage_path, safe="/")
    url = (
        f"{supabase_url}/storage/v1/object/authenticated/"
        f"{REFERENCE_BUCKET}/{encoded_path}"
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".partial")

    with requests.get(
        url,
        headers=headers(api_key, access_token),
        stream=True,
        timeout=(30, 300),
    ) as response:
        response.raise_for_status()
        with temporary.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
    temporary.replace(destination)


def manifest_row(item: dict) -> dict:
    return {
        "snapshot_id": item["snapshot_id"],
        "media_id": item["media_id"],
        "animal_id": item["animal_id"],
        "storage_path": item["storage_path"],
        "original_name": item.get("original_name"),
        "mime_type": item.get("mime_type"),
        "content_sha256": item.get("content_sha256"),
        "taxon": item["taxon"],
        "locality": item.get("locality"),
        "life_stage": item["life_stage"],
        "life_stage_override": item.get("life_stage_override"),
        "neonate_color": item["neonate_color"],
        "neonate_color_override": item.get("neonate_color_override"),
        "capture_date": item.get("capture_date"),
        "approximate_age_days": item.get("approximate_age_days"),
        "label_confidence": item["label_confidence"],
        "purity_status": item["purity_status"],
        "split_group": item.get("split_group"),
        "dataset_split": item["dataset_split"],
        "view_type": item["view_type"],
        "is_primary": item["is_primary"],
        "source_type": item.get("source_type"),
        "source_name": item.get("source_name"),
        "rights_status": item.get("rights_status"),
    }


def main():
    args = parse_args()
    supabase_url = required_env("SUPABASE_URL").rstrip("/")
    api_key = required_env("SUPABASE_PUBLISHABLE_KEY")
    access_token = required_env("SUPABASE_ACCESS_TOKEN")

    output = Path(args.output).resolve()
    media_root = output / "media"
    manifest_path = output / "manifest.csv"
    metadata_path = output / "snapshot.json"

    if output.exists() and any(output.iterdir()) and not args.overwrite:
        raise RuntimeError(
            f"{output} is not empty. Pass --overwrite to resume/verify an existing download."
        )
    output.mkdir(parents=True, exist_ok=True)

    snapshot = fetch_one(
        supabase_url,
        "snake_sorter_dataset_snapshots",
        {"id": f"eq.{args.snapshot_id}", "finalized": "eq.true"},
        api_key,
        access_token,
    )
    items = fetch_all(
        supabase_url,
        "snake_sorter_dataset_snapshot_items",
        {"snapshot_id": f"eq.{args.snapshot_id}"},
        api_key,
        access_token,
        "media_id.asc",
    )

    if not items:
        raise RuntimeError("Snapshot contains no media rows")

    expected_media_count = int(snapshot["media_count"])
    if len(items) != expected_media_count:
        raise RuntimeError(
            f"Snapshot says {expected_media_count} media rows but API returned {len(items)}"
        )

    distinct_animals = {str(item["animal_id"]) for item in items}
    expected_animal_count = int(snapshot["animal_count"])
    if len(distinct_animals) != expected_animal_count:
        raise RuntimeError(
            f"Snapshot says {expected_animal_count} animals but rows contain {len(distinct_animals)}"
        )

    rows = [manifest_row(item) for item in items]
    fieldnames = list(rows[0].keys())
    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    metadata_path.write_text(
        json.dumps(
            {
                "snapshot": snapshot,
                "downloaded_media_count": len(items),
                "downloaded_animal_count": len(distinct_animals),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    verified = 0
    skipped = 0
    for item in tqdm(items, desc="reference media"):
        storage_path = str(item.get("storage_path") or "")
        expected_hash = str(item.get("content_sha256") or "").lower()
        if not storage_path or len(expected_hash) != 64:
            raise RuntimeError(
                f"Snapshot media {item.get('media_id')} lacks frozen object identity"
            )

        destination = media_root / storage_path
        if destination.exists() and sha256_path(destination) == expected_hash:
            skipped += 1
            verified += 1
            continue

        download_object(
            supabase_url,
            storage_path,
            destination,
            api_key,
            access_token,
        )
        actual_hash = sha256_path(destination)
        if actual_hash != expected_hash:
            destination.unlink(missing_ok=True)
            raise RuntimeError(
                f"SHA-256 mismatch for {storage_path}: expected {expected_hash}, got {actual_hash}"
            )
        verified += 1

    print(
        json.dumps(
            {
                "ok": True,
                "snapshot_id": args.snapshot_id,
                "manifest_sha256": snapshot["manifest_sha256"],
                "animals": len(distinct_animals),
                "media": len(items),
                "verified": verified,
                "already_verified": skipped,
                "manifest": str(manifest_path),
                "media_root": str(media_root),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
