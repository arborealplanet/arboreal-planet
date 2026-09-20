from __future__ import annotations

import io
import json
import os
import secrets
from pathlib import Path
from typing import Any

import numpy as np
import torch
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image
from torch.nn import functional as F
from transformers import AutoImageProcessor

from dataset import COLORS, LABELS, STAGES, TAXA
from inference import aggregate_views, nearest_similarity_ood, rejection_reason
from model import SnakeSorterModel


MAX_FRAMES = 24
MAX_FRAME_BYTES = 6 * 1024 * 1024
ALLOWED_VIEWS = {
    "auto", "unknown", "full_body", "head", "dorsal",
    "left_lateral", "right_lateral", "tail", "other",
}


def image_quality(image: Image.Image) -> tuple[float, list[str]]:
    gray = np.asarray(image.convert("L").resize((160, 160)), dtype=np.float32)
    mean = float(gray.mean())
    contrast = float(gray.std())
    gx = float(np.abs(np.diff(gray, axis=1)).mean())
    gy = float(np.abs(np.diff(gray, axis=0)).mean())
    sharpness = (gx + gy) / 2.0

    brightness = mean / 45.0 if mean < 45 else max(0.0, (255.0 - mean) / 30.0) if mean > 225 else 1.0
    score = float(np.clip(brightness * 0.35 + min(1.0, contrast / 45.0) * 0.25 + min(1.0, sharpness / 18.0) * 0.40, 0, 1))
    notes: list[str] = []
    if mean < 45:
        notes.append("Add more light")
    if mean > 225:
        notes.append("Reduce glare / overexposure")
    if contrast < 22:
        notes.append("Increase subject/background separation")
    if sharpness < 7:
        notes.append("Hold steady or refocus")
    if not notes:
        notes.append("Image quality looks good")
    return score, notes


class ReferenceIndex:
    def __init__(self, path: str | None) -> None:
        self.records: list[dict[str, Any]] = []
        self.matrix = torch.empty((0, 1), dtype=torch.float32)
        if not path:
            return
        source = Path(path)
        if not source.exists():
            return

        vectors = []
        with source.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                row = json.loads(line)
                vector = row.get("embedding")
                if not isinstance(vector, list) or not vector:
                    continue
                self.records.append(row)
                vectors.append(vector)

        if vectors:
            self.matrix = F.normalize(torch.tensor(vectors, dtype=torch.float32), dim=-1)

    def nearest(self, embedding: torch.Tensor, limit: int = 8) -> list[dict[str, Any]]:
        if not self.records or self.matrix.numel() == 0:
            return []
        query = F.normalize(embedding.detach().cpu().reshape(1, -1), dim=-1)
        if query.shape[1] != self.matrix.shape[1]:
            return []
        similarity = torch.mm(query, self.matrix.T).squeeze(0)
        count = min(limit, len(self.records))
        values, indices = torch.topk(similarity, k=count)
        out: list[dict[str, Any]] = []
        for value, index in zip(values.tolist(), indices.tolist()):
            row = self.records[index]
            taxon = row.get("taxon")
            if taxon not in TAXA:
                continue
            out.append({
                "animalId": str(row.get("animal_id") or ""),
                "mediaId": str(row.get("media_id") or "") or None,
                "taxon": taxon,
                "locality": row.get("locality"),
                "lifeStage": row.get("life_stage"),
                "viewType": row.get("view_type"),
                "similarity": float(value),
            })
        return out


class Runtime:
    def __init__(self) -> None:
        checkpoint_path = os.environ.get("SNAKE_SORTER_CHECKPOINT")
        if not checkpoint_path:
            raise RuntimeError("SNAKE_SORTER_CHECKPOINT is required")

        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        self.config = checkpoint["config"]
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.processor = AutoImageProcessor.from_pretrained(self.config["encoder"])
        self.model = SnakeSorterModel(
            encoder_name=self.config["encoder"],
            embedding_dim=int(self.config["embedding_dim"]),
            freeze_backbone=bool(self.config.get("freeze_backbone", True)),
        )
        self.model.load_state_dict(checkpoint["state_dict"])
        self.model.to(self.device).eval()

        self.temperature = float(
            os.environ.get(
                "SNAKE_SORTER_TEMPERATURE",
                self.config.get("temperature", 1.0),
            )
        )
        self.model_version = os.environ.get(
            "SNAKE_SORTER_MODEL_VERSION",
            Path(checkpoint_path).stem,
        )
        self.references = ReferenceIndex(os.environ.get("SNAKE_SORTER_REFERENCE_EMBEDDINGS"))


app = FastAPI(title="Snake Sorter Inference", version="1")
runtime: Runtime | None = None


@app.on_event("startup")
def load_runtime() -> None:
    global runtime
    runtime = Runtime()


def authorize(authorization: str | None) -> None:
    expected = os.environ.get("SNAKE_SORTER_SERVICE_TOKEN", "")
    supplied = ""
    if authorization and authorization.startswith("Bearer "):
        supplied = authorization[7:]
    if not expected or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(authorization)
    return {
        "ok": runtime is not None,
        "modelVersion": runtime.model_version if runtime else None,
        "device": str(runtime.device) if runtime else None,
        "references": len(runtime.references.records) if runtime else 0,
    }


@app.post("/v1/analyze")
async def analyze(
    evidence: list[UploadFile] = File(...),
    evidence_view: list[str] = Form(...),
    hints_json: str = Form(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    authorize(authorization)
    if runtime is None:
        raise HTTPException(status_code=503, detail="Model runtime is not loaded")
    if not 1 <= len(evidence) <= MAX_FRAMES:
        raise HTTPException(status_code=400, detail="Evidence frame count is out of range")
    if len(evidence_view) != len(evidence):
        raise HTTPException(status_code=400, detail="Evidence views do not match frame count")
    if any(view not in ALLOWED_VIEWS for view in evidence_view):
        raise HTTPException(status_code=400, detail="Invalid evidence view")

    try:
        hints = json.loads(hints_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid hints JSON") from exc

    images: list[Image.Image] = []
    quality_scores: list[float] = []
    quality_notes: list[str] = []

    for file in evidence:
        data = await file.read()
        if len(data) > MAX_FRAME_BYTES:
            raise HTTPException(status_code=413, detail="Evidence frame is too large")
        try:
            image = Image.open(io.BytesIO(data)).convert("RGB")
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not decode evidence image") from exc
        score, notes = image_quality(image)
        images.append(image)
        quality_scores.append(score)
        quality_notes.extend(notes[:1])

    encoded = runtime.processor(images=images, return_tensors="pt")
    pixel_values = encoded["pixel_values"].to(runtime.device)

    stage_hint = str(hints.get("lifeStage", "auto"))
    color_hint = str(hints.get("color", "auto"))
    forced_stage = None
    if stage_hint in LABELS.stage and stage_hint != "unknown":
        forced_stage = torch.full(
            (len(images),),
            LABELS.stage[stage_hint],
            dtype=torch.long,
            device=runtime.device,
        )

    with torch.no_grad():
        output = runtime.model(pixel_values, stage_targets=forced_stage)

    stage_probs = output["stage_logits"].softmax(-1).mean(0)
    color_probs = output["color_logits"].softmax(-1).mean(0)
    stage_label = stage_hint if stage_hint in LABELS.stage and stage_hint != "unknown" else STAGES[int(stage_probs.argmax().item())]
    color_label = color_hint if color_hint in LABELS.color and color_hint != "unknown" else COLORS[int(color_probs.argmax().item())]

    aggregate = aggregate_views(
        output["taxon_logits"],
        output["embedding"],
        evidence_view,
        quality_scores=quality_scores,
        temperature=runtime.temperature,
    )

    scores = dict(aggregate.scores)
    flags: list[str] = []

    if stage_label == "neonate" and color_label == "red" and scores["Morelia viridis"] > 0:
        flags.append("Red neonate evidence conflicts with the M. viridis neonate reference rule.")
        scores["Morelia viridis"] = 0.0
        total = sum(scores.values())
        if total > 0:
            scores = {key: value / total for key, value in scores.items()}

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_taxon, confidence = ordered[0]
    margin = confidence - ordered[1][1] if len(ordered) > 1 else confidence
    entropy = float(
        -sum(max(value, 1e-9) * np.log(max(value, 1e-9)) for value in scores.values())
        / np.log(len(TAXA))
    )

    query_embedding = torch.tensor(aggregate.embedding, dtype=torch.float32)
    neighbors = runtime.references.nearest(query_embedding) if bool(hints.get("nearestNeighbors", True)) else []
    ood_score = None
    if runtime.references.matrix.numel() > 1:
        ood_score = nearest_similarity_ood(query_embedding, runtime.references.matrix)

    evidence_score = float(np.mean(quality_scores)) if quality_scores else 0.0
    reason = rejection_reason(
        confidence=confidence,
        margin=margin,
        evidence_quality=evidence_score,
        ood_score=ood_score,
        conservative=bool(hints.get("conservativeMode", True)),
    )
    result_taxon = "Unknown / review" if reason else top_taxon

    locality = None
    if bool(hints.get("localityMode", True)) and neighbors:
        votes: dict[str, float] = {}
        for neighbor in neighbors:
            label = neighbor.get("locality")
            similarity = float(neighbor.get("similarity", 0))
            if label and similarity > 0.5:
                votes[str(label)] = votes.get(str(label), 0.0) + max(0.0, similarity)
        if votes:
            best_label, best_weight = max(votes.items(), key=lambda item: item[1])
            total_weight = sum(votes.values())
            support = sum(1 for n in neighbors if n.get("locality") == best_label)
            if support >= 2 and total_weight > 0:
                locality = {
                    "label": best_label,
                    "confidence": float(best_weight / total_weight),
                }

    usable = sum(score >= 0.42 for score in quality_scores)
    if usable < len(images):
        flags.append(f"{len(images) - usable} evidence frame(s) were low quality.")

    return {
        "result": {
            "taxon": result_taxon,
            "confidence": float(confidence),
            "scores": scores,
            "lifeStage": stage_label,
            "neonateColor": color_label,
            "locality": locality,
            "nearestReferences": neighbors,
            "evidenceQuality": {
                "usableFrames": usable,
                "requestedFrames": len(images),
                "score": evidence_score,
                "notes": list(dict.fromkeys(quality_notes))[:5],
            },
            "uncertainty": {
                "topTwoMargin": float(margin),
                "entropy": entropy,
                "outOfDistributionScore": ood_score,
                "rejectionReason": reason,
            },
            "flags": flags,
            "modelVersion": runtime.model_version,
        }
    }
