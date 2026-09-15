"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Animal = {
  id: string;
  registryCode?: string;
  name: string;
  locality?: string;
};

type Transfer = {
  id: string;
  animalId: string;
  animalName: string;
  registryCode?: string;
  fromUsername?: string | null;
  fromDisplayName?: string | null;
  toUsername?: string | null;
  toDisplayName?: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  historyPublic?: boolean;
  createdAt?: string;
  direction: "incoming" | "outgoing";
};

export function GtpPedigreeTransfers() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [animalId, setAnimalId] = useState("");
  const [username, setUsername] = useState("");
  const [historyPublic, setHistoryPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Checking transfer center…");

  async function load() {
    try {
      const [animalsResponse, transfersResponse] = await Promise.all([
        fetch("/api/genetics/pedigree", { cache: "no-store" }),
        fetch("/api/genetics/pedigree/transfers", { cache: "no-store" }),
      ]);
      if (animalsResponse.status === 401 || transfersResponse.status === 401) {
        setSignedIn(false);
        setStatus("Sign in to transfer registered pedigree animals between keepers.");
        return;
      }
      const animalsData = await animalsResponse.json().catch(() => null) as { animals?: Animal[]; error?: string } | null;
      const transfersData = await transfersResponse.json().catch(() => null) as { transfers?: Transfer[]; error?: string } | null;
      if (!animalsResponse.ok) throw new Error(animalsData?.error || "Could not load your pedigree animals.");
      if (!transfersResponse.ok) throw new Error(transfersData?.error || "Could not load pedigree transfers.");
      const nextAnimals = Array.isArray(animalsData?.animals) ? animalsData.animals : [];
      const nextTransfers = Array.isArray(transfersData?.transfers) ? transfersData.transfers : [];
      setAnimals(nextAnimals);
      setTransfers(nextTransfers);
      setSignedIn(true);
      setAnimalId((current) => current && nextAnimals.some((animal) => animal.id === current) ? current : nextAnimals[0]?.id ?? "");
      const pending = nextTransfers.filter((transfer) => transfer.status === "pending").length;
      setStatus(pending ? `${pending} pending ownership transfer${pending === 1 ? "" : "s"}.` : "No pending ownership transfers.");
    } catch (error) {
      setSignedIn(null);
      setStatus(error instanceof Error ? error.message : "Could not load transfer center.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function act(payload: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/genetics/pedigree/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null) as { error?: string; detail?: unknown } | null;
      if (!response.ok) {
        const detail = data?.detail && typeof data.detail === "object" ? JSON.stringify(data.detail) : "";
        throw new Error(data?.error ? `${data.error}${detail ? ` · ${detail}` : ""}` : "Transfer action failed.");
      }
      setStatus(successMessage);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Transfer action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createTransfer() {
    const recipient = username.trim().replace(/^@/, "");
    if (!animalId || !recipient) {
      setStatus("Choose an animal and enter the recipient's Arboreal Planet username.");
      return;
    }
    const selected = animals.find((animal) => animal.id === animalId);
    const okay = window.confirm(`Transfer ${selected?.name || "this animal"} to @${recipient}? The recipient must accept before ownership changes.`);
    if (!okay) return;
    await act({ action: "create", animalId, recipientUsername: recipient, historyPublic }, `Transfer request sent to @${recipient}.`);
    setUsername("");
    setHistoryPublic(false);
  }

  const incoming = useMemo(() => transfers.filter((transfer) => transfer.direction === "incoming" && transfer.status === "pending"), [transfers]);
  const outgoing = useMemo(() => transfers.filter((transfer) => transfer.direction === "outgoing" && transfer.status === "pending"), [transfers]);
  const recent = useMemo(() => transfers.filter((transfer) => transfer.status !== "pending").slice(0, 8), [transfers]);

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Permanent animal identity</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/80">Ownership transfer center</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Transfer the existing Arboreal Planet animal record instead of recreating it. The registry ID, pedigree links and photo stay with the snake when ownership changes.</p>
        </div>
        <span className="rounded-full border border-emerald-300/12 px-3 py-1.5 text-[10px] font-black text-emerald-100/55">PERMANENT REGISTRY ID</span>
      </div>

      <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>

      {signedIn === false ? (
        <Link href="/login?next=/genetics" className="primary-action mt-4 !min-h-0 !px-4 !py-2.5 !text-xs">Sign in to manage transfers</Link>
      ) : signedIn === true ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
            <div className="rounded-[22px] border border-white/[.06] bg-black/10 p-4 sm:p-5">
              <div className="text-sm font-semibold text-white/68">Transfer one of your animals</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-white/38">Animal
                  <select value={animalId} onChange={(event) => setAnimalId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-sm text-white/70">
                    {!animals.length ? <option value="">No cloud pedigree animals</option> : null}
                    {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name}{animal.registryCode ? ` · ${animal.registryCode}` : ""}</option>)}
                  </select>
                </label>
                <label className="text-xs text-white/38">Recipient username
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@username" autoCapitalize="none" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/70" />
                </label>
              </div>
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/[.055] p-3 text-xs leading-5 text-white/38">
                <input type="checkbox" checked={historyPublic} onChange={(event) => setHistoryPublic(event.target.checked)} className="mt-1" />
                <span><strong className="text-white/55">Allow this completed transfer to appear in public ownership history.</strong><br/>Leave this off if you do not want your previous ownership shown publicly.</span>
              </label>
              <button type="button" disabled={busy || !animalId || !username.trim()} onClick={() => void createTransfer()} className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black text-[#06100c] disabled:opacity-30">Send ownership transfer</button>
              <p className="mt-3 text-[10px] leading-5 text-white/25">Nothing changes until the recipient accepts. Accepted animals become private for the new owner until they choose to publish them again.</p>
            </div>

            <div className="rounded-[22px] border border-white/[.06] bg-black/10 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold text-white/68">Incoming</div><span className="text-xs font-bold text-white/25">{incoming.length}</span></div>
              <div className="mt-3 space-y-2">
                {incoming.length ? incoming.map((transfer) => <div key={transfer.id} className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3">
                  <div className="text-sm font-semibold text-white/68">{transfer.animalName}</div>
                  <div className="mt-1 text-[10px] text-white/35">{transfer.registryCode || "Registry pending"} · from @{transfer.fromUsername || "keeper"}</div>
                  <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void act({ action: "accept", transferId: transfer.id }, `${transfer.animalName} is now in your pedigree account. Load your cloud pedigree on this device to edit it here.`)} className="rounded-lg bg-emerald-300 px-3 py-2 text-[10px] font-black text-[#06100c] disabled:opacity-30">Accept</button><button type="button" disabled={busy} onClick={() => void act({ action: "decline", transferId: transfer.id }, "Transfer declined.")} className="rounded-lg border border-white/[.08] px-3 py-2 text-[10px] font-bold text-white/45 disabled:opacity-30">Decline</button></div>
                </div>) : <div className="rounded-xl border border-dashed border-white/[.06] p-4 text-center text-xs text-white/25">No incoming transfers.</div>}
              </div>
            </div>
          </div>

          {outgoing.length ? <div className="rounded-[22px] border border-white/[.06] p-4 sm:p-5"><div className="text-sm font-semibold text-white/68">Awaiting recipient</div><div className="mt-3 grid gap-2 md:grid-cols-2">{outgoing.map((transfer) => <div key={transfer.id} className="rounded-xl border border-white/[.055] p-3"><div className="text-sm text-white/60">{transfer.animalName}</div><div className="mt-1 text-[10px] text-white/30">{transfer.registryCode} → @{transfer.toUsername || "keeper"}</div><button type="button" disabled={busy} onClick={() => void act({ action: "cancel", transferId: transfer.id }, "Transfer cancelled.")} className="mt-2 text-[10px] font-bold text-white/42">Cancel transfer</button></div>)}</div></div> : null}

          {recent.length ? <details className="rounded-[22px] border border-white/[.06] p-4"><summary className="cursor-pointer text-xs font-bold text-white/48">Recent transfer history</summary><div className="mt-3 space-y-2">{recent.map((transfer) => <div key={transfer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[.04] p-3 text-xs"><div><span className="font-semibold text-white/55">{transfer.animalName}</span><span className="ml-2 text-white/25">{transfer.registryCode}</span></div><span className="rounded-full border border-white/[.06] px-2 py-1 text-[9px] font-black uppercase text-white/35">{transfer.status}</span></div>)}</div></details> : null}
        </div>
      ) : null}
    </section>
  );
}
