"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CardView, type CardSuit } from "@/components/poker/CardView";
import { TableFelt } from "@/components/poker/TableFelt";
import { useBankroll } from "@/components/poker/useBankroll";
import { playSfx, unlockAudio } from "@/lib/poker/sfx";

interface Token {
  slot: number;
  status: string;
  wager_id: string | null;
}
interface Animal {
  asset_key: string;
  tier: string;
  trait_snapshot: { name?: string } | null;
  created_at: string;
}
interface Session {
  wager_id: string;
  wager_state: string;
  session_state: string;
  player_score: number;
  hands_played: number;
  open_hand: null | {
    hand: number | null;
    suddenDeath: boolean;
    player: { rank: number; suit: string }[];
    playerTotal?: number;
    dealerUp: { rank: number; suit: string } | null;
    dealerTotal?: number;
    phase: string;
    doubled: boolean;
    insuranceTaken: boolean;
    insuranceOffered: boolean;
  };
}
interface WagerRow {
  id: string;
  state: string;
  winner: string | null;
  created_at: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
  return data as T;
}

export function StakesClient() {
  const { signedIn, loading } = useBankroll();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [history, setHistory] = useState<WagerRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [t, a, h] = await Promise.all([
        api<{ tokens: Token[] }>("/api/wagers/tokens"),
        api<{ animals: Animal[] }>("/api/wagers/eligible"),
        api<{ wagers: WagerRow[] }>("/api/wagers/history"),
      ]);
      setTokens(t.tokens);
      setAnimals(a.animals);
      setHistory(h.wagers);
      const active = h.wagers.find((w) => w.state === "in_progress" || w.state === "awaiting_start");
      if (active) setActiveId(active.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stakes.");
    }
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [signedIn, refresh]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const s = await api<Session>(`/api/wagers/${id}/state`, { cache: "no-store" });
      setSession(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wager.");
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const tick = () => {
      if (!cancelled) void loadSession(activeId);
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(t);
    };
  }, [activeId, loadSession]);

  const createWager = useCallback(async () => {
    if (!selectedAnimal || busy) return;
    setBusy(true);
    setError(null);
    try {
      unlockAudio();
      const token = tokens.find((t) => t.status === "available");
      if (!token) throw new Error("No wager tokens left this week.");
      const w = await api<{ wagerId: string }>("/api/wagers/create", {
        method: "POST",
        body: JSON.stringify({ assetKey: selectedAnimal }),
      });
      setActiveId(w.wagerId);
      setConfirmCreate(false);
      playSfx("chip");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create wager.");
    } finally {
      setBusy(false);
    }
  }, [selectedAnimal, tokens, busy, refresh]);

  const deal = useCallback(async () => {
    if (!activeId || busy) return;
    setBusy(true);
    setError(null);
    try {
      unlockAudio();
      const s = await api<{ hand: Session["open_hand"]; session: Session }>(`/api/wagers/${activeId}/hand`, {
        method: "POST",
        body: JSON.stringify({ action: "deal" }),
      });
      setSession(s.session);
      playSfx("deal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not deal.");
    } finally {
      setBusy(false);
    }
  }, [activeId, busy]);

  const act = useCallback(
    async (action: string) => {
      if (!activeId || busy) return;
      setBusy(true);
      setError(null);
      try {
        unlockAudio();
        const s = await api<{ hand?: Session["open_hand"]; session: Session }>(
          `/api/wagers/${activeId}/action`,
          { method: "POST", body: JSON.stringify({ action }) }
        );
        setSession(s.session);
        playSfx(action === "hit" || action === "double" ? "deal" : "click");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Illegal action.");
      } finally {
        setBusy(false);
      }
    },
    [activeId, busy]
  );

  const abandon = useCallback(async () => {
    if (!activeId || busy) return;
    if (!window.confirm("Abandon this wager? Your hatchling unlocks and your token is refunded.")) return;
    setBusy(true);
    try {
      await api(`/api/wagers/${activeId}/void`, { method: "POST", body: JSON.stringify({}) });
      setActiveId(null);
      setSession(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not abandon.");
    } finally {
      setBusy(false);
    }
  }, [activeId, busy, refresh]);

  if (loading) {
    return (
      <TableFelt className="min-h-dvh">
        <p className="p-8 text-center text-emerald-100/60">Loading…</p>
      </TableFelt>
    );
  }

  if (!signedIn) {
    return (
      <TableFelt className="min-h-dvh">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-black text-amber-100">Hatchling Stakes</h1>
          <p className="mt-3 text-sm text-emerald-100/70">
            Wagering a real hatchling needs your account — sign in to see your eligible animals and
            weekly tokens.
          </p>
          <Link
            href="/enter"
            className="mt-6 inline-block rounded-full bg-emerald-500 px-8 py-2.5 font-bold text-black"
          >
            Sign in
          </Link>
        </div>
      </TableFelt>
    );
  }

  const tokensLeft = tokens.filter((t) => t.status === "available").length;
  const hand = session?.open_hand ?? null;

  return (
    <TableFelt className="min-h-dvh">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/arcade/snake-poker" className="text-sm text-emerald-100/60 hover:text-amber-200">
            ← The Den
          </Link>
          <div className="text-sm text-emerald-100/80">🎰 {tokensLeft}/2 weekly tokens</div>
        </div>

        <h1 className="mt-4 text-2xl font-black text-amber-100">Hatchling Stakes</h1>
        <p className="text-xs text-emerald-100/50">
          Five blackjack hands from 100 match chips. Finish above 100 and both hatchlings are yours.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-950/60 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {activeId && session ? (
          <div className="mt-6">
            <div className="rounded-2xl border border-amber-200/20 bg-black/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-100/70">
                  Match chips <span className="font-black text-amber-200">{session.player_score}</span>
                </span>
                <span className="text-emerald-100/70">
                  Hand <span className="font-bold text-amber-100">{Math.min(session.hands_played + (hand ? 1 : 0), 5)}</span>/5
                </span>
              </div>

              {session.session_state === "settled" ? (
                <div className="mt-4 text-center">
                  <p className="text-xl font-black text-amber-100">
                    {session.wager_state === "player_won"
                      ? "🏆 You take both hatchlings!"
                      : session.wager_state === "npc_won"
                        ? "The house takes your hatchling."
                        : "Wager closed."}
                  </p>
                  <button
                    onClick={() => {
                      setActiveId(null);
                      setSession(null);
                      void refresh();
                    }}
                    className="mt-4 rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black"
                  >
                    Back to stakes
                  </button>
                </div>
              ) : hand ? (
                <div className="mt-4">
                  <div className="flex justify-center gap-2">
                    {hand.dealerUp && <CardView rank={hand.dealerUp.rank} suit={hand.dealerUp.suit as CardSuit} size="md" />}
                    <CardView rank={0} suit="S" faceDown size="md" />
                  </div>
                  <p className="mt-1 text-center text-[11px] text-emerald-100/50">House</p>
                  <div className="mt-3 flex justify-center gap-2">
                    {hand.player.map((c, i) => (
                      <CardView key={i} rank={c.rank} suit={c.suit as CardSuit} size="md" />
                    ))}
                  </div>
                  <p className="mt-1 text-center text-[11px] text-emerald-100/50">
                    You{hand.doubled ? " (doubled)" : ""}
                    {hand.suddenDeath ? " · sudden death" : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {hand.phase === "insurance" && (
                      <>
                        <button onClick={() => act("insurance-yes")} disabled={busy} className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-black disabled:opacity-50">
                          Insure
                        </button>
                        <button onClick={() => act("insurance-no")} disabled={busy} className="rounded-full border border-emerald-200/25 px-5 py-2 text-sm font-bold text-emerald-100/80 disabled:opacity-50">
                          No insurance
                        </button>
                      </>
                    )}
                    {hand.phase === "player" && (
                      <>
                        <button onClick={() => act("hit")} disabled={busy} className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-50">
                          Hit
                        </button>
                        <button onClick={() => act("stand")} disabled={busy} className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-50">
                          Stand
                        </button>
                        {hand.player.length === 2 && (
                          <button onClick={() => act("double")} disabled={busy} className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-black disabled:opacity-50">
                            Double
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-center">
                  <button
                    onClick={deal}
                    disabled={busy}
                    className="rounded-full bg-emerald-500 px-8 py-2.5 font-bold text-black disabled:opacity-50"
                  >
                    {busy ? "Dealing…" : `Deal hand ${session.hands_played + 1}`}
                  </button>
                </div>
              )}

              {session.session_state === "in_progress" && (
                <button onClick={abandon} disabled={busy} className="mt-4 w-full text-center text-xs text-emerald-100/40 hover:text-red-300 disabled:opacity-50">
                  Abandon wager (hatchling unlocks, token refunded)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Create */}
            <div className="rounded-2xl border border-emerald-200/15 bg-black/45 p-5">
              <h2 className="font-bold text-amber-100">Stake a hatchling</h2>
              {animals.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-100/60">
                  No eligible hatchlings yet. Animals become eligible when a breeding event is
                  registered by the game server — Keeper save files alone don&apos;t qualify.
                </p>
              ) : (
                <>
                  <label className="mt-3 block text-xs text-emerald-100/60">Your hatchling</label>
                  <select
                    value={selectedAnimal}
                    onChange={(e) => setSelectedAnimal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-emerald-200/20 bg-black/60 px-3 py-2 text-sm text-emerald-100"
                  >
                    <option value="">Choose…</option>
                    {animals.map((a) => (
                      <option key={a.asset_key} value={a.asset_key}>
                        {a.trait_snapshot?.name ?? "Hatchling"} · {a.tier}
                      </option>
                    ))}
                  </select>
                  <p className="mt-3 text-xs text-emerald-100/60">
                    The house mints its own hatchling at the same tier as your counter-stake.
                  </p>
                  {!confirmCreate ? (
                    <button
                      onClick={() => {
                        if (!selectedAnimal) {
                          setError("Choose a hatchling first.");
                          return;
                        }
                        if (tokensLeft === 0) {
                          setError("No wager tokens left this week — they refresh Monday.");
                          return;
                        }
                        setConfirmCreate(true);
                      }}
                      className="mt-4 rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black"
                    >
                      Continue
                    </button>
                  ) : (
                    <div className="mt-4 rounded-xl border border-red-400/40 bg-red-950/40 p-4">
                      <p className="text-sm text-red-100">
                        <strong>Final:</strong> your hatchling locks in escrow. Win all five hands and
                        you take the house&apos;s hatchling too. Lose, and yours goes to the house.
                        No take-backs.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={createWager}
                          disabled={busy}
                          className="rounded-full bg-red-500 px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          {busy ? "…" : "Lock it in"}
                        </button>
                        <button
                          onClick={() => setConfirmCreate(false)}
                          className="rounded-full border border-emerald-200/25 px-5 py-2 text-sm text-emerald-100/80"
                        >
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="rounded-2xl border border-emerald-200/15 bg-black/45 p-5">
                <h2 className="font-bold text-amber-100">Past wagers</h2>
                <div className="mt-2 space-y-1">
                  {history.slice(0, 10).map((w) => (
                    <p key={w.id} className="text-xs text-emerald-100/60">
                      {new Date(w.created_at).toLocaleDateString()} · {w.state.replace(/_/g, " ")}
                      {w.winner ? ` · winner: ${w.winner}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TableFelt>
  );
}
