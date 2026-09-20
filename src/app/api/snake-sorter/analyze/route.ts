import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";
import { runSnakeSorterEngine } from "@/lib/snake-sorter/engine";
import type { PreparedEvidence, SnakeSorterColor, SnakeSorterLifeStage } from "@/lib/snake-sorter/types";

export const runtime = "nodejs";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

const allowedStages = new Set(["auto", "neonate", "juvenile", "subadult", "adult"]);
const allowedColors = new Set(["auto", "red", "yellow", "not_applicable"]);
const allowedSampling = new Set(["balanced", "dense", "keyframes"]);

export async function POST(request: NextRequest) {
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
  if (!allowedStages.has(lifeStageHint) || !allowedColors.has(colorHint) || !allowedSampling.has(frameSampling)) {
    return NextResponse.json({ error: "Invalid analysis settings." }, { status: 400 });
  }

  const prepared: PreparedEvidence[] = await Promise.all(evidence.map(async (file) => ({
    name: file.name,
    mimeType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  })));

  // Intentionally no database or Storage write here.
  // Scan media is transient evidence only and is passed to the engine in memory.
  const engineResponse = await runSnakeSorterEngine({
    evidence: prepared,
    hints: {
      lifeStage: lifeStageHint as SnakeSorterLifeStage | "auto",
      color: colorHint as SnakeSorterColor | "auto",
      localityMode: String(form.get("locality_mode") ?? "true") === "true",
      nearestNeighbors: String(form.get("nearest_neighbors") ?? "true") === "true",
      conservativeMode: String(form.get("conservative_mode") ?? "true") === "true",
    },
  });

  if (engineResponse.status === "ready") {
    return NextResponse.json({ result: engineResponse.result });
  }

  return NextResponse.json({
    error: "model_not_connected",
    message: engineResponse.message,
    ready: {
      evidence_frames: engineResponse.preparedFrames,
      life_stage_hint: lifeStageHint,
      color_hint: colorHint,
      frame_sampling: frameSampling,
      locality_mode: String(form.get("locality_mode") ?? "true") === "true",
      nearest_neighbors: String(form.get("nearest_neighbors") ?? "true") === "true",
      conservative_mode: String(form.get("conservative_mode") ?? "true") === "true",
    },
  }, { status: 503 });
}
