"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string; title: string; organizer: string | null; event_type: string; description: string | null;
  starts_at: string; ends_at: string | null; time_zone: string; venue_name: string | null; address: string | null;
  city: string; state_region: string | null; country: string; website_url: string | null; source_url: string;
  note: string | null; status: "PENDING" | "APPROVED" | "DECLINED"; created_at: string; reviewed_at: string | null;
};
const labels: Record<string, string> = { REPTILE_EXPO: "Reptile expo", BREEDER_EVENT: "Breeder event", EDUCATION: "Education", PLANT_EVENT: "Plant event", COMMUNITY_MEETUP: "Community meetup", OTHER: "Other" };
const TYPES: Array<[string, string]> = [["REPTILE_EXPO", "Reptile expo"], ["BREEDER_EVENT", "Breeder event"], ["EDUCATION", "Education / talk"], ["PLANT_EVENT", "Plant event"], ["COMMUNITY_MEETUP", "Community meetup"], ["OTHER", "Other"]];

function toZoneInput(iso: string | null, timeZone: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

type EditForm = {
  title: string; organizer: string; event_type: string; venue_name: string; starts_at: string; ends_at: string;
  time_zone: string; city: string; state_region: string; country: string; address: string; source_url: string;
  website_url: string; description: string; note: string;
};

function formFromRow(row: Row): EditForm {
  return {
    title: row.title, organizer: row.organizer ?? "", event_type: row.event_type, venue_name: row.venue_name ?? "",
    starts_at: toZoneInput(row.starts_at, row.time_zone), ends_at: toZoneInput(row.ends_at, row.time_zone),
    time_zone: row.time_zone, city: row.city, state_region: row.state_region ?? "", country: row.country,
    address: row.address ?? "", source_url: row.source_url, website_url: row.website_url ?? "",
    description: row.description ?? "", note: row.note ?? "",
  };
}

export function EventSubmissionStatus() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/events/submissions", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { signedIn?: boolean; rows?: Row[] } | null;
      if (response.ok && data) { setSignedIn(Boolean(data.signedIn)); setRows(data.rows ?? []); }
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); const refresh = () => void load(); window.addEventListener("event-submitted", refresh); return () => window.removeEventListener("event-submitted", refresh); }, []);

  async function withdraw(id: string) {
    if (!window.confirm("Withdraw this pending event suggestion?")) return;
    setMessage("Withdrawing…");
    const response = await fetch(`/api/events/submissions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) { setRows((current) => current.filter((row) => row.id !== id)); if (editingId === id) { setEditingId(null); setEditForm(null); } setMessage("Suggestion withdrawn."); }
    else setMessage("Could not withdraw that suggestion.");
  }

  function startEdit(row: Row) {
    setEditingId(row.id);
    setEditForm(formFromRow(row));
    setMessage("");
  }

  async function saveEdit(id: string) {
    if (!editForm || saving) return;
    setSaving(true); setMessage("Saving changes…");
    try {
      const response = await fetch("/api/events/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...editForm }) });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not save changes.");
      setEditingId(null); setEditForm(null);
      setMessage("Suggestion updated. It is still pending review.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes.");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="panel-soft rounded-2xl p-5 text-xs text-white/32">Checking your event suggestions…</div>;
  if (signedIn === false) return <div className="panel-soft rounded-2xl p-5"><div className="font-semibold text-white/58">Track your suggestions</div><p className="mt-2 text-xs leading-5 text-white/32">Sign in before submitting an event to see review status here.</p><Link href="/login?next=%2Fevents%3Fsuggest%3D1" className="mt-4 inline-block text-xs font-bold text-emerald-200/65">Sign in →</Link></div>;

  const input = "mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-sm text-white/75 outline-none";

  return <div className="panel rounded-[26px] p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="section-kicker">Your suggestions</div><h2 className="mt-2 text-xl font-semibold">Event review status</h2></div><span className="text-[10px] font-black uppercase tracking-[.12em] text-white/24">{rows.length} submitted</span></div>
    {message ? <div role="status" className="mt-3 text-xs text-white/38">{message}</div> : null}
    {rows.length ? <div className="mt-5 space-y-3">{rows.map((row) => <div key={row.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="font-semibold text-white/68">{row.title}</div><div className="mt-1 text-xs text-white/32">{labels[row.event_type] ?? row.event_type} · {new Date(row.starts_at).toLocaleDateString()} · {[row.city, row.state_region, row.country].filter(Boolean).join(", ")}</div></div>
        <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] ${row.status === "APPROVED" ? "border-emerald-300/15 text-emerald-100/65" : row.status === "DECLINED" ? "border-red-300/15 text-red-100/55" : "border-amber-200/15 text-amber-100/60"}`}>{row.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={row.source_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-200/50">Source ↗</Link>
        {row.status === "PENDING" ? <>
          <button type="button" onClick={() => (editingId === row.id ? (setEditingId(null), setEditForm(null)) : startEdit(row))} className="text-[10px] font-bold text-white/45 hover:text-white/75">{editingId === row.id ? "Cancel edit" : "Edit"}</button>
          <button type="button" onClick={() => void withdraw(row.id)} className="text-[10px] font-bold text-red-100/45 hover:text-red-100/70">Withdraw</button>
        </> : null}
      </div>
      {editingId === row.id && editForm ? <div className="mt-4 grid gap-3 border-t border-white/[.06] pt-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-white/48">Event name<input required value={editForm.title} maxLength={180} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">Organizer<input value={editForm.organizer} maxLength={180} onChange={(e) => setEditForm({ ...editForm, organizer: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">Type<select value={editForm.event_type} onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })} className={`${input} bg-[#08130e]`}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-semibold text-white/48">Venue<input value={editForm.venue_name} maxLength={180} onChange={(e) => setEditForm({ ...editForm, venue_name: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">Starts<input required type="datetime-local" value={editForm.starts_at} onChange={(e) => setEditForm({ ...editForm, starts_at: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">Ends<input type="datetime-local" value={editForm.ends_at} onChange={(e) => setEditForm({ ...editForm, ends_at: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48 md:col-span-2">Time zone<input required value={editForm.time_zone} maxLength={100} placeholder="America/New_York" onChange={(e) => setEditForm({ ...editForm, time_zone: e.target.value })} className={`${input} border-emerald-300/15`} /></label>
        <label className="text-xs font-semibold text-white/48">City<input required value={editForm.city} maxLength={120} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">State / region<input value={editForm.state_region} maxLength={120} onChange={(e) => setEditForm({ ...editForm, state_region: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">Country<input required value={editForm.country} maxLength={120} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48">Street address<input value={editForm.address} maxLength={300} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48 md:col-span-2">Official/source URL<input required type="url" value={editForm.source_url} maxLength={1000} onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })} className={`${input} border-emerald-300/15`} /></label>
        <label className="text-xs font-semibold text-white/48 md:col-span-2">Event website, if different<input type="url" value={editForm.website_url} maxLength={1000} onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })} className={input} /></label>
        <label className="text-xs font-semibold text-white/48 md:col-span-2">Description<textarea value={editForm.description} maxLength={4000} rows={3} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className={`${input} resize-y`} /></label>
        <label className="text-xs font-semibold text-white/48 md:col-span-2">Note for reviewer<textarea value={editForm.note} maxLength={1000} rows={2} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className={`${input} resize-y`} /></label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button type="button" disabled={saving} onClick={() => void saveEdit(row.id)} className="rounded-xl bg-emerald-300 px-5 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
          <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="text-[10px] font-bold text-white/45 hover:text-white/75">Cancel</button>
        </div>
      </div> : null}
    </div>)}</div> : <p className="mt-4 text-xs leading-5 text-white/30">You have not submitted an event suggestion yet.</p>}
  </div>;
}
