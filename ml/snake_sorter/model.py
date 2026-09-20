from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as F
from transformers import AutoModel

from dataset import COLORS, STAGES, TAXA


class SnakeSorterModel(nn.Module):
    def __init__(
        self,
        encoder_name: str,
        embedding_dim: int = 256,
        freeze_backbone: bool = True,
    ) -> None:
        super().__init__()
        self.encoder_name = encoder_name
        self.encoder = AutoModel.from_pretrained(encoder_name)
        hidden = int(self.encoder.config.hidden_size)

        self.projection = nn.Sequential(
            nn.LayerNorm(hidden),
            nn.Linear(hidden, embedding_dim),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(embedding_dim, embedding_dim),
        )
        self.taxon_head = nn.Linear(embedding_dim, len(TAXA))
        self.stage_head = nn.Linear(embedding_dim, len(STAGES))
        self.color_head = nn.Linear(embedding_dim, len(COLORS))

        if freeze_backbone:
            for parameter in self.encoder.parameters():
                parameter.requires_grad = False

    def pooled_features(self, pixel_values: torch.Tensor) -> torch.Tensor:
        output = self.encoder(pixel_values=pixel_values)
        pooled = getattr(output, "pooler_output", None)
        if pooled is not None:
            return pooled
        return output.last_hidden_state[:, 0]

    def forward(self, pixel_values: torch.Tensor) -> dict[str, torch.Tensor]:
        pooled = self.pooled_features(pixel_values)
        embedding = F.normalize(self.projection(pooled), dim=-1)
        return {
            "embedding": embedding,
            "taxon_logits": self.taxon_head(embedding),
            "stage_logits": self.stage_head(embedding),
            "color_logits": self.color_head(embedding),
        }
