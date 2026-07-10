import { nanoid } from "nanoid";
import { buildDeck, cardPoints, shuffle } from "./deck";
import { canPlay, isPlayableNormally, isWild } from "./rules";
import {
  ActionLogEntry,
  Card,
  ClientView,
  Color,
  Player,
  RoomState,
  RuleConfig,
  DEFAULT_CONFIG,
} from "./types";

export type Result = { ok: true } | { ok: false; reason: string };
const ok: Result = { ok: true };
const fail = (reason: string): Result => ({ ok: false, reason });

// ---------------------------------------------------------------------------
// Room / player lifecycle
// ---------------------------------------------------------------------------

export function createRoom(roomCode: string, config: RuleConfig): RoomState {
  return {
    roomCode,
    hostPlayerId: null,
    config,
    phase: "lobby",
    players: [],
    drawPile: [],
    discardPile: [],
    activeColor: null,
    direction: 1,
    currentSeat: 0,
    pendingDraw: 0,
    pendingPass: null,
    unoVulnerableSeat: null,
    scores: {},
    roundWinnerId: null,
    matchWinnerId: null,
    lastActionLog: [],
  };
}

export function addPlayer(
  state: RoomState,
  playerId: string,
  displayName: string,
): Result {
  if (state.phase !== "lobby") return fail("Game already started");
  if (state.players.length >= 4) return fail("Room is full");
  if (state.players.some((p) => p.playerId === playerId)) return ok;

  const seat = state.players.length;
  state.players.push({
    playerId,
    displayName: displayName.slice(0, 20) || `Player ${seat + 1}`,
    seat,
    hand: [],
    hasCalledUno: false,
    connected: true,
  });
  state.scores[playerId] ??= 0;
  if (!state.hostPlayerId) state.hostPlayerId = playerId;
  log(state, `${displayName} joined`, seat);
  return ok;
}

/** Remove a player. In lobby this frees + re-seats; in game the seat is held. */
export function removePlayer(state: RoomState, playerId: string): void {
  const p = state.players.find((x) => x.playerId === playerId);
  if (!p) return;

  if (state.phase === "lobby") {
    state.players = state.players.filter((x) => x.playerId !== playerId);
    state.players.forEach((pl, i) => (pl.seat = i));
    delete state.scores[playerId];
  } else {
    p.connected = false;
  }

  if (state.hostPlayerId === playerId) {
    const next = state.players.find((x) => x.connected) ?? state.players[0];
    state.hostPlayerId = next ? next.playerId : null;
  }
}

export function setConnected(state: RoomState, playerId: string, connected: boolean) {
  const p = state.players.find((x) => x.playerId === playerId);
  if (p) p.connected = connected;
}

// ---------------------------------------------------------------------------
// Round setup
// ---------------------------------------------------------------------------

export function startRound(state: RoomState): Result {
  if (state.players.length < 2) return fail("Need at least 2 players");

  const deck = shuffle(buildDeck());
  state.players.forEach((p) => {
    p.hand = [];
    p.hasCalledUno = false;
  });

  for (let i = 0; i < state.config.dealSize; i++) {
    for (const p of state.players) {
      const c = deck.pop();
      if (c) p.hand.push(c);
    }
  }

  // Flip first non-wild card as the initial discard.
  let first = deck.pop();
  while (first && isWild(first.value)) {
    deck.unshift(first); // bury the wild
    first = deck.pop();
  }
  if (!first) return fail("Deck error");

  state.drawPile = deck;
  state.discardPile = [first];
  state.activeColor = first.color;
  state.direction = 1;
  state.currentSeat = 0;
  state.pendingDraw = 0;
  state.pendingPass = null;
  state.unoVulnerableSeat = null;
  state.roundWinnerId = null;
  state.matchWinnerId = null;
  state.phase = "in_round";
  state.lastActionLog = [];
  log(state, "Round started", null);

  // Apply the first card's action effect against the opening player (feel-faithful).
  applyOpeningCardEffect(state, first);
  return ok;
}

function applyOpeningCardEffect(state: RoomState, first: Card) {
  const n = state.players.length;
  switch (first.value) {
    case "skip":
      state.currentSeat = mod(state.currentSeat + state.direction, n);
      break;
    case "reverse":
      state.direction = state.direction === 1 ? -1 : 1;
      state.currentSeat = mod(-1, n); // last seat opens when reversed
      break;
    case "draw2":
      state.pendingDraw = 2; // opener must respond to the stack
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Turn helpers
// ---------------------------------------------------------------------------

const mod = (n: number, m: number) => ((n % m) + m) % m;

function seatPlayer(state: RoomState, seat: number): Player | undefined {
  return state.players.find((p) => p.seat === seat);
}

function currentPlayer(state: RoomState): Player | undefined {
  return seatPlayer(state, state.currentSeat);
}

function advance(state: RoomState, steps = 1) {
  const n = state.players.length;
  state.currentSeat = mod(state.currentSeat + state.direction * steps, n);
}

function log(state: RoomState, text: string, seat: number | null) {
  const entry: ActionLogEntry = { id: nanoid(6), text, seat };
  state.lastActionLog = [...state.lastActionLog.slice(-19), entry];
}

/** Draw a single card, reshuffling the discard (minus its top) when empty. */
function drawFromPile(state: RoomState): Card | null {
  if (state.drawPile.length === 0) {
    if (state.discardPile.length <= 1) return null;
    const top = state.discardPile[state.discardPile.length - 1];
    const rest = state.discardPile.slice(0, -1);
    state.drawPile = shuffle(rest);
    state.discardPile = [top];
    log(state, "Draw pile reshuffled", null);
  }
  return state.drawPile.pop() ?? null;
}

function drawN(state: RoomState, player: Player, n: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < n; i++) {
    const c = drawFromPile(state);
    if (!c) break;
    player.hand.push(c);
    drawn.push(c);
  }
  if (player.hand.length > 1) player.hasCalledUno = false;
  return drawn;
}

/** Clears the missed-UNO catch window; called at the start of every play/draw. */
function closeUnoWindow(state: RoomState) {
  state.unoVulnerableSeat = null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Play a single card. Thin wrapper over {@link playCards}. */
export function playCard(
  state: RoomState,
  playerId: string,
  uid: string,
  chosenColor?: Color,
): Result {
  return playCards(state, playerId, [uid], chosenColor);
}

/**
 * Play one or more cards in a single turn. With more than one card the
 * `stacking` house rule must be on and every card must share the same rank
 * (number or symbol) — their colors may differ. Effects accumulate: N +2s add
 * 2N to the draw stack, N skips skip N players, an odd number of reverses flips
 * direction. The last card played sets the active color (or the chosen color
 * for wilds).
 */
export function playCards(
  state: RoomState,
  playerId: string,
  uids: string[],
  chosenColor?: Color,
): Result {
  if (state.phase !== "in_round") return fail("Not in a round");
  const player = currentPlayer(state);
  if (!player || player.playerId !== playerId) return fail("Not your turn");
  if (uids.length === 0) return fail("No cards to play");

  const uidSet = new Set(uids);
  if (uidSet.size !== uids.length) return fail("Duplicate card");

  // Enforce forcePlay: if you drew and the drawn card is playable, the play
  // must include it.
  if (state.pendingPass && state.pendingPass.playerId === playerId && state.pendingPass.mustPlay) {
    if (!uids.some((u) => state.pendingPass!.drawnUids.includes(u))) {
      return fail("You must play the card you drew");
    }
  }

  const found = uids.map((u) => player.hand.find((c) => c.uid === u));
  if (found.some((c) => !c)) return fail("Card not in hand");
  const cards = found as Card[];

  // Multi-card play requires the stacking rule and a shared rank.
  if (cards.length > 1) {
    if (!state.config.stacking) return fail("Stacking is off");
    const rank = cards[0].value;
    if (!cards.every((c) => c.value === rank)) {
      return fail("Stacked cards must be the same number or symbol");
    }
  }

  // At least one card must be a legal opener (respecting any pending stack).
  const opts = {
    activeColor: state.activeColor,
    discardTop: discardTop(state),
    pendingDraw: state.pendingDraw,
    config: state.config,
  };
  const openerIdx = cards.findIndex((c) => canPlay(c, opts));
  if (openerIdx === -1) return fail("Card is not playable");

  // Opener leads; the rest keep their order (the last card sets active color).
  const opener = cards[openerIdx];
  const ordered = [opener, ...cards.filter((_, i) => i !== openerIdx)];
  const finalCard = ordered[ordered.length - 1];
  const value = opener.value; // all played cards share this rank
  const count = ordered.length;

  if (isWild(finalCard.value) && !chosenColor) {
    return fail("Choose a color for the wild");
  }

  closeUnoWindow(state);
  state.pendingPass = null;

  // Move every played card to the discard, in order.
  player.hand = player.hand.filter((c) => !uidSet.has(c.uid));
  for (const c of ordered) state.discardPile.push(c);
  state.activeColor = isWild(finalCard.value) ? chosenColor! : finalCard.color;

  if (count > 1) {
    log(state, `${player.displayName} played ${count}× ${rankLabel(value)}`, player.seat);
  } else {
    log(state, `${player.displayName} played ${describeCard(finalCard, state.activeColor)}`, player.seat);
  }

  // Win check.
  if (player.hand.length === 0) {
    endRound(state, player);
    return ok;
  }

  // UNO vulnerability: reached 1 card without having called.
  if (player.hand.length === 1) {
    if (state.config.unoCall && !player.hasCalledUno) {
      state.unoVulnerableSeat = player.seat;
    }
  } else {
    player.hasCalledUno = false;
  }

  // Card effects, accumulated across the stack.
  const n = state.players.length;
  switch (value) {
    case "skip":
      log(state, count > 1 ? `${count} players skipped` : "Next player skipped", null);
      advance(state, 1 + count);
      break;
    case "reverse":
      if (count % 2 === 1) state.direction = state.direction === 1 ? -1 : 1;
      // An odd number of reverses acts as a skip in a 2-player game.
      if (n === 2 && count % 2 === 1) advance(state, 2);
      else advance(state, 1);
      break;
    case "draw2":
      state.pendingDraw += 2 * count;
      advance(state, 1);
      break;
    case "wild_draw4":
      state.pendingDraw += 4 * count;
      advance(state, 1);
      break;
    default:
      advance(state, 1);
      break;
  }
  return ok;
}

export function drawCard(state: RoomState, playerId: string): Result {
  if (state.phase !== "in_round") return fail("Not in a round");
  const player = currentPlayer(state);
  if (!player || player.playerId !== playerId) return fail("Not your turn");
  if (state.pendingPass && state.pendingPass.playerId === playerId) {
    return fail("You already drew — play or pass");
  }

  closeUnoWindow(state);

  // Facing a draw stack and not continuing it: take the whole penalty and lose turn.
  if (state.pendingDraw > 0) {
    const drawn = drawN(state, player, state.pendingDraw);
    log(state, `${player.displayName} drew ${drawn.length}`, player.seat);
    state.pendingDraw = 0;
    advance(state, 1);
    return ok;
  }

  // Normal draw.
  const drawn: Card[] = [];
  if (state.config.drawPenaltyBehavior === "drawUntilPlayable") {
    while (true) {
      const c = drawFromPile(state);
      if (!c) break;
      player.hand.push(c);
      drawn.push(c);
      if (isPlayableNormally(c, state.activeColor, discardTop(state))) break;
    }
    if (player.hand.length > 1) player.hasCalledUno = false;
  } else {
    drawn.push(...drawN(state, player, 1));
  }

  log(state, `${player.displayName} drew ${drawn.length}`, player.seat);

  const drawnPlayable = drawn.some((c) =>
    isPlayableNormally(c, state.activeColor, discardTop(state)),
  );
  const mustPlay = state.config.forcePlay && drawnPlayable;
  state.pendingPass = {
    playerId,
    drawnUids: drawn.map((c) => c.uid),
    mustPlay,
  };
  return ok;
}

export function passAfterDraw(state: RoomState, playerId: string): Result {
  if (state.phase !== "in_round") return fail("Not in a round");
  const player = currentPlayer(state);
  if (!player || player.playerId !== playerId) return fail("Not your turn");
  if (!state.pendingPass || state.pendingPass.playerId !== playerId) {
    return fail("Nothing to pass");
  }
  if (state.pendingPass.mustPlay) return fail("You must play the card you drew");

  state.pendingPass = null;
  advance(state, 1);
  log(state, `${player.displayName} passed`, player.seat);
  return ok;
}

export function callUno(state: RoomState, playerId: string): Result {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return fail("Unknown player");
  if (player.hand.length > 2) return fail("Too many cards to call UNO");
  player.hasCalledUno = true;
  if (state.unoVulnerableSeat === player.seat) state.unoVulnerableSeat = null;
  log(state, `${player.displayName} called UNO!`, player.seat);
  return ok;
}

export function catchMissedUno(
  state: RoomState,
  callerId: string,
  targetPlayerId: string,
): Result {
  if (!state.config.unoCall) return fail("UNO calls are off");
  const target = state.players.find((p) => p.playerId === targetPlayerId);
  if (!target) return fail("Unknown player");
  if (
    target.hand.length !== 1 ||
    target.hasCalledUno ||
    state.unoVulnerableSeat !== target.seat
  ) {
    return fail("Nothing to catch");
  }
  drawN(state, target, state.config.unoPenalty);
  state.unoVulnerableSeat = null;
  log(state, `${target.displayName} was caught! +${state.config.unoPenalty}`, target.seat);
  return ok;
}

/** Server-driven auto-move for a disconnected player who timed out (§9.1). */
export function autoPass(state: RoomState, playerId: string): Result {
  if (state.phase !== "in_round") return fail("Not in a round");
  const player = currentPlayer(state);
  if (!player || player.playerId !== playerId) return fail("Not their turn");

  if (state.pendingDraw > 0) {
    return drawCard(state, playerId);
  }
  const d = drawCard(state, playerId);
  if (!d.ok) return d;
  // If forcePlay locked them into playing, we can't auto-pass; leave for rejoin.
  if (state.pendingPass && state.pendingPass.mustPlay) return ok;
  return passAfterDraw(state, playerId);
}

export function startNextRound(state: RoomState): Result {
  if (state.phase === "match_end") {
    // Fresh match: reset scores.
    Object.keys(state.scores).forEach((k) => (state.scores[k] = 0));
  } else if (state.phase !== "round_end") {
    return fail("Round not over");
  }
  return startRound(state);
}

// ---------------------------------------------------------------------------
// Round end / scoring
// ---------------------------------------------------------------------------

function endRound(state: RoomState, winner: Player) {
  state.roundWinnerId = winner.playerId;
  log(state, `${winner.displayName} emptied their hand!`, winner.seat);

  if (state.config.scoringMode === "targetScore") {
    const gained = state.players
      .filter((p) => p.playerId !== winner.playerId)
      .reduce((sum, p) => sum + p.hand.reduce((s, c) => s + cardPoints(c), 0), 0);
    state.scores[winner.playerId] = (state.scores[winner.playerId] ?? 0) + gained;
    log(state, `${winner.displayName} scored +${gained}`, winner.seat);

    if (state.scores[winner.playerId] >= state.config.targetScore) {
      state.matchWinnerId = winner.playerId;
      state.phase = "match_end";
    } else {
      state.phase = "round_end";
    }
  } else {
    state.matchWinnerId = winner.playerId;
    state.phase = "round_end";
  }
}

// ---------------------------------------------------------------------------
// Views & helpers
// ---------------------------------------------------------------------------

function discardTop(state: RoomState): Card | null {
  return state.discardPile[state.discardPile.length - 1] ?? null;
}

function describeCard(card: Card, activeColor: Color | null): string {
  if (card.value === "wild") return `Wild (${activeColor})`;
  if (card.value === "wild_draw4") return `Wild +4 (${activeColor})`;
  const label: Record<string, string> = {
    skip: "Skip",
    reverse: "Reverse",
    draw2: "+2",
  };
  return `${card.color} ${label[card.value] ?? card.value}`;
}

/** Colorless rank label used for stacked plays, e.g. "5", "Skip", "+2". */
function rankLabel(value: Card["value"]): string {
  const label: Record<string, string> = {
    skip: "Skip",
    reverse: "Reverse",
    draw2: "+2",
    wild: "Wild",
    wild_draw4: "Wild +4",
  };
  return label[value] ?? value;
}

/** Build the personalized, public-safe snapshot for one player. */
export function getClientView(state: RoomState, playerId: string): ClientView {
  const me = state.players.find((p) => p.playerId === playerId);
  return {
    roomCode: state.roomCode,
    youPlayerId: playerId,
    hostPlayerId: state.hostPlayerId,
    config: state.config,
    phase: state.phase,
    players: state.players.map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      seat: p.seat,
      handCount: p.hand.length,
      hasCalledUno: p.hasCalledUno,
      connected: p.connected,
      isCatchable:
        state.config.unoCall &&
        state.unoVulnerableSeat === p.seat &&
        p.hand.length === 1 &&
        !p.hasCalledUno,
    })),
    yourHand: me ? me.hand : [],
    drawPileCount: state.drawPile.length,
    discardTop: discardTop(state),
    activeColor: state.activeColor,
    direction: state.direction,
    currentSeat: state.currentSeat,
    pendingDraw: state.pendingDraw,
    pendingPass:
      state.pendingPass && state.pendingPass.playerId === playerId
        ? state.pendingPass
        : null,
    scores: state.scores,
    roundWinnerId: state.roundWinnerId,
    matchWinnerId: state.matchWinnerId,
    lastActionLog: state.lastActionLog,
  };
}

export { DEFAULT_CONFIG };
