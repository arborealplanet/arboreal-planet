import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { fetchOwnProfile, getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const runtime = "nodejs";

const storageUrl = `${SUPABASE_AUTH_URL}/storage/v1`;
const restHeaders = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 6;

const TAXA = new Set(["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis", "Unknown / review"]);
const STAGES = new Set(["hatchling", "neonate", "juvenile", "subadult", "adult", "unknown"]);
const COLORS = new Set(["red", "yellow", "not_applicable", "unknown"]);
const CONFIDENCE = new Set(["confirmed", "strong", "provisional", "uncertain"]);
const PURITY = new Set(["known_pure", "believed_pure", "possible_mixed", "hybrid", "unknown"]);
const VIEWS = new Set(["unknown", "full_body", "head", "dorsal", "left_lateral", "right_lateral", "tail", "other"]);
const CONTRIBUTION_VIEWS = new Set([...VIEWS, "mixed"]);

function text(value: FormDataEntryValue | unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "contribution";
}

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

type Identity = Awaited<ReturnType<typeof getServerIdentity>>;

async function sorterIdentity(): Promise<(NonNullable<Identity> & { isOwner: boolean }) | null> {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  return { ...identity, isOwner: access.isOwner };
}

async function ownerIdentity(): Promise<(NonNullable<Identity>) | null> {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

async function fetchJson(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...restHeaders(token), ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

type ContributionRow = {
  id: string;
  contributor_user_id: string;
  media_type: "image" | "video";
  storage_path: string;
  original_name: string;
  mime_type: string;
  content_sha256: string;
  file_size_bytes: number;
  status: string;
  taxon_guess: string | null;
  life_stage_guess: string | null;
  view_type_guess: string | null;
  provenance_hint: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  promoted_reference_animal_id: string | null;
  promoted_at: string | null;
  created_at: string;
};

// GET: owner sees everything (optional ?status=), members see their own rows.
export async function GET(request: NextRequest) {
  const identity = await sorterIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const h = restHeaders(identity.token);

  const status = new URL(request.url).searchParams.get("status");
  const statusFilter = status && ["pending_review", "approved", "rejected", "withdrawn"].includes(status)
    ? `&status=eq.${status}` : "";

  const query = identity.isOwner
    ? `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?select=*${statusFilter}&order=created_at.desc&limit=200`
    : `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?contributor_user_id=eq.${encodeURIComponent(identity.user.id)}&select=*&order=created_at.desc&limit=200`;

  const response = await fetch(query, { headers: h, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Contributions unavailable" }, { status: 502 });
  const rows = await response.json() as ContributionRow[];

  const names: Record<string, string> = {};
  if (identity.isOwner && rows.length) {
    const ids = [...new Set(rows.flatMap((row) => [row.contributor_user_id, row.reviewed_by]).filter(Boolean))] as string[];
    const profiles = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ids.map(encodeURIComponent).join(",")})&select=id,display_name,username`,
      { headers: h, cache: "no-store" },
    );
    if (profiles.ok) {
      const list = await profiles.json() as Array<{ id: string; display_name: string | null; username: string | null }>;
      for (const profile of list) names[profile.id] = profile.display_name || profile.username || "Member";
    }
  }

  return NextResponse.json({
    contributions: rows.map((row) => ({
      ...row,
      preview_url: `/api/snake-sorter/contributions/media/${row.id}`,
      contributor_name: names[row.contributor_user_id] ?? null,
      reviewer_name: row.reviewed_by ? names[row.reviewed_by] ?? null : null,
    })),
  });
}

// POST: members (scanner+) upload images/videos. Everything lands as
// pending_review — promotion into the reference library happens only via
// the owner review PATCH below.
export async function POST(request: NextRequest) {
  const identity = await sorterIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });

  const consent = String(form.get("consent") ?? "") === "true";
  if (!consent) {
    return NextResponse.json({ error: "You must grant permission for these media to be used in the Snake Sorter dataset." }, { status: 400 });
  }

  const taxonGuess = text(form.get("taxon_guess"), 80);
  const lifeStageGuess = text(form.get("life_stage_guess"), 30);
  const viewTypeGuess = text(form.get("view_type_guess"), 30);
  const provenanceHint = text(form.get("provenance_hint"), 200);
  const notes = text(form.get("notes"), 2000);
  if (taxonGuess && !TAXA.has(taxonGuess)) return NextResponse.json({ error: "Invalid taxon guess." }, { status: 400 });
  if (lifeStageGuess && !STAGES.has(lifeStageGuess)) return NextResponse.json({ error: "Invalid life stage." }, { status: 400 });
  if (viewTypeGuess && !CONTRIBUTION_VIEWS.has(viewTypeGuess)) return NextResponse.json({ error: "Invalid view type." }, { status: 400 });

  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return NextResponse.json({ error: "Add at least one image or video file." }, { status: 400 });
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: `Upload at most ${MAX_FILES_PER_REQUEST} files per request.` }, { status: 400 });
  }

  const h = restHeaders(identity.token);
  const accepted: Array<{ id: string; name: string; media_type: string }> = [];
  const rejected: Array<{ name: string; reason: string }> = [];

  for (const file of files) {
    const isImage = IMAGE_TYPES.has(file.type);
    const isVideo = VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      rejected.push({ name: file.name, reason: "Use JPEG, PNG, WebP images or MP4/WebM/MOV videos." });
      continue;
    }
    const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > limit) {
      rejected.push({ name: file.name, reason: isImage ? "Image must be 15 MB or smaller." : "Video must be 100 MB or smaller." });
      continue;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    const dup = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?content_sha256=eq.${sha256}&status=in.(pending_review,approved)&select=id,status&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const dupRows = dup.ok ? await dup.json() as Array<{ id: string; status: string }> : [];
    if (dupRows.length) {
      rejected.push({ name: file.name, reason: `This exact file was already contributed (${dupRows[0].status.replace("_", " ")}).` });
      continue;
    }

    const refDup = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?content_sha256=eq.${sha256}&select=id&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const refDupRows = refDup.ok ? await refDup.json() as Array<{ id: string }> : [];
    if (refDupRows.length) {
      rejected.push({ name: file.name, reason: "This exact file is already in the reference library." });
      continue;
    }

    const path = `${identity.user.id}/${randomUUID()}-${safeFileName(file.name)}`;
    const upload = await fetch(`${storageUrl}/object/snake-sorter-contributions/${storagePath(path)}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: bytes,
      cache: "no-store",
    });
    if (!upload.ok) {
      rejected.push({ name: file.name, reason: "Upload storage failed." });
      continue;
    }

    const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        contributor_user_id: identity.user.id,
        media_type: isImage ? "image" : "video",
        storage_path: path,
        original_name: file.name.slice(0, 255),
        mime_type: file.type,
        content_sha256: sha256,
        file_size_bytes: file.size,
        status: "pending_review",
        taxon_guess: taxonGuess || null,
        life_stage_guess: lifeStageGuess || null,
        view_type_guess: viewTypeGuess || null,
        provenance_hint: provenanceHint || null,
        notes: notes || null,
      }),
      cache: "no-store",
    });
    if (!insert.ok) {
      await fetch(`${storageUrl}/object/snake-sorter-contributions/${storagePath(path)}`, {
        method: "DELETE",
        headers: restHeaders(identity.token),
        cache: "no-store",
      }).catch(() => undefined);
      const detail = await insert.text().catch(() => "");
      rejected.push({ name: file.name, reason: detail.slice(0, 160) || "Could not record contribution." });
      continue;
    }

    const rows = await insert.json() as ContributionRow[];
    accepted.push({ id: rows[0]?.id ?? "", name: file.name, media_type: isImage ? "image" : "video" });
  }

  return NextResponse.json({ ok: true, accepted, rejected }, { status: accepted.length ? 201 : 400 });
}

type ReviewBody = {
  id?: unknown;
  action?: unknown;
  review_notes?: unknown;
  animal_id?: unknown;
  taxon?: unknown;
  locality?: unknown;
  life_stage?: unknown;
  neonate_color?: unknown;
  view_type?: unknown;
  label_confidence?: unknown;
  purity_status?: unknown;
  training_eligible?: unknown;
};

// PATCH: owner reviews. approve promotes image(s) into the reference
// library; video originals stay in the contributions bucket, labeled and
// linked to the new/existing reference animal for future frame extraction.
export async function PATCH(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as ReviewBody;

  const id = text(body.id, 100);
  const action = String(body.action ?? "");

  // Members may withdraw their own pending contributions via a dedicated
  // RPC (atomic: the pending check and the status flip happen together).
  if (action === "withdraw") {
    const memberIdentity = await sorterIdentity();
    if (!memberIdentity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
    }
    const withdrawn = await fetchJson(
      `${SUPABASE_AUTH_URL}/rest/v1/rpc/withdraw_snake_sorter_contribution`,
      memberIdentity.token,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_contribution_id: id }),
      },
    );
    if (!withdrawn.ok) return NextResponse.json({ error: "Could not withdraw contribution." }, { status: 502 });
    if (withdrawn.data !== true) {
      return NextResponse.json({ error: "Only your pending contributions can be withdrawn." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: "withdrawn" });
  }

  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  const h = restHeaders(identity.token);
  const now = new Date().toISOString();

  const lookup = await fetchJson(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    identity.token,
  );
  const row = (lookup.data as ContributionRow[] | null)?.[0];
  if (!row) return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (row.status !== "pending_review") {
    return NextResponse.json({ error: `Contribution is already ${row.status.replace("_", " ")}.` }, { status: 409 });
  }

  const reviewNotes = text(body.review_notes, 2000);

  if (action === "reject") {
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ status: "rejected", reviewed_by: identity.user.id, reviewed_at: now, review_notes: reviewNotes || null, updated_at: now }),
      cache: "no-store",
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // ---- approve ----
  const taxon = text(body.taxon, 80);
  const lifeStage = text(body.life_stage, 30) || "unknown";
  const neonateColor = text(body.neonate_color, 30) || "unknown";
  const viewType = text(body.view_type, 30) || row.view_type_guess || "unknown";
  const locality = text(body.locality, 100);
  const labelConfidence = text(body.label_confidence, 30) || "provisional";
  const purityStatus = text(body.purity_status, 30) || "unknown";
  const trainingEligible = body.training_eligible !== false;
  const requestedAnimalId = text(body.animal_id, 100);

  if (!TAXA.has(taxon) || !STAGES.has(lifeStage) || !COLORS.has(neonateColor) ||
      !VIEWS.has(viewType) || !CONFIDENCE.has(labelConfidence) || !PURITY.has(purityStatus)) {
    return NextResponse.json({ error: "Invalid approval labels." }, { status: 400 });
  }

  // Resolve or create the reference animal.
  let animalId = "";
  let createdAnimal = false;
  let createdMediaId: string | null = null;
  let createdMediaPath: string | null = null;

  // Undo anything the approve created, so a failed approval never leaves a
  // zero-image animal or orphaned media row behind for a retry to trip over.
  async function rollbackApprove() {
    if (createdMediaPath) {
      await fetch(`${storageUrl}/object/snake-sorter-reference/${storagePath(createdMediaPath)}`, {
        method: "DELETE", headers: h, cache: "no-store",
      }).catch(() => undefined);
      createdMediaPath = null;
    }
    if (createdMediaId) {
      await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?id=eq.${encodeURIComponent(createdMediaId)}`,
        { method: "DELETE", headers: h, cache: "no-store" },
      ).catch(() => undefined);
      createdMediaId = null;
    }
    if (createdAnimal && animalId) {
      await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?id=eq.${encodeURIComponent(animalId)}`,
        { method: "DELETE", headers: h, cache: "no-store" },
      ).catch(() => undefined);
      createdAnimal = false;
      animalId = "";
    }
  }

  // Images: refuse duplicates before anything is created.
  if (row.media_type === "image") {
    const duplicate = await fetchJson(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?content_sha256=eq.${row.content_sha256}&select=id&limit=1`,
      identity.token,
    );
    if ((duplicate.data as Array<{ id: string }> | null)?.length) {
      return NextResponse.json({ error: "This image already exists in the reference library." }, { status: 409 });
    }
  }

  if (requestedAnimalId) {
    if (!/^[0-9a-f-]{36}$/i.test(requestedAnimalId)) {
      return NextResponse.json({ error: "Invalid reference animal." }, { status: 400 });
    }
    const animalLookup = await fetchJson(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?id=eq.${encodeURIComponent(requestedAnimalId)}&select=id,life_stage&limit=1`,
      identity.token,
    );
    const animal = (animalLookup.data as Array<{ id: string; life_stage?: string }> | null)?.[0];
    if (!animal) return NextResponse.json({ error: "Reference animal not found." }, { status: 404 });
    animalId = animal.id;
  } else {
    const contributor = await fetchJson(
      `${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(row.contributor_user_id)}&select=display_name,username&limit=1`,
      identity.token,
    );
    const profile = (contributor.data as Array<{ display_name: string | null; username: string | null }> | null)?.[0];
    const contributorName = profile?.display_name || profile?.username || "Member";

    const trainingStrongEnough =
      taxon !== "Unknown / review" &&
      Boolean(locality) &&
      ["confirmed", "strong"].includes(labelConfidence) &&
      ["known_pure", "believed_pure"].includes(purityStatus);

    const animalResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        created_by: identity.user.id,
        animal_code: `CONTRIB-${row.id.slice(0, 8).toUpperCase()}`,
        taxon,
        locality: locality || null,
        life_stage: lifeStage,
        neonate_color: neonateColor,
        label_confidence: labelConfidence,
        purity_status: purityStatus,
        source_type: "other",
        source_name: `Member contribution (${contributorName})`,
        notes: [
          row.notes ? `Contributor notes: ${row.notes}` : "",
          row.provenance_hint ? `Provenance hint: ${row.provenance_hint}` : "",
          reviewNotes ? `Review: ${reviewNotes}` : "",
        ].filter(Boolean).join("\n") || null,
        training_eligible: trainingEligible && trainingStrongEnough,
        rights_status: "permission_granted",
        rights_notes: `Member granted dataset use on upload (${row.created_at}). Original contribution id ${row.id}.`,
        locality_evidence: "unknown",
        provenance_confidence: "uncertain",
        origin_status: "unknown",
        sex: "unknown",
      }),
      cache: "no-store",
    });
    if (!animalResponse.ok) {
      const detail = await animalResponse.text().catch(() => "");
      return NextResponse.json({ error: "Could not create reference animal.", detail: detail.slice(0, 300) }, { status: 400 });
    }
    const animalRows = await animalResponse.json() as Array<{ id: string }>;
    animalId = animalRows[0]?.id ?? "";
    if (!animalId) return NextResponse.json({ error: "Reference animal was not returned." }, { status: 500 });
    createdAnimal = true;
  }

  // Images: copy bytes into the reference bucket and register reference media.
  if (row.media_type === "image") {
    const sourceObject = await fetch(
      `${storageUrl}/object/authenticated/snake-sorter-contributions/${storagePath(row.storage_path)}`,
      { headers: h, cache: "no-store" },
    );
    if (!sourceObject.ok) {
      await rollbackApprove();
      return NextResponse.json({ error: "Could not read contributed media." }, { status: 502 });
    }
    const bytes = Buffer.from(await sourceObject.arrayBuffer());

    const destPath = `${animalId}/${randomUUID()}-${safeFileName(row.original_name)}`;
    const upload = await fetch(`${storageUrl}/object/snake-sorter-reference/${storagePath(destPath)}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": row.mime_type,
        "x-upsert": "false",
      },
      body: bytes,
      cache: "no-store",
    });
    if (!upload.ok) {
      await rollbackApprove();
      return NextResponse.json({ error: "Could not copy image into the reference library." }, { status: 502 });
    }

    const mediaInsert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        animal_id: animalId,
        created_by: identity.user.id,
        storage_path: destPath,
        original_name: row.original_name.slice(0, 255),
        mime_type: row.mime_type,
        content_sha256: row.content_sha256,
        file_size_bytes: row.file_size_bytes,
        view_type: viewType,
      }),
      cache: "no-store",
    });
    if (!mediaInsert.ok) {
      await fetch(`${storageUrl}/object/snake-sorter-reference/${storagePath(destPath)}`, {
        method: "DELETE", headers: h, cache: "no-store",
      }).catch(() => undefined);
      await rollbackApprove();
      return NextResponse.json({ error: "Could not register reference media." }, { status: 502 });
    }
    const mediaRows = await mediaInsert.json().catch(() => []) as Array<{ id: string }>;
    createdMediaId = mediaRows[0]?.id ?? null;
    createdMediaPath = destPath;
  }

  const approved = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "approved",
      reviewed_by: identity.user.id,
      reviewed_at: now,
      review_notes: reviewNotes || null,
      promoted_reference_animal_id: animalId,
      promoted_at: now,
      updated_at: now,
    }),
    cache: "no-store",
  });
  if (!approved.ok) {
    await rollbackApprove();
    return NextResponse.json({ error: "Approval could not be recorded. Nothing was promoted." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: "approved", reference_animal_id: animalId });
}

// DELETE: owner purges a contribution (bytes + row).
export async function DELETE(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid contribution." }, { status: 400 });
  const h = restHeaders(identity.token);

  const lookup = await fetchJson(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(id)}&select=storage_path&limit=1`,
    identity.token,
  );
  const row = (lookup.data as Array<{ storage_path: string }> | null)?.[0];
  if (!row) return NextResponse.json({ error: "Contribution not found." }, { status: 404 });

  await fetch(`${storageUrl}/object/snake-sorter-contributions/${storagePath(row.storage_path)}`, {
    method: "DELETE", headers: h, cache: "no-store",
  }).catch(() => undefined);
  await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE", headers: h, cache: "no-store",
  });
  return NextResponse.json({ ok: true });
}
