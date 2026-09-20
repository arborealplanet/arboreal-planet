import type { PreparedEvidence, SnakeSorterAnalysisResult, SnakeSorterHints } from "./types";

export type SnakeSorterEngineInput = {
  evidence: PreparedEvidence[];
  hints: SnakeSorterHints;
};

export type SnakeSorterEngineResponse =
  | { status: "ready"; result: SnakeSorterAnalysisResult }
  | { status: "model_not_connected"; preparedFrames: number; message: string };

export async function runSnakeSorterEngine(input: SnakeSorterEngineInput): Promise<SnakeSorterEngineResponse> {
  // This is the stable boundary for the production vision stack.
  // Future implementation:
  // 1. score evidence quality / snake visibility
  // 2. run snake detector and morphology encoder
  // 3. aggregate multi-view embeddings
  // 4. query reference embeddings
  // 5. run taxon / stage / color heads
  // 6. apply biological rules and calibrated rejection threshold
  // 7. optionally estimate locality
  //
  // Scan frames are intentionally passed in memory only; this function must not
  // persist them into the reference/training library.
  return {
    status: "model_not_connected",
    preparedFrames: input.evidence.length,
    message: `Snake Sorter prepared ${input.evidence.length} evidence frame(s). The capture, preprocessing, dataset, and engine interface are ready for the trained vision model.`,
  };
}
