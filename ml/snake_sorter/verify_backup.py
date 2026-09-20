from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify a Snake Sorter backup without restoring it."
    )
    parser.add_argument("--backup", required=True)
    args = parser.parse_args()

    root = Path(args.backup).resolve()
    manifest_path = root / "backup-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors: list[str] = []

    for table, meta in manifest.get("tables", {}).items():
        path = root / "metadata" / f"{table}.json"
        if not path.exists():
            errors.append(f"missing metadata: {table}")
        elif sha256_path(path) != meta["sha256"]:
            errors.append(f"metadata hash mismatch: {table}")

    for bucket, objects in manifest.get("buckets", {}).items():
        for item in objects:
            path = root / "storage" / bucket / item["name"]
            if not path.exists():
                errors.append(f"missing storage object: {bucket}/{item['name']}")
            elif sha256_path(path) != item["sha256"]:
                errors.append(f"storage hash mismatch: {bucket}/{item['name']}")

    print(json.dumps({
        "ok": not errors,
        "errors": errors[:100],
    }, indent=2))
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    main()
