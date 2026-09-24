import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { normalizeCommunitySection } from "@/lib/community-sections";

type SubjectType = "ANIMAL" | "PLANT" | "TOPIC" | "SECTION";
const TYPES = new Set<SubjectType>(["ANIMAL","PLANT","TOPIC","SECTION"]);
const TOPICS = new Map([
  ["green tree python","Green Tree Python"],
  ["green tree pythons","Green Tree Python"],
  ["boiga","Boiga"],
  ["tree monitors","Tree Monitors"],
  ["nepenthes","Nepenthes"],
  ["breeding","Breeding"],
  ["husbandry","Husbandry"],
  ["enclosures","Enclosures"],
]);

function authHeaders(token: string, prefer?: string) {
  return {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function resolveSubject(type: SubjectType, rawId: string, rawKey: string) {
  if (type === "SECTION") {
    const key = normalizeCommunitySection(rawKey);
    return key ? { id: null as string | null, key } : null;
  }
  if (type === "TOPIC") {
    const key = TOPICS.get(rawKey.trim().toLowerCase());
    return key ? { id: null as string | null, key } : null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(rawId)) return null;
  const path = type === "ANIMAL"
    ? `species?id=eq.${encodeURIComponent(rawId)}&published=eq.true&select=id,common_name&limit=1`
    : `plant_collections?id=eq.${encodeURIComponent(rawId)}&status=neq.PLANNED&select=id,name&limit=1`;
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []) as Array<{ id: string; common_name?: string; name?: string }>;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, key: String(row.common_name ?? row.name ?? rawKey).trim() };
}

function requestSubject(request: NextRequest) {
  const type = String(request.nextUrl.searchParams.get("type") ?? "").toUpperCase() as SubjectType;
  const id = String(request.nextUrl.searchParams.get("id") ?? "").trim();
  const key = String(request.nextUrl.searchParams.get("key") ?? "").trim().slice(0, 120);
  const usesKey = type === "TOPIC" || type === "SECTION";
  return TYPES.has(type) && (usesKey ? Boolean(key) : Boolean(id)) ? { type, id, key } : null;
}

function followQuery(userId:string,type:SubjectType,resolved:{id:string|null;key:string}){
  const identityFilter=type==="TOPIC"||type==="SECTION"
    ?`subject_key=eq.${encodeURIComponent(resolved.key)}`
    :`subject_id=eq.${encodeURIComponent(resolved.id??"")}`;
  return `${SUPABASE_AUTH_URL}/rest/v1/user_subject_follows?user_id=eq.${encodeURIComponent(userId)}&subject_type=eq.${type}&${identityFilter}`;
}

export async function GET(request: NextRequest) {
  const subject = requestSubject(request);
  if (!subject) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ signedIn: false, following: false });
  const resolved = await resolveSubject(subject.type, subject.id, subject.key);
  if (!resolved) return NextResponse.json({ error: "Subject unavailable" }, { status: 404 });

  const response = await fetch(`${followQuery(identity.user.id,subject.type,resolved)}&select=id&limit=1`, { headers: authHeaders(identity.token), cache: "no-store" });
  const rows = response.ok ? await response.json().catch(() => []) as Array<{ id: string }> : [];
  return NextResponse.json({ signedIn: true, following: rows.length > 0, subject: { type: subject.type, id: resolved.id, key: resolved.key } });
}

export async function POST(request: NextRequest) {
  const subject = requestSubject(request);
  if (!subject) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const resolved = await resolveSubject(subject.type, subject.id, subject.key);
  if (!resolved) return NextResponse.json({ error: "Subject unavailable" }, { status: 404 });

  const query = followQuery(identity.user.id,subject.type,resolved);
  const check = await fetch(`${query}&select=id&limit=1`, { headers: authHeaders(identity.token), cache: "no-store" });
  const existing = check.ok ? await check.json().catch(() => []) as Array<{ id: string }> : [];

  if (existing.length) {
    const remove = await fetch(query, { method: "DELETE", headers: authHeaders(identity.token, "return=minimal"), cache: "no-store" });
    if (!remove.ok) return NextResponse.json({ error: "Could not unfollow subject" }, { status: 400 });
    return NextResponse.json({ following: false });
  }

  const add = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_subject_follows`, {
    method: "POST",
    headers: authHeaders(identity.token, "return=minimal"),
    body: JSON.stringify({ user_id: identity.user.id, subject_type: subject.type, subject_id: resolved.id, subject_key: resolved.key }),
    cache: "no-store",
  });
  if (!add.ok) return NextResponse.json({ error: "Could not follow subject" }, { status: 400 });
  return NextResponse.json({ following: true });
}
