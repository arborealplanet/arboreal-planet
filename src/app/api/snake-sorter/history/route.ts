import { NextResponse } from "next/server";
import { getSnakeSorterAccess, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const h = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function sorterIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  return { ...identity, access };
}

export async function GET() {
  const identity = await sorterIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers = h(identity.token);
  // Members see their own scan history; the owner sees everything.
  const ownerScope = identity.access.isOwner ? "" : `&created_by=eq.${encodeURIComponent(identity.user.id)}`;
  const [runsResponse, feedbackResponse, modelsResponse] = await Promise.all([
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?select=id,model_version_id,evidence_frame_count,source_asset_count,source_image_count,source_video_count,life_stage_hint,color_hint,scan_mode,result_taxon,result_confidence,status,error_code,confirmed_by_owner,created_at&order=created_at.desc&limit=50${ownerScope}`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_scan_feedback?select=id,analysis_run_id,feedback_type,predicted_taxon,corrected_taxon,corrected_life_stage,corrected_neonate_color,notes,created_at&order=created_at.desc&limit=100${ownerScope}`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_model_versions?select=id,name,version,status&order=created_at.desc`,
      { headers, cache: "no-store" },
    ),
  ]);

  if (!runsResponse.ok || !feedbackResponse.ok || !modelsResponse.ok) {
    return NextResponse.json({ error: "Scan history unavailable" }, { status: 502 });
  }

  const [runs, feedback, models] = await Promise.all([
    runsResponse.json() as Promise<Array<Record<string, unknown>>>,
    feedbackResponse.json() as Promise<Array<Record<string, unknown>>>,
    modelsResponse.json() as Promise<Array<Record<string, unknown>>>,
  ]);

  const modelMap = new Map(models.map((model) => [String(model.id), model]));
  const feedbackByRun = new Map<string, Record<string, unknown>>();
  for (const item of feedback) {
    const runId = String(item.analysis_run_id ?? "");
    if (runId && !feedbackByRun.has(runId)) feedbackByRun.set(runId, item);
  }

  const enriched = runs.map((run) => ({
    ...run,
    model: run.model_version_id ? modelMap.get(String(run.model_version_id)) ?? null : null,
    feedback: feedbackByRun.get(String(run.id)) ?? null,
  }));

  const completed = runs.filter((run) => run.status === "completed");
  const confirmed = feedback.filter((item) => item.feedback_type === "confirmed").length;
  const corrected = feedback.filter((item) => item.feedback_type === "corrected").length;
  const uncertain = feedback.filter((item) => item.feedback_type === "uncertain").length;
  const insufficient = feedback.filter((item) => item.feedback_type === "insufficient_media").length;

  return NextResponse.json({
    runs: enriched,
    summary: {
      total: runs.length,
      completed: completed.length,
      confirmed,
      corrected,
      uncertain,
      insufficient,
    },
  });
}
