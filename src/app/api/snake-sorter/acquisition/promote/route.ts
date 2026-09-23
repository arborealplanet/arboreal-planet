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

type AcquisitionMedia = {
  id: string;
  staged_storage_path: string | null;
  staged_content_sha256: string | null;
  staged_mime_type: string | null;
  staged_bytes: number | null;
  view_type: string | null;
  review_status: string;
  quality_status: string;
  rights_status: string;
  media_order: number;
  source_media_url: string | null;
  perceptual_hash: string | null;
  source_capture_kind: string | null;
};

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
  const fallbackViewType = clean(body.view_type, 30) || "unknown";
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

  if (!candidateId || !allowedTaxa.has(taxon) || !allowedStages.has(lifeStage) || !allowedColors.has(neonateColor) || !allowedConfidence.has(labelConfidence) || !allowedPurity.has(purityStatus) || !allowedViews.has(fallbackViewType) || !allowedChallenge.has(challengeExpectation)) {
    return NextResponse.json({ error: "Invalid promotion metadata." }, { status: 400 });
  }

  const localityLower = locality.toLowerCase();
  const isNeonateStage = lifeStage === "hatchling" || lifeStage === "neonate";
  if (localityLower === "kofiau" && isNeonateStage && neonateColor === "red") {
    return NextResponse.json({
      error: "Kofiau neonates are yellow-only in the Snake Sorter locality rules. Recheck the locality or color label before promotion.",
    }, { status: 409 });
  }

  const trainingMetadataStrongEnough =
    taxon !== "Unknown / review" &&
    Boolean(locality) &&
    ["confirmed","strong"].includes(labelConfidence) &&
    ["known_pure","believed_pure"].includes(purityStatus) &&
    !challengeEligible;
  const effectiveTrainingEligible = trainingEligible && trainingMetadataStrongEnough;

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
    return NextResponse.json({ error: "Approve the animal candidate before promotion." }, { status: 409 });
  }
  if (candidate.promoted_reference_animal_id) {
    return NextResponse.json({ error: "Candidate has already been promoted.", animal_id: candidate.promoted_reference_animal_id }, { status: 409 });
  }

  const mediaResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(candidateId)}&select=*&order=media_order.asc`,
    { headers: h, cache: "no-store" },
  );
  const childMedia = mediaResponse.ok ? await mediaResponse.json() as AcquisitionMedia[] : [];

  let promotableMedia = childMedia.filter((media) =>
    media.review_status === "accepted" &&
    media.quality_status === "accepted" &&
    Boolean(media.staged_storage_path) &&
    ["open_license","permission_granted"].includes(media.rights_status)
  );

  if (!promotableMedia.length) {
    const stagedPath = String(candidate.staged_storage_path ?? "");
    const sha256 = String(candidate.staged_content_sha256 ?? "");
    const mime = String(candidate.staged_mime_type ?? "");
    const stagedBytes = Number(candidate.staged_bytes ?? 0);
    if (
      candidate.rights_status === "open_license" &&
      stagedPath &&
      /^[a-f0-9]{64}$/.test(sha256) &&
      ["image/jpeg","image/png","image/webp"].includes(mime) &&
      Number.isFinite(stagedBytes) &&
      stagedBytes > 0 &&
      stagedBytes <= 15 * 1024 * 1024
    ) {
      promotableMedia = [{
        id: "legacy",
        staged_storage_path: stagedPath,
        staged_content_sha256: sha256,
        staged_mime_type: mime,
        staged_bytes: stagedBytes,
        view_type: fallbackViewType,
        review_status: "accepted",
        quality_status: "accepted",
        rights_status: "open_license",
        media_order: 0,
        source_media_url: String(candidate.media_url ?? candidate.thumbnail_url ?? "") || null,
        perceptual_hash: null,
        source_capture_kind: "legacy",
      }];
    }
  }

  if (!promotableMedia.length) {
    return NextResponse.json({
      error: "No approved, staged images with cleared rights are ready for reference promotion.",
    }, { status: 409 });
  }

  for (const media of promotableMedia) {
    const sha = String(media.staged_content_sha256 ?? "");
    const mime = String(media.staged_mime_type ?? "");
    const bytes = Number(media.staged_bytes ?? 0);
    if (!media.staged_storage_path || !/^[a-f0-9]{64}$/.test(sha) || !["image/jpeg","image/png","image/webp"].includes(mime) || !Number.isFinite(bytes) || bytes <= 0 || bytes > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "One or more approved candidate images are not valid staged media." }, { status: 409 });
    }
  }

  const hashes = promotableMedia.map((media) => media.staged_content_sha256).filter(Boolean) as string[];
  if (hashes.length) {
    const duplicateResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?content_sha256=in.(${hashes.map(encodeURIComponent).join(",")})&select=id,animal_id,content_sha256`,
      { headers: h, cache: "no-store" },
    );
    const duplicateRows = duplicateResponse.ok
      ? await duplicateResponse.json() as Array<{ id: string; animal_id: string; content_sha256: string }>
      : [];
    if (duplicateRows.length) {
      return NextResponse.json({
        error: "At least one selected image already exists in the reference library.",
        existing_animal_id: duplicateRows[0].animal_id,
      }, { status: 409 });
    }
  }

  const license = clean(candidate.license, 300);
  const attribution = clean(candidate.attribution, 500);
  const sourceUrl = clean(candidate.source_url, 1000);
  const sourceName = clean(candidate.photographer || candidate.seller_or_observer || candidate.source_type, 160);
  const title = clean(candidate.title, 255);
  const sourceType = candidate.source_type === "morphmarket" ? "listing" : "other";
  const localityEvidence =
    candidate.source_type === "morphmarket" ? "seller_listed" :
    candidate.source_type === "smithsonian" ? "museum_record" :
    candidate.source_type === "wikimedia" ? "publication" :
    "unknown";
  const sellerClaimedLocality = clean(candidate.provisional_locality || candidate.locality_raw, 120);
  const acquisitionRightsNote = clean(candidate.rights_review_note, 1200);
  const promotedRightsStatus = promotableMedia.every((media) => media.rights_status === "open_license")
    ? "open_license"
    : "permission_granted";
  const rightsNotes = [
    acquisitionRightsNote ? `Acquisition rights review: ${acquisitionRightsNote}` : "",
    license ? `License: ${license}` : "",
    attribution ? `Attribution: ${attribution}` : "",
    sourceUrl ? `Source: ${sourceUrl}` : "",
    `Promoted image count: ${promotableMedia.length}`,
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
        source_type: sourceType,
        source_name: sourceName || null,
        source_url: sourceUrl || null,
        locality_evidence: localityEvidence,
        provenance_confidence: labelConfidence,
        notes: [
          title ? `Promoted from acquisition candidate: ${title}` : "Promoted from acquisition candidate.",
          sellerClaimedLocality ? `Source locality claim: ${sellerClaimedLocality}` : "",
          locality && sellerClaimedLocality && locality !== sellerClaimedLocality ? `Reviewed locality: ${locality}` : "",
        ].filter(Boolean).join("\n"),
        training_eligible: effectiveTrainingEligible,
        challenge_eligible: challengeEligible,
        challenge_expectation: challengeExpectation,
        rights_status: promotedRightsStatus,
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

  const createdReferencePaths: string[] = [];
  try {
    let promotedCount = 0;

    for (const [index, media] of promotableMedia.entries()) {
      const stagedPath = media.staged_storage_path!;
      const mime = media.staged_mime_type!;
      const sha256 = media.staged_content_sha256!;
      const stagedBytes = Number(media.staged_bytes);

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
      if (!stagedObject.ok) throw new Error("Could not read an approved acquisition image.");

      const bytes = Buffer.from(await stagedObject.arrayBuffer());
      if (bytes.length !== stagedBytes) throw new Error("An acquisition image changed before promotion.");

      const sourceNameForFile = stagedPath.split("/").pop() || `candidate-image-${index + 1}`;
      const referencePath = `${animalId}/${String(index).padStart(2,"0")}-${crypto.randomUUID()}-${safeFileName(sourceNameForFile)}`;
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
      if (!upload.ok) throw new Error("Could not copy an approved image into the reference bucket.");
      createdReferencePaths.push(referencePath);

      const referenceMediaResponse = await fetch(
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
            original_name: sourceNameForFile,
            mime_type: mime,
            content_sha256: sha256,
            perceptual_hash: media.perceptual_hash || null,
            source_capture_kind: media.source_capture_kind || "screenshot",
            file_size_bytes: stagedBytes,
            view_type: allowedViews.has(media.view_type || "") ? media.view_type : fallbackViewType,
            quality_status: "accepted",
            is_primary: index === 0,
            notes: media.source_media_url ? `Acquisition source image: ${media.source_media_url}` : null,
          }),
          cache: "no-store",
        },
      );
      if (!referenceMediaResponse.ok) throw new Error("Could not create a reference-media record.");
      promotedCount += 1;
    }

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
          acquisition_stage: "reference_promoted",
        }),
        cache: "no-store",
      },
    );
    if (!candidateUpdate.ok) throw new Error("Reference was created but candidate promotion tracking failed.");

    return NextResponse.json({
      ok: true,
      animal_id: animalId,
      promoted_media: promotedCount,
      training_eligible: effectiveTrainingEligible,
      training_downgraded: trainingEligible && !effectiveTrainingEligible,
      rights_status: promotedRightsStatus,
    }, { status: 201 });
  } catch (error) {
    for (const referencePath of createdReferencePaths) {
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
