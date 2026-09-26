import { NextRequest, NextResponse } from "next/server";
import { callRpc, requirePokerIdentity, rpcErrorMessage, unauthorized } from "@/lib/poker-server";
import {
  isAce,
  publicHandView,
  resolveStakeHand,
  STAKE_HANDS,
  STAKE_TARGET,
  type StakeCard,
} from "@/lib/poker/stake-service";
import { handTotal, type BJCard } from "@/lib/poker/blackjack";
import { asCards, closeHand, loadSession, publicSession, readOpenHand } from "@/lib/poker/stake-flow";

export const runtime = "nodejs";

const toBJ = (c: StakeCard): BJCard => ({ rank: c.rank, suit: c.suit });
const isNatural = (cards: StakeCard[]) => handTotal(cards.map(toBJ)).blackjack;

// POST { action: "deal" }: open the next stake hand from the server shoe.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requirePokerIdentity();
  if (!identity) return unauthorized();
  const { id } = await params;
  try {
    const session = await loadSession(identity.token, id);
    if (session.wager_state !== "in_progress" || session.session_state !== "in_progress") {
      return NextResponse.json({ error: "This wager is not in progress." }, { status: 400 });
    }
    if (readOpenHand(session)) {
      return NextResponse.json({ error: "Finish the open hand first." }, { status: 400 });
    }
    const allowSuddenDeath = session.hands_played === STAKE_HANDS && session.player_score === STAKE_TARGET;
    if (session.hands_played > STAKE_HANDS || (session.hands_played === STAKE_HANDS && !allowSuddenDeath)) {
      return NextResponse.json({ error: "No more hands left in this wager." }, { status: 400 });
    }

    const drawn = await callRpc<StakeCard[]>(identity.token, "hatchling_stakes_session_draw", {
      p_wager_id: id,
      p_count: 4,
    });
    const cards = asCards(drawn);
    if (cards.length !== 4) throw new Error("bad draw");
    const player = [cards[0], cards[2]];
    const dealer = [cards[1], cards[3]];
    const handNo = session.hands_played + 1;
    const insuranceOffered = isAce(dealer[0]);
    const playerBJ = isNatural(player);
    const dealerBJ = isNatural(dealer);

    let phase = "player";
    let result = null as null | ReturnType<typeof resolveStakeHand>;
    if (insuranceOffered) {
      phase = "insurance";
    } else if (playerBJ || dealerBJ) {
      result = resolveStakeHand({ player, dealer, doubled: false, insuranceTaken: false });
      phase = "done";
    }

    const hand = {
      hand: handNo,
      suddenDeath: handNo > STAKE_HANDS,
      player,
      dealer,
      phase,
      doubled: false,
      insuranceTaken: false,
      insuranceOffered,
    };
    await callRpc(identity.token, "hatchling_stakes_session_set_hand", { p_wager_id: id, p_hand: hand });
    await callRpc(identity.token, "hatchling_stakes_session_append", {
      p_wager_id: id,
      p_event: { t: "hand_start", hand: handNo, sudden_death: handNo > STAKE_HANDS },
      p_player_score: null,
      p_hands_played: null,
    });

    if (result) {
      return NextResponse.json(await closeHand(identity.token, identity.user.id, id, session, hand, result));
    }
    return NextResponse.json({
      hand: publicHandView({
        player: hand.player,
        dealer: hand.dealer,
        phase: hand.phase,
        doubled: hand.doubled,
        insuranceTaken: hand.insuranceTaken,
        insuranceOffered: hand.insuranceOffered,
        closed: false,
        handNo: hand.hand,
        suddenDeath: hand.suddenDeath,
      }),
      session: publicSession(await loadSession(identity.token, id)),
    });
  } catch (err) {
    return NextResponse.json({ error: rpcErrorMessage(err) }, { status: 400 });
  }
}
