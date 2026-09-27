import { callRpc } from "@/lib/poker-server";

export const NPC_UUID = "00000000-0000-0000-0000-000000000000";

export interface SessionPublic {
  wager_id: string;
  wager_state: string;
  session_state: string;
  player_score: number;
  target_score: number;
  hands_played: number;
  base_bet: number;
  winner: string | null;
  npc_name: string | null;
  player_asset_name: string | null;
  tier: string | null;
  current_hand: Record<string, unknown>;
}

export async function loadSession(token: string, id: string): Promise<SessionPublic> {
  return callRpc<SessionPublic>(token, "hatchling_stakes_session_public", { p_wager_id: id });
}

/**
 * The server only ever stores the public table projection in current_hand
 * (the shoe and the dealer's hole card live in bj_state and never leave the
 * API route), so the only job here is renaming it for the client.
 */
export function publicSession(session: SessionPublic) {
  const { current_hand, ...rest } = session;
  return {
    ...rest,
    current_hand: undefined,
    open_hand: (current_hand ?? null) as Record<string, unknown> | null,
  };
}
