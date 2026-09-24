import { NextResponse } from "next/server";
import { getSnakeSorterAccess, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const RUN_SELECT =
  "id,model_version_id,evidence_frame_count,source_asset_count,source_image_count,source_video_count,life_stage_hint,color_hint,scan_mode,result_taxon,result_confidence,status,error_code,confirmed_by_owner,created_at";
const FEEDBACK_SELECT =
  "id,analysis_run_id,feedback_type,predicted_taxon,corrected_taxon,corrected_life_stage,corrected_neonate_color,notes,created_at";
const MODEL_SELECT = "id,name,version,status";

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };
  // Users export only their own scans.
  const ownerScope = `&created_by=eq.${encodeURIComponent(identity.user.id)}`;
  const [runsResponse, feedbackResponse, modelsResponse] = await Promise.all([
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?select=${RUN_SELECT}&order=created_at.desc${ownerScope}`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_scan_feedback?select=${FEEDBACK_SELECT}&order=created_at.desc${ownerScope}`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_model_versions?select=${MODEL_SELECT}&order=created_at.desc`,
      { headers, cache: "no-store" },
    ),
  ]);
  if (!runsResponse.ok || !feedbackResponse.ok || !modelsResponse.ok) {
    return NextResponse.json({ error: "Scan export unavailable" }, { status: 502 });
  }

  const [runs, feedback, models] = await Promise.all([
    runsResponse.json() as Promise<Array<Record<string, unknown>>>,
    feedbackResponse.json() as Promise<Array<Record<string, unknown>>>,
    modelsResponse.json() as Promise<Array<Record<string, unknown>>>,
  ]);

  const modelMap = new Map(models.map((model) => [String(model.id), model]));
  const feedbackByRun = new Map<string, Array<Record<string, unknown>>>();
  for (const item of feedback) {
    const runId = String(item.analysis_run_id ?? "");
    if (!runId) continue;
    const list = feedbackByRun.get(runId) ?? [];
    list.push(item);
    feedbackByRun.set(runId, list);
  }

  const payload = {
    exported_at: new Date().toISOString(),
    scan_count: runs.length,
    scans: runs.map((run) => ({
      ...run,
      model: run.model_version_id ? modelMap.get(String(run.model_version_id)) ?? null : null,
      feedback: feedbackByRun.get(String(run.id)) ?? [],
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="snake-sorter-scans-${date}.json"`,
    },
  });
}
