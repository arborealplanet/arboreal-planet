import { createHash } from "node:crypto";
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

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_dataset_snapshots?finalized=eq.true&select=*&order=created_at.desc&limit=20`,
    { headers: h(identity.token), cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Snapshot registry unavailable" }, { status: 502 });
  return NextResponse.json({ snapshots: await response.json() });
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requestedName = clean(body.name, 120);
  const notes = clean(body.notes, 2000);
  const purpose = clean(body.purpose, 30) || "classifier";
  if (!["classifier","challenge"].includes(purpose)) {
    return NextResponse.json({ error: "Invalid snapshot purpose." }, { status: 400 });
  }

  const classifierFilter = "review_status=eq.approved&training_eligible=eq.true&rights_status=in.(owned_by_owner,permission_granted,private_reference_only)&label_confidence=in.(confirmed,strong)&purity_status=in.(known_pure,believed_pure)&taxon=in.(Morelia azurea azurea,Morelia azurea pulcher,Morelia azurea utaraensis,Morelia viridis)";
  const challengeFilter = "review_status=eq.approved&challenge_eligible=eq.true&rights_status=in.(owned_by_owner,permission_granted,private_reference_only)";
  const animalFilter = purpose === "challenge" ? challengeFilter : classifierFilter;

  const [animalsResponse, mediaResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?${animalFilter}&select=*&order=id.asc`, {
      headers: h(identity.token),
      cache: "no-store",
    }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?quality_status=eq.accepted&select=id,animal_id,storage_path,original_name,mime_type,content_sha256,view_type,is_primary,life_stage_override,neonate_color_override,capture_date,approximate_age_days,metadata:notes&order=id.asc`, {
      headers: h(identity.token),
      cache: "no-store",
    }),
  ]);

  if (!animalsResponse.ok || !mediaResponse.ok) {
    return NextResponse.json({ error: "Could not prepare dataset snapshot" }, { status: 502 });
  }

  const animals = await animalsResponse.json() as Array<Record<string, unknown>>;
  const media = await mediaResponse.json() as Array<Record<string, unknown>>;
  if (!animals.length) return NextResponse.json({
    error: purpose === "challenge"
      ? "No approved challenge/OOD animals are ready for a snapshot."
      : "No approved training animals are ready for a snapshot."
  }, { status: 409 });

  const unassigned = purpose === "classifier"
    ? animals.filter((animal) => !animal.dataset_split || animal.dataset_split === "unassigned")
    : [];
  if (unassigned.length) {
    return NextResponse.json({
      error: "Assign train/validation/test splits before creating a snapshot.",
      unassigned_animals: unassigned.length,
    }, { status: 409 });
  }

  const relatedGroups = new Map<string, { taxa: Set<string>; splits: Set<string>; animals: string[] }>();
  for (const animal of animals) {
    const group = String(animal.split_group ?? "").trim();
    if (!group) continue;
    const entry = relatedGroups.get(group) ?? { taxa: new Set<string>(), splits: new Set<string>(), animals: [] };
    entry.taxa.add(String(animal.taxon));
    entry.splits.add(String(animal.dataset_split));
    entry.animals.push(String(animal.id));
    relatedGroups.set(group, entry);
  }

  const crossTaxonGroup = purpose === "classifier"
    ? [...relatedGroups.entries()].find(([, entry]) => entry.taxa.size > 1)
    : undefined;
  if (crossTaxonGroup) {
    return NextResponse.json({
      error: "A related / split group is reused across multiple taxa. Give unrelated taxon groups different names before snapshotting.",
      split_group: crossTaxonGroup[0],
    }, { status: 409 });
  }

  const leakingGroup = purpose === "classifier"
    ? [...relatedGroups.entries()].find(([, entry]) => entry.splits.size > 1)
    : undefined;
  if (leakingGroup) {
    return NextResponse.json({
      error: "A related / split group spans multiple dataset splits. Re-run auto-assign or correct the split before snapshotting.",
      split_group: leakingGroup[0],
      animals: leakingGroup[1].animals.length,
    }, { status: 409 });
  }

  if (purpose === "challenge") {
    const challengeGroupExpectations = new Map<string, Set<string>>();
    for (const animal of animals) {
      const group = String(animal.split_group ?? "").trim();
      if (!group) continue;
      const expectations = challengeGroupExpectations.get(group) ?? new Set<string>();
      expectations.add(String(animal.challenge_expectation ?? "review"));
      challengeGroupExpectations.set(group, expectations);
    }
    const conflictingExpectation = [...challengeGroupExpectations.entries()]
      .find(([, expectations]) => expectations.size > 1);
    if (conflictingExpectation) {
      return NextResponse.json({
        error: "A related challenge group has conflicting expected behaviors. Keep each related group consistently Reject, Classify, or Review.",
        split_group: conflictingExpectation[0],
      }, { status: 409 });
    }
  }

  const animalMap = new Map(animals.map((animal) => [String(animal.id), animal]));
  const rows = media.flatMap((item) => {
    const animal = animalMap.get(String(item.animal_id));
    if (!animal) return [];
    return [{
      media_id: String(item.id),
      animal_id: String(animal.id),
      storage_path: item.storage_path ? String(item.storage_path) : null,
      original_name: item.original_name ? String(item.original_name) : null,
      mime_type: item.mime_type ? String(item.mime_type) : null,
      content_sha256: item.content_sha256 ? String(item.content_sha256) : null,
      taxon: String(animal.taxon),
      locality: animal.locality ? String(animal.locality) : null,
      life_stage: String(animal.life_stage),
      life_stage_override: item.life_stage_override ? String(item.life_stage_override) : null,
      neonate_color: String(animal.neonate_color),
      neonate_color_override: item.neonate_color_override ? String(item.neonate_color_override) : null,
      capture_date: item.capture_date ? String(item.capture_date) : null,
      approximate_age_days: item.approximate_age_days == null ? null : Number(item.approximate_age_days),
      label_confidence: String(animal.label_confidence),
      purity_status: String(animal.purity_status),
      challenge_expectation: purpose === "challenge" ? String(animal.challenge_expectation ?? "review") : null,
      split_group: animal.split_group ? String(animal.split_group) : null,
      dataset_split: purpose === "challenge" ? "challenge" : String(animal.dataset_split),
      view_type: String(item.view_type ?? "unknown"),
      is_primary: Boolean(item.is_primary),
      source_type: animal.source_type ? String(animal.source_type) : null,
      source_name: animal.source_name ? String(animal.source_name) : null,
      rights_status: animal.rights_status ? String(animal.rights_status) : null,
      metadata: {
        animal_code: animal.animal_code ?? null,
        rights_notes: animal.rights_notes ?? null,
        review_notes: animal.review_notes ?? null,
        media_notes: item.metadata ?? null,
      },
    }];
  });

  if (!rows.length) return NextResponse.json({ error: "No accepted reference images are ready for a snapshot." }, { status: 409 });

  const incompleteObjects = rows.filter((row) => !row.storage_path || !row.content_sha256);
  if (incompleteObjects.length) {
    return NextResponse.json({
      error: "Every snapshot image needs a frozen storage path and SHA-256 before snapshotting.",
      incomplete_media: incompleteObjects.length,
    }, { status: 409 });
  }

  const animalIdsWithMedia = new Set(rows.map((row) => row.animal_id));
  const animalsWithoutAcceptedMedia = animals.filter((animal) => !animalIdsWithMedia.has(String(animal.id)));
  if (animalsWithoutAcceptedMedia.length) {
    return NextResponse.json({
      error: "Every approved training animal needs at least one accepted image before snapshotting.",
      animals_without_accepted_media: animalsWithoutAcceptedMedia.length,
    }, { status: 409 });
  }

  const canonical = JSON.stringify(rows);
  const manifestSha256 = createHash("sha256").update(canonical).digest("hex");
  const name = requestedName || `Snake Sorter ${purpose} dataset ${new Date().toISOString().slice(0, 10)}`;

  const snapshotResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_dataset_snapshots`, {
    method: "POST",
    headers: {
      ...h(identity.token),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name,
      purpose,
      manifest_sha256: manifestSha256,
      animal_count: animalIdsWithMedia.size,
      media_count: rows.length,
      notes: notes || null,
      created_by: identity.user.id,
    }),
    cache: "no-store",
  });

  if (!snapshotResponse.ok) {
    const detail = await snapshotResponse.text();
    if (detail.includes("duplicate key")) {
      return NextResponse.json({ error: "This exact dataset snapshot already exists.", manifest_sha256: manifestSha256 }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create dataset snapshot", detail: detail.slice(0,500) }, { status: 400 });
  }

  const snapshots = await snapshotResponse.json() as Array<{ id: string }>;
  const snapshot = snapshots[0];
  if (!snapshot?.id) return NextResponse.json({ error: "Snapshot record was not returned" }, { status: 500 });

  const itemHeaders = {
    ...h(identity.token),
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  for (let offset = 0; offset < rows.length; offset += 300) {
    const batch = rows.slice(offset, offset + 300).map((row) => ({ snapshot_id: snapshot.id, ...row }));
    const itemResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_dataset_snapshot_items`, {
      method: "POST",
      headers: itemHeaders,
      body: JSON.stringify(batch),
      cache: "no-store",
    });
    if (!itemResponse.ok) {
      await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_dataset_snapshots?id=eq.${encodeURIComponent(snapshot.id)}`, {
        method: "DELETE",
        headers: h(identity.token),
        cache: "no-store",
      }).catch(() => undefined);
      return NextResponse.json({ error: "Could not freeze snapshot items" }, { status: 500 });
    }
  }

  const finalizeResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_dataset_snapshots?id=eq.${encodeURIComponent(snapshot.id)}`,
    {
      method: "PATCH",
      headers: {
        ...h(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ finalized: true }),
      cache: "no-store",
    }
  );

  if (!finalizeResponse.ok) {
    const detail = await finalizeResponse.text();
    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_dataset_snapshots?id=eq.${encodeURIComponent(snapshot.id)}`,
      {
        method: "DELETE",
        headers: h(identity.token),
        cache: "no-store",
      }
    ).catch(() => undefined);
    return NextResponse.json({
      error: "Snapshot rows were created but finalization failed.",
      detail: detail.slice(0, 500),
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    snapshot_id: snapshot.id,
    manifest_sha256: manifestSha256,
    animal_count: animalIdsWithMedia.size,
    media_count: rows.length,
    finalized: true,
    purpose,
  }, { status: 201 });
}
