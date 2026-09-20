import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { runSnakeSorterEngine } from "@/lib/snake-sorter/engine";
import type { PreparedEvidence, SnakeSorterColor, SnakeSorterLifeStage, SnakeSorterScanMode, SnakeSorterViewType } from "@/lib/snake-sorter/types";

export const runtime = "nodejs";

const restHeaders = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

const allowedStages = new Set(["auto", "hatchling", "neonate", "juvenile", "subadult", "adult"]);
const allowedColors = new Set(["auto", "red", "yellow", "not_applicable"]);
const allowedSampling = new Set(["balanced", "dense", "keyframes"]);
const allowedModes = new Set(["quick","deep","live"]);
const allowedViews = new Set(["auto","full_body","head","dorsal","left_lateral","right_lateral","tail","other"]);

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid analysis request" }, { status: 400 });

  const evidence = form.getAll("evidence").filter((item): item is File => item instanceof File && item.size > 0);
  if (!evidence.length) return NextResponse.json({ error: "Add at least one usable image or video frame." }, { status: 400 });
  if (evidence.length > 24) return NextResponse.json({ error: "Too many evidence frames. Maximum is 24." }, { status: 400 });

  for (const file of evidence) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Analysis accepts image evidence frames only." }, { status: 400 });
    }
    if (file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ error: "One or more evidence frames are too large." }, { status: 400 });
    }
  }

  const lifeStageHint = String(form.get("life_stage_hint") ?? "auto");
  const colorHint = String(form.get("color_hint") ?? "auto");
  const frameSampling = String(form.get("frame_sampling") ?? "balanced");
  const scanMode = String(form.get("scan_mode") ?? "deep");
  const provenanceHint = String(form.get("provenance_hint") ?? "").trim().slice(0, 120);
  const useProvenancePrior = String(form.get("use_provenance_prior") ?? "false") === "true";
  const evidenceViews = form.getAll("evidence_view").map((value) => String(value));
  if (!allowedStages.has(lifeStageHint) || !allowedColors.has(colorHint) || !allowedSampling.has(frameSampling) || !allowedModes.has(scanMode) || evidenceViews.some((view) => !allowedViews.has(view))) {
    return NextResponse.json({ error: "Invalid analysis settings." }, { status: 400 });
  }

  const prepared: PreparedEvidence[] = await Promise.all(evidence.map(async (file, index) => ({
    name: file.name,
    mimeType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    viewType: (evidenceViews[index] ?? "auto") as SnakeSorterViewType,
  })));

  const contextFlags = {
    localityMode: String(form.get("locality_mode") ?? "true") === "true",
    nearestNeighbors: String(form.get("nearest_neighbors") ?? "true") === "true",
    conservativeMode: String(form.get("conservative_mode") ?? "true") === "true",
  };

  let analysisRunId: string | null = null;
  let activeModelId: string | null = null;

  const activeModelResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_model_versions?status=eq.active&select=id&limit=1`,
    { headers: restHeaders(identity.token), cache: "no-store" }
  );
  if (activeModelResponse.ok) {
    const rows = await activeModelResponse.json() as Array<{ id: string }>;
    activeModelId = rows[0]?.id ?? null;
  }

  const historyResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs`, {
    method: "POST",
    headers: {
      ...restHeaders(identity.token),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      created_by: identity.user.id,
      model_version_id: activeModelId,
      evidence_frame_count: prepared.length,
      source_asset_count: Number(form.get("source_assets") ?? 0) || 0,
      source_image_count: Number(form.get("source_images") ?? 0) || 0,
      source_video_count: Number(form.get("source_videos") ?? 0) || 0,
      life_stage_hint: lifeStageHint,
      color_hint: colorHint,
      conservative_mode: contextFlags.conservativeMode,
      locality_mode: contextFlags.localityMode,
      nearest_neighbors: contextFlags.nearestNeighbors,
      scan_mode: scanMode,
      provenance_hint: provenanceHint || null,
      use_provenance_prior: useProvenancePrior,
      status: "prepared",
    }),
    cache: "no-store",
  });
  if (historyResponse.ok) {
    const rows = await historyResponse.json() as Array<{ id: string }>;
    analysisRunId = rows[0]?.id ?? null;
  }

  // Intentionally no database or Storage write here.
  // Scan media is transient evidence only and is passed to the engine in memory.
  const inferenceStartedAt = Date.now();
  const engineResponse = await runSnakeSorterEngine({
    evidence: prepared,
    hints: {
      scanMode: scanMode as SnakeSorterScanMode,
      lifeStage: lifeStageHint as SnakeSorterLifeStage | "auto",
      color: colorHint as SnakeSorterColor | "auto",
      localityMode: contextFlags.localityMode,
      provenanceHint: provenanceHint || null,
      useProvenancePrior,
      nearestNeighbors: contextFlags.nearestNeighbors,
      conservativeMode: contextFlags.conservativeMode,
    },
  });

  const inferenceDurationMs = Date.now() - inferenceStartedAt;
  const requestDurationMs = Date.now() - requestStartedAt;
  const completedAt = new Date().toISOString();

  if (engineResponse.status === "ready") {
    const servingModelId = engineResponse.result.modelRegistryId ?? null;
    if (!activeModelId || !servingModelId || servingModelId !== activeModelId) {
      if (analysisRunId) {
        await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?id=eq.${encodeURIComponent(analysisRunId)}`, {
          method: "PATCH",
          headers: {
            ...restHeaders(identity.token),
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "error",
            error_code: "model_registry_mismatch",
            request_duration_ms: requestDurationMs,
            inference_duration_ms: inferenceDurationMs,
            completed_at: completedAt,
            result_payload: {
              error: "model_registry_mismatch",
              active_model_id: activeModelId,
              serving_model_id: servingModelId,
              serving_model_version: engineResponse.result.modelVersion,
            },
          }),
          cache: "no-store",
        }).catch(() => undefined);
      }

      return NextResponse.json({
        error: "model_registry_mismatch",
        message: "The inference service is not serving the model currently marked active in Snake Sorter.",
        active_model_id: activeModelId,
        serving_model_id: servingModelId,
        serving_model_version: engineResponse.result.modelVersion,
        analysis_run_id: analysisRunId,
      }, { status: 503 });
    }

    if (analysisRunId) {
      await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?id=eq.${encodeURIComponent(analysisRunId)}`, {
        method: "PATCH",
        headers: {
          ...restHeaders(identity.token),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          result_taxon: engineResponse.result.taxon,
          result_confidence: engineResponse.result.confidence,
          result_payload: engineResponse.result,
          status: "completed",
          error_code: null,
          request_duration_ms: requestDurationMs,
          inference_duration_ms: inferenceDurationMs,
          completed_at: completedAt,
        }),
        cache: "no-store",
      }).catch(() => undefined);
    }
    return NextResponse.json({ result: engineResponse.result, analysis_run_id: analysisRunId });
  }

  if (analysisRunId) {
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?id=eq.${encodeURIComponent(analysisRunId)}`, {
      method: "PATCH",
      headers: {
        ...restHeaders(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "error",
        error_code: "model_not_connected",
        request_duration_ms: requestDurationMs,
        inference_duration_ms: inferenceDurationMs,
        completed_at: completedAt,
      }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  return NextResponse.json({
    error: "model_not_connected",
    message: engineResponse.message,
    analysis_run_id: analysisRunId,
    ready: {
      evidence_frames: engineResponse.preparedFrames,
      life_stage_hint: lifeStageHint,
      color_hint: colorHint,
      frame_sampling: frameSampling,
      scan_mode: scanMode,
      evidence_views: prepared.map((frame) => frame.viewType),
      provenance_hint: provenanceHint || null,
      use_provenance_prior: useProvenancePrior,
      locality_mode: contextFlags.localityMode,
      nearest_neighbors: contextFlags.nearestNeighbors,
      conservative_mode: contextFlags.conservativeMode,
    },
  }, { status: 503 });
}
