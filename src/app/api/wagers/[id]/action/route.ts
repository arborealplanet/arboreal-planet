import { NextRequest, NextResponse } from "next/server";
import { callRpc, requirePokerIdentity, rpcErrorMessage, unauthorized } from "@/lib/poker-server";
import {
  dealerShouldHit,
  resolveStakeHand,
  type StakeCard,
} from "@/lib/poker/stake-service";
import { handTotal, type BJCard } from "@/lib/poker/blackjack";
import { asCards, closeHand, loadSession, publicSession, readOpenHand } from "@/lib/poker/stake-flow";

export const runtime = "nodejs";

const toBJ = (c: StakeCard): BJCard => ({ rank: c.rank, suit: c.suit });
const isNatural = (cards: StakeCard[]) => handTotal(cards.map(toBJ)).blackjack;
const totalOf = (cards: StakeCard[]) => handTotal(cards.map(toBJ)).total;

// POST { action: "hit"|"stand"|"double"|"insurance-yes"|"insurance-no" }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requirePokerIdentity();
  if (!identity) return unauthorized();
  const { id } = await params;
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const action = String(body.action ?? "");
  const token = identity.token;

  try {
    const session = await loadSession(token, id);
    if (session.wager_state !== "in_progress" || session.session_state !== "in_progress") {
      return NextResponse.json({ error: "This wager is not in progress." }, { status: 400 });
    }
    const hand = readOpenHand(session);
    if (!hand) return NextResponse.json({ error: "No open hand." }, { status: 400 });

    const draw = async (n: number): Promise<StakeCard[]> => {
      const drawn = await callRpc<StakeCard[]>(token, "hatchling_stakes_session_draw", {
        p_wager_id: id,
        p_count: n,
      });
      const cards = asCards(drawn);
      if (cards.length !== n) throw new Error("bad draw");
      return cards;
    };
    const saveHand = async () => {
      await callRpc(token, "hatchling_stakes_session_set_hand", { p_wager_id: id, p_hand: hand });
    };
    const note = async (event: Record<string, unknown>) => {
      await callRpc(token, "hatchling_stakes_session_append", {
        p_wager_id: id,
        p_event: event,
        p_player_score: null,
        p_hands_played: null,
      });
    };
    const dealerPlay = async () => {
      while (dealerShouldHit(hand.dealer)) {
        const [c] = await draw(1);
        hand.dealer.push(c);
      }
    };
    const finish = async () => {
      hand.phase = "done";
      const result = resolveStakeHand({
        player: hand.player,
        dealer: hand.dealer,
        doubled: hand.doubled,
        insuranceTaken: hand.insuranceTaken,
      });
      return closeHand(token, identity.user.id, id, session, hand, result);
    };

    if (hand.phase === "insurance") {
      if (action !== "insurance-yes" && action !== "insurance-no") {
        return NextResponse.json({ error: "Decide on insurance first." }, { status: 400 });
      }
      hand.insuranceTaken = action === "insurance-yes";
      await note({ t: "insurance", taken: hand.insuranceTaken, hand: hand.hand });
      if (isNatural(hand.dealer)) {
        return NextResponse.json(await finish());
      }
      hand.phase = "player";
      await saveHand();
    } else if (hand.phase === "player") {
      if (action === "hit") {
        const [c] = await draw(1);
        hand.player.push(c);
        await note({ t: "player_hit", hand: hand.hand });
        const t = totalOf(hand.player);
        if (t > 21) return NextResponse.json(await finish());
        if (t === 21) {
          await dealerPlay();
          return NextResponse.json(await finish());
        }
        await saveHand();
      } else if (action === "double") {
        if (hand.player.length !== 2) {
          return NextResponse.json({ error: "Double is only allowed on two cards." }, { status: 400 });
        }
        const [c] = await draw(1);
        hand.player.push(c);
        hand.doubled = true;
        await note({ t: "player_double", hand: hand.hand });
        await dealerPlay();
        return NextResponse.json(await finish());
      } else if (action === "stand") {
        await note({ t: "player_stand", hand: hand.hand });
        await dealerPlay();
        return NextResponse.json(await finish());
      } else {
        return NextResponse.json({ error: "Illegal action." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Illegal action." }, { status: 400 });
    }

    return NextResponse.json({
      session: publicSession(await loadSession(token, id)),
    });
  } catch (err) {
    return NextResponse.json({ error: rpcErrorMessage(err) }, { status: 400 });
  }
}
