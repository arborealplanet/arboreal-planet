import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headers = (token: string) => ({ apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" });

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

type Run = {
  status: string;
  error_code: string | null;
  result_taxon: string | null;
  result_confidence: number | null;
  request_duration_ms: number | null;
  inference_duration_ms: number | null;
  scan_mode: string;
  created_at: string;
};

function percentile(values: number[], fraction: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function summarize(rows: Run[]) {
  const completed = rows.filter((row) => row.status === "completed");
  const errors = rows.filter((row) => row.status === "error");
  const rejected = completed.filter((row) => row.result_taxon === "Unknown / review");
  const requestDurations = rows.map((row) => row.request_duration_ms).filter((v): v is number => typeof v === "number");
  const inferenceDurations = rows.map((row) => row.inference_duration_ms).filter((v): v is number => typeof v === "number");
  const errorCodes: Record<string, number> = {};
  for (const row of errors) {
    const code = row.error_code || "unknown_error";
    errorCodes[code] = (errorCodes[code] || 0) + 1;
  }
  return {
    total: rows.length,
    completed: completed.length,
    errors: errors.length,
    rejected: rejected.length,
    success_rate: rows.length ? completed.length / rows.length : null,
    rejection_rate: completed.length ? rejected.length / completed.length : null,
    request_p50_ms: percentile(requestDurations, 0.50),
    request_p95_ms: percentile(requestDurations, 0.95),
    inference_p50_ms: percentile(inferenceDurations, 0.50),
    inference_p95_ms: percentile(inferenceDurations, 0.95),
    error_codes: errorCodes,
  };
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_analysis_runs?created_at=gte.${encodeURIComponent(since)}&select=status,error_code,result_taxon,result_confidence,request_duration_ms,inference_duration_ms,scan_mode,created_at&order=created_at.desc&limit=5000`,
    { headers: headers(identity.token), cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Operations data unavailable" }, { status: 502 });

  const rows = await response.json() as Run[];
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return NextResponse.json({
    last_24h: summarize(rows.filter((row) => new Date(row.created_at).getTime() >= dayAgo)),
    last_7d: summarize(rows),
    recent_errors: rows.filter((row) => row.status === "error").slice(0, 12),
  });
}
