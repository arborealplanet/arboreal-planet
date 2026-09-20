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

        frame = frame.loc[frame["dataset_split"].astype(str) == split].copy()
        frame = frame.loc[frame["taxon"].isin(TAXA)].copy()
        if frame.empty:
            raise ValueError(f"No usable rows for split={split!r}")

        # The split is already assigned per animal in Arboreal Planet.
        # Assert that the manifest has not leaked an individual across splits.
        all_frame = pd.read_csv(manifest, usecols=["animal_id", "dataset_split"])
        per_animal = all_frame.groupby("animal_id")["dataset_split"].nunique()
        leaked = per_animal[per_animal > 1]
        if len(leaked):
            raise ValueError(
                f"Individual split leakage detected for {len(leaked)} animals. "
                "Fix the manifest before training."
            )

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

        stage = str(row.get("life_stage_override") or row["life_stage"])
        color = str(row.get("neonate_color_override") or row["neonate_color"])
        if stage not in LABELS.stage:
            stage = "unknown"
        if color not in LABELS.color:
            color = "unknown"

        return {
            "image": image,
            "taxon": LABELS.taxon[str(row["taxon"])],
            "stage": LABELS.stage[stage],
            "color": LABELS.color[color],
            "animal_id": str(row["animal_id"]),
            "view_type": str(row.get("view_type", "unknown")),
            "path": str(path),
        }
