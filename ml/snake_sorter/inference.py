from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

import numpy as np
import torch
from torch.nn import functional as F

from dataset import TAXA


DEFAULT_VIEW_WEIGHTS = {
    "head": 1.20,
    "dorsal": 1.15,
    "left_lateral": 1.10,
    "right_lateral": 1.10,
    "full_body": 1.00,
    "tail": 0.85,
    "other": 0.70,
    "auto": 0.90,
    "unknown": 0.80,
}


@dataclass
class AggregateResult:
    scores: dict[str, float]
    confidence: float
    top_two_margin: float
    entropy: float
    embedding: list[float]


def aggregate_views(
    taxon_logits: torch.Tensor,
    embeddings: torch.Tensor,
    view_types: list[str],
    quality_scores: list[float] | None = None,
    temperature: float = 1.0,
) -> AggregateResult:
    if taxon_logits.ndim != 2 or taxon_logits.shape[0] == 0:
        raise ValueError("Expected [frames, classes] taxon logits")
    if len(view_types) != taxon_logits.shape[0]:
        raise ValueError("view_types length must match frame count")

    probs = F.softmax(taxon_logits / max(0.05, temperature), dim=-1)
    quality = quality_scores or [1.0] * len(view_types)

    weights = torch.tensor(
        [
            max(0.05, DEFAULT_VIEW_WEIGHTS.get(view, 0.8) * float(q))
            for view, q in zip(view_types, quality)
        ],
        dtype=probs.dtype,
        device=probs.device,
    )
    weights = weights / weights.sum()

    aggregate = torch.sum(probs * weights.unsqueeze(-1), dim=0)
    embedding = torch.sum(
        F.normalize(embeddings, dim=-1) * weights.unsqueeze(-1),
        dim=0,
    )
    embedding = F.normalize(embedding, dim=-1)

    ordered = torch.sort(aggregate, descending=True).values
    confidence = float(ordered[0].item())
    margin = float((ordered[0] - ordered[1]).item()) if len(ordered) > 1 else confidence
    entropy = float(
        (-(aggregate.clamp_min(1e-9) * aggregate.clamp_min(1e-9).log()).sum()
        / np.log(len(TAXA))).item()
    )

    return AggregateResult(
        scores={taxon: float(aggregate[i].item()) for i, taxon in enumerate(TAXA)},
        confidence=confidence,
        top_two_margin=margin,
        entropy=entropy,
        embedding=embedding.detach().cpu().tolist(),
    )


def nearest_similarity_ood(
    query_embedding: torch.Tensor,
    reference_embeddings: torch.Tensor,
) -> float:
    """Returns 0 for in-distribution-looking and 1 for very unlike references."""
    if reference_embeddings.numel() == 0:
        return 1.0
    query = F.normalize(query_embedding.reshape(1, -1), dim=-1)
    references = F.normalize(reference_embeddings, dim=-1)
    best_similarity = torch.mm(query, references.T).max().clamp(-1, 1)
    return float(((1.0 - best_similarity) / 2.0).item())


def rejection_reason(
    confidence: float,
    margin: float,
    evidence_quality: float,
    ood_score: float | None,
    conservative: bool = True,
    policy: dict | None = None,
) -> str | None:
    confidence_floor = 0.60 if conservative else 0.50
    margin_floor = 0.15 if conservative else 0.08
    ood_ceiling = 0.38 if conservative else 0.48
    evidence_floor = 0.42

    if conservative and policy:
        confidence_floor = float(
            policy.get("confidence_floor", confidence_floor)
        )
        margin_floor = float(
            policy.get("margin_floor", margin_floor)
        )
        ood_ceiling = float(
            policy.get("ood_ceiling", ood_ceiling)
        )
        evidence_floor = float(
            policy.get("evidence_quality_floor", evidence_floor)
        )

    if evidence_quality < evidence_floor:
        return "poor_evidence"
    if ood_score is not None and ood_score > ood_ceiling:
        return "out_of_distribution"
    if confidence < confidence_floor:
        return "low_confidence"
    if margin < margin_floor:
        return "low_margin"
    return None
