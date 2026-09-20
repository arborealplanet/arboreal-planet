import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const h = (token: string) => ({
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

const taxa = new Set(["Morelia azurea azurea","Morelia azurea pulcher","Morelia azurea utaraensis","Morelia viridis","Unknown / review"]);
const stages = new Set(["hatchling","neonate","juvenile","subadult","adult","unknown"]);
const colors = new Set(["red","yellow","not_applicable","unknown"]);
const feedbackTypes = new Set(["confirmed","corrected","uncertain","insufficient_media"]);

function clean(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const analysisRunId = clean(body.analysis_run_id, 80);
  const feedbackType = clean(body.feedback_type, 40);
  const predictedTaxon = clean(body.predicted_taxon, 100);
  const correctedTaxon = clean(body.corrected_taxon, 100);
  const correctedStage = clean(body.corrected_life_stage, 40);
  const correctedColor = clean(body.corrected_neonate_color, 40);
  const notes = clean(body.notes, 2000);

  if (!analysisRunId || !feedbackTypes.has(feedbackType)) {
    return NextResponse.json({ error: "Invalid feedback request" }, { status: 400 });
  }
  if (predictedTaxon && !taxa.has(predictedTaxon)) return NextResponse.json({ error: "Invalid predicted taxon" }, { status: 400 });
  if (correctedTaxon && !taxa.has(correctedTaxon)) return NextResponse.json({ error: "Invalid corrected taxon" }, { status: 400 });
  if (correctedStage && !stages.has(correctedStage)) return NextResponse.json({ error: "Invalid corrected stage" }, { status: 400 });
  if (correctedColor && !colors.has(correctedColor)) return NextResponse.json({ error: "Invalid corrected color" }, { status: 400 });

  const runResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?id=eq.${encodeURIComponent(analysisRunId)}&created_by=eq.${encodeURIComponent(identity.user.id)}&select=id&limit=1`,
    { headers: h(identity.token), cache: "no-store" }
  );
  const runRows = runResponse.ok ? await runResponse.json() as Array<{ id: string }> : [];
  if (!runRows.length) return NextResponse.json({ error: "Analysis run not found" }, { status: 404 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_scan_feedback`, {
    method: "POST",
    headers: {
      ...h(identity.token),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      analysis_run_id: analysisRunId,
      created_by: identity.user.id,
      feedback_type: feedbackType,
      predicted_taxon: predictedTaxon || null,
      corrected_taxon: correctedTaxon || null,
      corrected_life_stage: correctedStage || null,
      corrected_neonate_color: correctedColor || null,
      notes: notes || null,
    }),
    cache: "no-store",
  });

  if (!response.ok) return NextResponse.json({ error: "Could not save scan feedback" }, { status: 400 });

  await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?id=eq.${encodeURIComponent(analysisRunId)}`, {
    method: "PATCH",
    headers: {
      ...h(identity.token),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      confirmed_by_owner: feedbackType === "confirmed" ? true : feedbackType === "corrected" ? false : null,
      owner_feedback_notes: notes || null,
    }),
    cache: "no-store",
  }).catch(() => undefined);

  const rows = await response.json();
  return NextResponse.json({ ok: true, feedback: rows[0] ?? null });
}
