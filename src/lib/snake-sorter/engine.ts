import type { PreparedEvidence, SnakeSorterAnalysisResult, SnakeSorterHints } from "./types";

export type SnakeSorterEngineInput = {
  evidence: PreparedEvidence[];
  hints: SnakeSorterHints;
};

export type SnakeSorterEngineResponse =
  | { status: "ready"; result: SnakeSorterAnalysisResult }
  | { status: "model_not_connected"; preparedFrames: number; message: string };

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function runSnakeSorterEngine(input: SnakeSorterEngineInput): Promise<SnakeSorterEngineResponse> {
  const inferenceUrl = process.env.SNAKE_SORTER_INFERENCE_URL?.trim();
  const inferenceToken = process.env.SNAKE_SORTER_INFERENCE_TOKEN?.trim();

  if (!inferenceUrl || !inferenceToken) {
    return {
      status: "model_not_connected",
      preparedFrames: input.evidence.length,
      message: `Snake Sorter prepared ${input.evidence.length} evidence frame(s). The capture, preprocessing, dataset, and engine interface are ready; configure the private inference service to enable model predictions.`,
    };
  }

  const form = new FormData();
  for (const frame of input.evidence) {
    form.append(
      "evidence",
      new Blob([frame.bytes], { type: frame.mimeType }),
      frame.name,
    );
    form.append("evidence_view", frame.viewType);
  }
  form.set("hints_json", JSON.stringify(input.hints));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${cleanBaseUrl(inferenceUrl)}/v1/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inferenceToken}`,
      },
      body: form,
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null) as { result?: SnakeSorterAnalysisResult; detail?: string } | null;
    if (!response.ok || !payload?.result) {
      return {
        status: "model_not_connected",
        preparedFrames: input.evidence.length,
        message: payload?.detail || `Snake Sorter inference service returned HTTP ${response.status}.`,
      };
    }

    return { status: "ready", result: payload.result };
  } catch (error) {
    return {
      status: "model_not_connected",
      preparedFrames: input.evidence.length,
      message: error instanceof Error && error.name === "AbortError"
        ? "Snake Sorter inference timed out before a result was returned."
        : "Snake Sorter inference service is currently unavailable.",
    };
  } finally {
    clearTimeout(timer);
  }
}
