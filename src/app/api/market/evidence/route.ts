import { NextResponse } from "next/server";
import { supabasePublicFetch } from "@/lib/supabase-public";

type EvidenceRow = {
  id: string;
  label: string;
  observation_kind: "CURRENT_ASKING" | "SOLD_LISTING" | "CONFIRMED_SALE";
  captured_at: string;
  source_scope: string | null;
  raw_count: number | null;
  eligible_count: number | null;
  notes: string | null;
  source_name: string | null;
  region: string | null;
};

export async function GET() {
  try {
    const rows = await supabasePublicFetch<EvidenceRow[]>(
      "market_evidence_inventory?select=id,label,observation_kind,captured_at,source_scope,raw_count,eligible_count,notes,source_name,region&order=captured_at.desc"
    );

    const current = rows.find((row) => row.observation_kind === "CURRENT_ASKING") ?? null;
    const sold = rows.find((row) => row.observation_kind === "SOLD_LISTING") ?? null;

    return NextResponse.json({
      source: "supabase",
      current,
      sold,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      { source: "supabase", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}
