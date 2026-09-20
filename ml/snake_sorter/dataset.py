from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import pandas as pd
from PIL import Image
from torch.utils.data import Dataset


TAXA = [
    "Morelia azurea azurea",
    "Morelia azurea pulcher",
    "Morelia azurea utaraensis",
    "Morelia viridis",
]

STAGES = ["hatchling", "neonate", "juvenile", "subadult", "adult", "unknown"]
COLORS = ["red", "yellow", "not_applicable", "unknown"]
VIEWS = ["auto", "unknown", "full_body", "head", "dorsal", "left_lateral", "right_lateral", "tail", "other"]


@dataclass(frozen=True)
class LabelMaps:
    taxon: dict[str, int]
    stage: dict[str, int]
    color: dict[str, int]


LABELS = LabelMaps(
    taxon={name: i for i, name in enumerate(TAXA)},
    stage={name: i for i, name in enumerate(STAGES)},
    color={name: i for i, name in enumerate(COLORS)},
)


def clean_override(value, fallback: str) -> str:
    if value is None or pd.isna(value):
        return fallback
    text = str(value).strip()
    return text if text and text.lower() != "nan" else fallback


class SnakeSorterDataset(Dataset):
    def __init__(
        self,
        manifest: str | Path,
        media_root: str | Path,
        split: str,
        image_transform: Callable | None = None,
    ) -> None:
        frame = pd.read_csv(manifest)
        required = {
            "animal_id",
            "storage_path",
            "taxon",
            "life_stage",
            "neonate_color",
            "dataset_split",
        }
        missing = required - set(frame.columns)
        if missing:
            raise ValueError(f"Manifest missing columns: {sorted(missing)}")

        all_frame = frame[["animal_id", "dataset_split"]].copy()
        per_animal = all_frame.groupby("animal_id")["dataset_split"].nunique()
        leaked = per_animal[per_animal > 1]
        if len(leaked):
            raise ValueError(
                f"Individual split leakage detected for {len(leaked)} animals. "
                "Fix the manifest before training."
            )

        frame = frame.loc[frame["dataset_split"].astype(str) == split].copy()
        frame = frame.loc[frame["taxon"].isin(TAXA)].copy()
        if frame.empty:
            raise ValueError(f"No usable rows for split={split!r}")

        self.frame = frame.reset_index(drop=True)
        self.media_root = Path(media_root)
        self.image_transform = image_transform

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, index: int):
        row = self.frame.iloc[index]
        path = self.media_root / str(row["storage_path"])
        if not path.exists():
            raise FileNotFoundError(path)

        with Image.open(path) as source:
            image = source.convert("RGB")

        if self.image_transform is not None:
            image = self.image_transform(image)

        stage = clean_override(row.get("life_stage_override"), str(row["life_stage"]))
        color = clean_override(row.get("neonate_color_override"), str(row["neonate_color"]))
        view = clean_override(row.get("view_type"), "unknown")

        if stage not in LABELS.stage:
            stage = "unknown"
        if color not in LABELS.color:
            color = "unknown"
        if view not in VIEWS:
            view = "unknown"

        return {
            "image": image,
            "taxon": LABELS.taxon[str(row["taxon"])],
            "taxon_name": str(row["taxon"]),
            "locality": None if pd.isna(row.get("locality")) else str(row.get("locality")),
            "stage": LABELS.stage[stage],
            "stage_name": stage,
            "color_name": color,
            "color": LABELS.color[color],
            "animal_id": str(row["animal_id"]),
            "media_id": str(row.get("media_id", "")),
            "view_type": view,
            "path": str(path),
        }
