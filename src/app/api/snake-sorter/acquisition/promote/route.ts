import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

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

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "candidate-image";
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const candidateId = clean(body.candidate_id, 100);
  const taxon = clean(body.taxon, 80);
  const locality = clean(body.locality, 100);
  const lifeStage = clean(body.life_stage, 30);
  const neonateColor = clean(body.neonate_color, 30);
  const labelConfidence = clean(body.label_confidence, 30);
  const purityStatus = clean(body.purity_status, 30);
  const viewType = clean(body.view_type, 30) || "unknown";
  const animalCode = clean(body.animal_code, 100);
  const splitGroup = clean(body.split_group, 160);
  const trainingEligible = body.training_eligible === true;
  const challengeEligible = body.challenge_eligible === true;
  const challengeExpectation = clean(body.challenge_expectation, 20) || "review";

  const allowedTaxa = new Set(["Morelia azurea azurea","Morelia azurea pulcher","Morelia azurea utaraensis","Morelia viridis","Unknown / review"]);
  const allowedStages = new Set(["hatchling","neonate","juvenile","subadult","adult","unknown"]);
  const allowedColors = new Set(["red","yellow","not_applicable","unknown"]);
  const allowedConfidence = new Set(["confirmed","strong","provisional","uncertain"]);
  const allowedPurity = new Set(["known_pure","believed_pure","possible_mixed","hybrid","unknown"]);
  const allowedViews = new Set(["unknown","full_body","head","dorsal","left_lateral","right_lateral","tail","other"]);
  const allowedChallenge = new Set(["reject","classify","review"]);

  if (!candidateId || !allowedTaxa.has(taxon) || !allowedStages.has(lifeStage) || !allowedColors.has(neonateColor) || !allowedConfidence.has(labelConfidence) || !allowedPurity.has(purityStatus) || !allowedViews.has(viewType) || !allowedChallenge.has(challengeExpectation)) {
    return NextResponse.json({ error: "Invalid promotion metadata." }, { status: 400 });
  }

  const h = restHeaders(identity.token);
  const candidateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}&select=*&limit=1`,
    { headers: h, cache: "no-store" },
  );

  if (!candidateResponse.ok) return NextResponse.json({ error: "Candidate lookup failed." }, { status: 502 });
  const candidates = await candidateResponse.json() as Array<Record<string, unknown>>;
  const candidate = candidates[0];
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  if (candidate.review_status !== "approved") {
    return NextResponse.json({ error: "Approve the candidate before promotion." }, { status: 409 });
  }
  if (candidate.rights_status !== "open_license") {
    return NextResponse.json({ error: "Only staged open-license candidates can use automatic promotion." }, { status: 409 });
  }
  if (candidate.promoted_reference_animal_id) {
    return NextResponse.json({ error: "Candidate has already been promoted.", animal_id: candidate.promoted_reference_animal_id }, { status: 409 });
  }

  const stagedPath = String(candidate.staged_storage_path ?? "");
  const sha256 = String(candidate.staged_content_sha256 ?? "");
  const mime = String(candidate.staged_mime_type ?? "");
  const stagedBytes = Number(candidate.staged_bytes ?? 0);

  if (!stagedPath || !/^[a-f0-9]{64}$/.test(sha256) || !["image/jpeg","image/png","image/webp"].includes(mime)) {
    return NextResponse.json({ error: "Stage the open-license media before promotion." }, { status: 409 });
  }
  if (!Number.isFinite(stagedBytes) || stagedBytes <= 0 || stagedBytes > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Staged media must be 15 MB or smaller before reference promotion." }, { status: 413 });
  }

  const duplicateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?content_sha256=eq.${encodeURIComponent(sha256)}&select=id,animal_id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const duplicateRows = duplicateResponse.ok
    ? await duplicateResponse.json() as Array<{ id: string; animal_id: string }>
    : [];
  if (duplicateRows.length) {
    return NextResponse.json({
      error: "This exact image already exists in the reference library.",
      existing_animal_id: duplicateRows[0].animal_id,
    }, { status: 409 });
  }

  const license = clean(candidate.license, 300);
  const attribution = clean(candidate.attribution, 500);
  const sourceUrl = clean(candidate.source_url, 1000);
  const sourceName = clean(candidate.photographer || candidate.seller_or_observer || candidate.source_type, 160);
  const title = clean(candidate.title, 255);
  const rightsNotes = [
    license ? `Open license: ${license}` : "Open-license acquisition candidate",
    attribution ? `Attribution: ${attribution}` : "",
    sourceUrl ? `Source: ${sourceUrl}` : "",
  ].filter(Boolean).join("\n");

  const animalResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        created_by: identity.user.id,
        animal_code: animalCode || null,
        split_group: splitGroup || null,
        taxon,
        locality: locality || null,
        life_stage: lifeStage,
        neonate_color: neonateColor,
        label_confidence: labelConfidence,
        purity_status: purityStatus,
        source_type: "other",
        source_name: sourceName || null,
        source_url: sourceUrl || null,
        notes: title ? `Promoted from acquisition candidate: ${title}` : "Promoted from acquisition candidate.",
        training_eligible: trainingEligible,
        challenge_eligible: challengeEligible,
        challenge_expectation: challengeExpectation,
        rights_status: "permission_granted",
        rights_notes: rightsNotes || null,
      }),
      cache: "no-store",
    },
  );

  if (!animalResponse.ok) {
    const detail = await animalResponse.text();
    return NextResponse.json({ error: "Could not create reference animal.", detail: detail.slice(0,500) }, { status: 400 });
  }

  const animalRows = await animalResponse.json() as Array<{ id: string }>;
  const animalId = animalRows[0]?.id;
  if (!animalId) return NextResponse.json({ error: "Reference animal was not returned." }, { status: 500 });

  let referencePath = "";
  try {
    const stagedObject = await fetch(
      `${SUPABASE_AUTH_URL}/storage/v1/object/authenticated/snake-sorter-acquisition/${storagePath(stagedPath)}`,
      {
        headers: {
          apikey: SUPABASE_AUTH_KEY,
          Authorization: `Bearer ${identity.token}`,
        },
        cache: "no-store",
      },
    );

    if (!stagedObject.ok) throw new Error("Could not read staged acquisition media.");
    const bytes = Buffer.from(await stagedObject.arrayBuffer());
    if (bytes.length !== stagedBytes) throw new Error("Staged media size changed before promotion.");

    referencePath = `${animalId}/${crypto.randomUUID()}-${safeFileName(title || stagedPath.split("/").pop() || "candidate-image")}`;
    const upload = await fetch(
      `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-reference/${referencePath}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_AUTH_KEY,
          Authorization: `Bearer ${identity.token}`,
          "Content-Type": mime,
          "x-upsert": "false",
        },
        body: bytes,
        cache: "no-store",
      },
    );
    if (!upload.ok) throw new Error("Could not copy staged media into the reference bucket.");

    const mediaResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media`,
      {
        method: "POST",
        headers: {
          ...h,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          animal_id: animalId,
          created_by: identity.user.id,
          storage_path: referencePath,
          original_name: title || "acquisition-candidate-image",
          mime_type: mime,
          content_sha256: sha256,
          file_size_bytes: stagedBytes,
          view_type: viewType,
          quality_status: "accepted",
          is_primary: true,
        }),
        cache: "no-store",
      },
    );
    if (!mediaResponse.ok) throw new Error("Could not create reference-media record.");

    const candidateUpdate = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}`,
      {
        method: "PATCH",
        headers: {
          ...h,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          promoted_reference_animal_id: animalId,
          promoted_at: new Date().toISOString(),
        }),
        cache: "no-store",
      },
    );
    if (!candidateUpdate.ok) throw new Error("Reference was created but candidate promotion tracking failed.");

    return NextResponse.json({ ok: true, animal_id: animalId }, { status: 201 });
  } catch (error) {
    if (referencePath) {
      await fetch(
        `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-reference/${storagePath(referencePath)}`,
        {
          method: "DELETE",
          headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
          cache: "no-store",
        },
      ).catch(() => undefined);
    }
    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?id=eq.${encodeURIComponent(animalId)}`,
      { method: "DELETE", headers: { ...h, Prefer: "return=minimal" }, cache: "no-store" },
    ).catch(() => undefined);

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Promotion failed.",
    }, { status: 500 });
  }
}
