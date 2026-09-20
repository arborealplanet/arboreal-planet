from __future__ import annotations

import torch
from torch import nn


class TemperatureScaler(nn.Module):
    """Single-temperature calibration fitted on validation logits only."""

    def __init__(self, initial_temperature: float = 1.0) -> None:
        super().__init__()
        self.log_temperature = nn.Parameter(
            torch.tensor(float(initial_temperature)).log()
        )

    @property
    def temperature(self) -> torch.Tensor:
        return self.log_temperature.exp().clamp(0.05, 20.0)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        return logits / self.temperature

    def fit(
        self,
        logits: torch.Tensor,
        labels: torch.Tensor,
        max_iter: int = 80,
    ) -> float:
        logits = logits.detach()
        labels = labels.detach()
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.LBFGS(
            [self.log_temperature],
            lr=0.05,
            max_iter=max_iter,
            line_search_fn="strong_wolfe",
        )

        def closure():
            optimizer.zero_grad()
            loss = criterion(self(logits), labels)
            loss.backward()
            return loss

        optimizer.step(closure)
        return float(self.temperature.detach().cpu().item())


def expected_calibration_error(
    probabilities: torch.Tensor,
    labels: torch.Tensor,
    bins: int = 15,
) -> float:
    confidence, prediction = probabilities.max(dim=1)
    correct = prediction.eq(labels)
    edges = torch.linspace(0, 1, bins + 1, device=probabilities.device)
    ece = torch.zeros((), device=probabilities.device)

    for lower, upper in zip(edges[:-1], edges[1:]):
        mask = confidence.gt(lower) & confidence.le(upper)
        if mask.any():
            accuracy = correct[mask].float().mean()
            average_confidence = confidence[mask].mean()
            ece += mask.float().mean() * (average_confidence - accuracy).abs()

    return float(ece.detach().cpu().item())
