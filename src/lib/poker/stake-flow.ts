import { callRpc } from "@/lib/poker-server";
import {
  publicHandView,
  resolveStakeHand,
  STAKE_HANDS,
  STAKE_TARGET,
  type StakeCard,
} from "@/lib/poker/stake-service";

export const NPC_UUID = "00000000-0000-0000-0000-000000000000";

export interface SessionPublic {
  wager_id: string;
  wager_state: string;
  session_state: string;
  player_score: number;
  target_score: number;
  hands_played: number;
  base_bet: number;
  current_hand: Record<string, unknown>;
}

export async function loadSession(token: string, id: string): Promise<SessionPublic> {
  return callRpc<SessionPublic>(token, "hatchling_stakes_session_public", { p_wager_id: id });
}

export function asCards(v: unknown): StakeCard[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (c): c is StakeCard =>
      typeof c === "object" && c !== null &&
      Number.isInteger((c as StakeCard).rank) &&
      (c as StakeCard).rank >= 2 && (c as StakeCard).rank <= 14 &&
      ["S", "H", "D", "C"].includes((c as StakeCard).suit)
  );
}

export interface OpenHand {
  hand: number;
  suddenDeath: boolean;
  player: StakeCard[];
  dealer: StakeCard[];
  phase: string;
  doubled: boolean;
  insuranceTaken: boolean;
  insuranceOffered: boolean;
}

export function readOpenHand(session: SessionPublic): OpenHand | null {
  const h = session.current_hand as Partial<OpenHand>;
  if (!h || typeof h !== "object" || !h.phase || h.phase === "done") return null;
  const player = asCards(h.player);
  const dealer = asCards(h.dealer);
  if (player.length === 0 || dealer.length === 0) return null;
  return {
    hand: Number(h.hand) || session.hands_played + 1,
    suddenDeath: h.hand != null && Number(h.hand) > STAKE_HANDS,
    player,
    dealer,
    phase: String(h.phase),
    doubled: h.doubled === true,
    insuranceTaken: h.insuranceTaken === true,
    insuranceOffered: h.insuranceOffered === true,
  };
}

/**
 * Strip the server-only current_hand (which holds the dealer's hole card)
 * and replace it with a public projection. Every session object sent to the
 * browser must go through this.
 */
export function publicSession(session: SessionPublic) {
  const open = readOpenHand(session);
  return {
    ...session,
    // Never send the raw hand: it holds the dealer's hole card.
    current_hand: undefined,
    open_hand: open
      ? publicHandView({
          player: open.player,
          dealer: open.dealer,
          phase: open.phase,
          doubled: open.doubled,
          insuranceTaken: open.insuranceTaken,
          insuranceOffered: open.insuranceOffered,
          closed: false,
          handNo: open.hand,
          suddenDeath: open.suddenDeath,
        })
      : null,
  };
}

/** Score a finished hand, advance the match, and settle/void when complete. */
export async function closeHand(
  token: string,
  userId: string,
  id: string,
  session: SessionPublic,
  hand: OpenHand,
  result: ReturnType<typeof resolveStakeHand>
) {
  const newScore = session.player_score + result.delta;
  const handsPlayed = session.hands_played + 1;

  await callRpc(token, "hatchling_stakes_session_append", {
    p_wager_id: id,
    p_event: {
      t: "hand_end",
      hand: hand.hand,
      outcome: result.outcome,
      delta: result.delta,
      player_total: result.playerTotal,
      dealer_total: result.dealerTotal,
      doubled: hand.doubled,
      insurance_taken: hand.insuranceTaken,
    },
    p_player_score: newScore,
    p_hands_played: handsPlayed,
  });
  await callRpc(token, "hatchling_stakes_session_set_hand", { p_wager_id: id, p_hand: {} });

  let finale: unknown = null;
  if (handsPlayed >= STAKE_HANDS) {
    if (newScore > STAKE_TARGET) {
      finale = await callRpc(token, "hatchling_stakes_settle", {
        p_wager_id: id,
        p_winner: userId,
        p_player_score: newScore,
      });
    } else if (newScore < STAKE_TARGET) {
      finale = await callRpc(token, "hatchling_stakes_settle", {
        p_wager_id: id,
        p_winner: NPC_UUID,
        p_player_score: newScore,
      });
    } else if (handsPlayed > STAKE_HANDS) {
      // Sudden-death hand also tied: void — both keep their hatchlings, token refunded.
      await callRpc(token, "hatchling_stakes_void", {
        p_wager_id: id,
        p_reason: "tied after sudden death",
      });
      finale = { voided: true, reason: "tied after sudden death" };
    }
    // else: exactly at target after 5 hands -> one sudden-death hand is allowed.
  }

  const fresh = await loadSession(token, id);
  return {
    hand: publicHandView({
      player: hand.player,
      dealer: hand.dealer,
      phase: "done",
      doubled: hand.doubled,
      insuranceTaken: hand.insuranceTaken,
      insuranceOffered: hand.insuranceOffered,
      closed: true,
      handNo: hand.hand,
      suddenDeath: hand.suddenDeath,
    }),
    result,
    newScore,
    handsPlayed,
    finale,
    session: publicSession(fresh),
  };
}
