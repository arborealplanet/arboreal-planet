import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

const reviewStatuses = new Set(["unreviewed","cleared","permission_required","restricted"]);
const mediaRights = new Set(["open_license","permission_required","permission_granted","metadata_only","unknown"]);

export async function PATCH(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const candidateId = String(body.candidate_id ?? "").trim();
  const rightsReviewStatus = String(body.rights_review_status ?? "").trim();
  const mediaRightsStatus = String(body.media_rights_status ?? "").trim();

  if (!candidateId || !reviewStatuses.has(rightsReviewStatus) || !mediaRights.has(mediaRightsStatus)) {
    return NextResponse.json({ error: "Invalid rights review update." }, { status: 400 });
  }

  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const candidateUpdate = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({
        rights_review_status: rightsReviewStatus,
        acquisition_stage: rightsReviewStatus === "cleared" ? "rights_cleared" : "biologically_approved",
      }),
      cache: "no-store",
    },
  );
  if (!candidateUpdate.ok) return NextResponse.json({ error: "Could not update candidate rights review." }, { status: 400 });

  const mediaUpdate = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({
        rights_status: mediaRightsStatus,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );
  if (!mediaUpdate.ok) return NextResponse.json({ error: "Candidate updated, but image rights status could not be updated." }, { status: 502 });

  return NextResponse.json({ ok: true });
}
