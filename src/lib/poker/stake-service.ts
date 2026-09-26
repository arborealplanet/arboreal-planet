import { createHash, randomInt } from "node:crypto";
import { handTotal, type BJCard } from "@/lib/poker/blackjack";

// Server-owned Canopy Blackjack score-attack contract (Hatchling Stakes phase 1).
// The browser is a dumb terminal: the shoe lives in Postgres, cards are drawn
// via RPC, and every resolution is computed here from server state.

export const STAKE_BASE_BET = 10;
export const STAKE_START_SCORE = 100;
export const STAKE_TARGET = 100;
export const STAKE_HANDS = 5;
export const NPC_UUID = "00000000-0000-0000-0000-000000000000";

export interface StakeCard {
  rank: number;
  suit: "S" | "H" | "D" | "C";
}

export function generateShoe(): { shoe: StakeCard[]; commitment: string } {
  const suits = ["S", "H", "D", "C"] as const;
  const shoe: StakeCard[] = [];
  for (let d = 0; d < 4; d++) {
    for (const suit of suits) {
      for (let rank = 2; rank <= 14; rank++) shoe.push({ rank, suit });
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  const commitment = createHash("sha256").update(JSON.stringify(shoe)).digest("hex");
  return { shoe, commitment };
}

const toBJ = (c: StakeCard): BJCard => ({ rank: c.rank, suit: c.suit });
const total = (cards: StakeCard[]): number => handTotal(cards.map(toBJ)).total;
const isNatural = (cards: StakeCard[]): boolean => handTotal(cards.map(toBJ)).blackjack;

export interface StakeHandInput {
  player: StakeCard[];
  dealer: StakeCard[];
  doubled: boolean;
  insuranceTaken: boolean;
}

export interface StakeHandResult {
  outcome:
    | "player-blackjack"
    | "dealer-blackjack"
    | "player-win"
    | "dealer-win"
    | "push"
    | "player-bust"
    | "dealer-bust";
  /** Chip delta applied to the player's score (base 10/hand). */
  delta: number;
  playerTotal: number;
  dealerTotal: number;
}

/** Resolve one finished stake hand into a score delta. */
export function resolveStakeHand(input: StakeHandInput): StakeHandResult {
  const { player, dealer, doubled, insuranceTaken } = input;
  const mult = doubled ? 2 : 1;
  const playerTotal = total(player);
  const dealerTotal = total(dealer);
  const playerBJ = isNatural(player);
  const dealerBJ = isNatural(dealer);
  const insuranceDelta = insuranceTaken ? (dealerBJ ? 10 : -5) : 0;

  if (playerBJ && dealerBJ) {
    return { outcome: "push", delta: insuranceDelta, playerTotal, dealerTotal };
  }
  if (dealerBJ) {
    return { outcome: "dealer-blackjack", delta: -STAKE_BASE_BET + insuranceDelta, playerTotal, dealerTotal };
  }
  if (playerBJ) {
    return { outcome: "player-blackjack", delta: Math.round(STAKE_BASE_BET * 1.5) + insuranceDelta, playerTotal, dealerTotal };
  }
  if (playerTotal > 21) {
    return { outcome: "player-bust", delta: -STAKE_BASE_BET * mult + insuranceDelta, playerTotal, dealerTotal };
  }
  if (dealerTotal > 21) {
    return { outcome: "dealer-bust", delta: STAKE_BASE_BET * mult + insuranceDelta, playerTotal, dealerTotal };
  }
  if (playerTotal > dealerTotal) {
    return { outcome: "player-win", delta: STAKE_BASE_BET * mult + insuranceDelta, playerTotal, dealerTotal };
  }
  if (playerTotal < dealerTotal) {
    return { outcome: "dealer-win", delta: -STAKE_BASE_BET * mult + insuranceDelta, playerTotal, dealerTotal };
  }
  return { outcome: "push", delta: insuranceDelta, playerTotal, dealerTotal };
}

/** Dealer stands on all 17s. Returns the extra cards drawn (mutates the passed array). */
export function dealerShouldHit(dealer: StakeCard[]): boolean {
  return total(dealer) < 17;
}

export function isAce(card: StakeCard): boolean {
  return card.rank === 14;
}

/** Public view of a hand: dealer hole stays hidden until the hand closes. */
export function publicHandView(hand: {
  player: StakeCard[];
  dealer: StakeCard[];
  phase: string;
  doubled: boolean;
  insuranceTaken: boolean;
  insuranceOffered: boolean;
  closed?: boolean;
  handNo?: number;
  suddenDeath?: boolean;
}) {
  const showHole = hand.phase === "done" || hand.closed === true;
  return {
    hand: hand.handNo ?? null,
    suddenDeath: hand.suddenDeath ?? false,
    player: hand.player,
    playerTotal: total(hand.player),
    // Hole card stays hidden until the hand is closed.
    dealer: showHole ? hand.dealer : [],
    dealerUp: hand.dealer[0] ?? null,
    dealerTotal: showHole ? total(hand.dealer) : undefined,
    phase: hand.phase,
    doubled: hand.doubled,
    insuranceTaken: hand.insuranceTaken,
    insuranceOffered: hand.insuranceOffered,
  };
}
