"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PokerGame = "holdem" | "blackjack" | "draw";

const DEMO_KEY = "snake-poker-demo-bankroll";
const DEMO_START = 1000;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface Bankroll {
  signedIn: boolean | null; // null while loading
  balance: number;
  loading: boolean;
  error: string | null;
  /** Open a round: returns a server round id, or "demo" for signed-out play. */
  placeBet: (game: PokerGame, bet: number) => Promise<string>;
  /** Settle an open round with the total lifesap to credit (incl. returned stake). */
  settleBet: (roundId: string, payout: number, opts?: { risked?: number; bet?: number }) => Promise<void>;
  rebuy: (roundId: string, amount: number) => Promise<void>;
  refresh: () => Promise<void>;
  resetDemo: () => void;
}

export function useBankroll(): Bankroll {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<number>(DEMO_START);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const balanceRef = useRef(DEMO_START);
  const setBalanceBoth = useCallback((next: number) => {
    balanceRef.current = next;
    setBalance(next);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetch("/api/account/profile", { cache: "no-store" });
      if (!me.ok) {
        setSignedIn(false);
        const raw = window.localStorage.getItem(DEMO_KEY);
        setBalanceBoth(raw ? Math.max(0, parseInt(raw, 10) || DEMO_START) : DEMO_START);
        return;
      }
      setSignedIn(true);
      const data = await api<{ balance: number }>("/api/poker/bankroll");
      setBalanceBoth(data.balance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bankroll.");
    } finally {
      setLoading(false);
    }
  }, [setBalanceBoth]);

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const placeBet = useCallback(
    async (game: PokerGame, bet: number): Promise<string> => {
      const b = Math.floor(bet);
      if (signedIn) {
        const data = await api<{ roundId: string }>("/api/poker/bet", {
          method: "POST",
          body: JSON.stringify({ game, bet: b }),
        });
        await refresh();
        return data.roundId;
      }
      if (balanceRef.current < b) {
        throw new Error("Not enough lifesap — reset your demo bankroll below to keep playing.");
      }
      const next = balanceRef.current - b;
      window.localStorage.setItem(DEMO_KEY, String(next));
      setBalanceBoth(next);
      return "demo";
    },
    [signedIn, refresh, setBalanceBoth]
  );

  const settleBet = useCallback(
    async (roundId: string, payout: number, opts?: { risked?: number; bet?: number }): Promise<void> => {
      const p = Math.max(0, Math.floor(payout));
      if (signedIn && roundId !== "demo") {
        const data = await api<{ balance: number }>("/api/poker/settle", {
          method: "POST",
          body: JSON.stringify({ roundId, payout: p, risked: opts?.risked ?? null }),
        });
        setBalanceBoth(data.balance);
        return;
      }
      // Demo mode mirrors the server math: the opening bet was already debited,
      // so debit any extra risk beyond it, then credit the payout.
      const extra = Math.max(0, Math.floor(opts?.risked ?? 0) - Math.floor(opts?.bet ?? 0));
      const next = Math.max(0, balanceRef.current - extra + p);
      window.localStorage.setItem(DEMO_KEY, String(next));
      setBalanceBoth(next);
    },
    [signedIn, setBalanceBoth]
  );

  const rebuy = useCallback(
    async (roundId: string, amount: number): Promise<void> => {
      const a = Math.floor(amount);
      if (signedIn && roundId !== "demo") {
        await api("/api/poker/rebuy", { method: "POST", body: JSON.stringify({ roundId, amount: a }) });
        await refresh();
        return;
      }
      const next = Math.max(0, balanceRef.current - a);
      window.localStorage.setItem(DEMO_KEY, String(next));
      setBalanceBoth(next);
    },
    [signedIn, refresh, setBalanceBoth]
  );

  const resetDemo = useCallback(() => {
    window.localStorage.setItem(DEMO_KEY, String(DEMO_START));
    setBalanceBoth(DEMO_START);
  }, [setBalanceBoth]);

  return { signedIn, balance, loading, error, placeBet, settleBet, rebuy, refresh, resetDemo };
}
