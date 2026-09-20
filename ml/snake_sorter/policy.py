from __future__ import annotations

DEFAULT_REJECTION_POLICY = {
    "confidence_floor": 0.60,
    "margin_floor": 0.15,
    "ood_ceiling": 0.38,
    "evidence_quality_floor": 0.42,
}


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
        confidence_floor = float(policy.get("confidence_floor", confidence_floor))
        margin_floor = float(policy.get("margin_floor", margin_floor))
        ood_ceiling = float(policy.get("ood_ceiling", ood_ceiling))
        evidence_floor = float(policy.get("evidence_quality_floor", evidence_floor))

    if evidence_quality < evidence_floor:
        return "poor_evidence"
    if ood_score is not None and ood_score > ood_ceiling:
        return "out_of_distribution"
    if confidence < confidence_floor:
        return "low_confidence"
    if margin < margin_floor:
        return "low_margin"
    return None
