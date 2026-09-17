"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChondroSaveRecoveryGate } from "@/components/ChondroSaveRecoveryGate";
import {
  EMERALD_KEEPER_SAVE_KEY,
  sanitizeEmeraldKeeperSave,
} from "@/lib/arboreal-keeper-emerald-engine";

const EMERALD_SAVE_EVENT = "arboreal-keeper-emerald-save-updated";

export function ArborealKeeperSaveRecoveryGate({ children }: { children: ReactNode }) {
  const [emeraldReady, setEmeraldReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EMERALD_KEEPER_SAVE_KEY);
      if (raw) {
        const cleaned = sanitizeEmeraldKeeperSave(JSON.parse(raw));
        const serialized = JSON.stringify(cleaned);
        if (serialized !== raw) {
          window.localStorage.setItem(EMERALD_KEEPER_SAVE_KEY, serialized);
          window.dispatchEvent(
            new CustomEvent(EMERALD_SAVE_EVENT, { detail: { save: cleaned } }),
          );
        }
      }
    } catch {
      // Leave unreadable local data untouched so authenticated cloud recovery
      // still has a chance to restore the player's Emerald program.
    } finally {
      setEmeraldReady(true);
    }
  }, []);

  if (!emeraldReady) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
        <div className="panel rounded-[30px] p-8 text-center text-sm text-white/45">
          Checking your Arboreal Keeper animal and housing records…
        </div>
      </div>
    );
  }

  return <ChondroSaveRecoveryGate>{children}</ChondroSaveRecoveryGate>;
}
