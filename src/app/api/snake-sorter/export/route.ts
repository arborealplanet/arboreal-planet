import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headers = (token: string) => ({ apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" });
async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}
function csv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [animalsResponse, mediaResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?review_status=eq.approved&training_eligible=eq.true&rights_status=in.(owned_by_owner,permission_granted,private_reference_only)&select=*&order=taxon.asc,locality.asc,created_at.asc`, { headers: headers(identity.token), cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?quality_status=eq.accepted&select=id,animal_id,storage_path,original_name,mime_type,view_type,is_primary,quality_status,life_stage_override,neonate_color_override,capture_date,approximate_age_days,created_at&order=created_at.asc`, { headers: headers(identity.token), cache: "no-store" }),
  ]);
  if (!animalsResponse.ok || !mediaResponse.ok) return NextResponse.json({ error: "Dataset export unavailable" }, { status: 502 });

  const animals = await animalsResponse.json() as Array<Record<string, unknown>>;
  const media = await mediaResponse.json() as Array<Record<string, unknown>>;
  const byAnimal = new Map(animals.map((animal) => [String(animal.id), animal]));
  const rows = media.flatMap((item) => {
    const animal = byAnimal.get(String(item.animal_id));
    if (!animal) return [];
    return [{
      animal_id: animal.id,
      animal_code: animal.animal_code,
      media_id: item.id,
      storage_path: item.storage_path,
      original_name: item.original_name,
      mime_type: item.mime_type,
      view_type: item.view_type,
      is_primary: item.is_primary,
      quality_status: item.quality_status,
      taxon: animal.taxon,
      locality: animal.locality,
      life_stage: animal.life_stage,
      life_stage_override: item.life_stage_override,
      neonate_color: animal.neonate_color,
      neonate_color_override: item.neonate_color_override,
      capture_date: item.capture_date,
      approximate_age_days: item.approximate_age_days,
      label_confidence: animal.label_confidence,
      purity_status: animal.purity_status,
      split_group: animal.split_group,
      dataset_split: animal.dataset_split,
      source_type: animal.source_type,
      source_name: animal.source_name,
      review_notes: animal.review_notes,
      rights_status: animal.rights_status,
      rights_notes: animal.rights_notes,
    }];
  });

  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    return new NextResponse(JSON.stringify({ generated_at: new Date().toISOString(), animals: animals.length, media: rows.length, rows }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="snake-sorter-manifest-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const columns = ["animal_id","animal_code","media_id","storage_path","original_name","mime_type","view_type","is_primary","quality_status","taxon","locality","life_stage","life_stage_override","neonate_color","neonate_color_override","capture_date","approximate_age_days","label_confidence","purity_status","split_group","dataset_split","source_type","source_name","review_notes","rights_status","rights_notes"];
  const body = [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column as keyof typeof row])).join(","))].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="snake-sorter-manifest-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
