import { describe, expect, it } from "vitest";
import { buildDeck, cardPoints } from "./deck";
import { canPlay, canContinueStack } from "./rules";
import {
  addPlayer,
  createRoom,
  drawCard,
  playCard,
  playCards,
  startRound,
} from "./engine";
import { Card, DEFAULT_CONFIG, RoomState, RuleConfig } from "./types";

function room(config: Partial<RuleConfig> = {}): RoomState {
  const s = createRoom("TEST", { ...DEFAULT_CONFIG, ...config });
  addPlayer(s, "p1", "Alice");
  addPlayer(s, "p2", "Bob");
  return s;
}

/** Force a deterministic board: give p1 a specific hand and a known discard. */
function setup(s: RoomState, top: Card, p1Hand: Card[], activeColor = top.color) {
  s.phase = "in_round";
  s.discardPile = [top];
  s.activeColor = activeColor;
  s.currentSeat = 0;
  s.pendingDraw = 0;
  s.pendingPass = null;
  s.drawPile = buildDeck();
  s.players[0].hand = p1Hand;
  s.players[1].hand = [c("blue", "0")];
}

let uid = 0;
const c = (color: Card["color"], value: Card["value"]): Card => ({
  uid: `u${uid++}`,
  color,
  value,
});

describe("deck", () => {
  it("builds a standard 108-card deck", () => {
    const deck = buildDeck();
    expect(deck.length).toBe(108);
    expect(deck.filter((x) => x.value === "wild").length).toBe(4);
    expect(deck.filter((x) => x.value === "wild_draw4").length).toBe(4);
    expect(deck.filter((x) => x.value === "0").length).toBe(4);
    expect(deck.filter((x) => x.value === "5").length).toBe(8);
  });

  it("scores cards per standard values", () => {
    expect(cardPoints(c("red", "7"))).toBe(7);
    expect(cardPoints(c("red", "skip"))).toBe(20);
    expect(cardPoints(c(null, "wild"))).toBe(50);
  });
});

describe("playability", () => {
  const cfg = DEFAULT_CONFIG;
  it("matches by color, value, and wilds", () => {
    const top = c("red", "5");
    const base = { activeColor: "red" as const, discardTop: top, pendingDraw: 0, config: cfg };
    expect(canPlay(c("red", "9"), base)).toBe(true); // color
    expect(canPlay(c("blue", "5"), base)).toBe(true); // value
    expect(canPlay(c(null, "wild"), base)).toBe(true); // wild
    expect(canPlay(c("blue", "9"), base)).toBe(false); // neither
  });

  it("forbids +2 onto +4 always", () => {
    const on = { ...DEFAULT_CONFIG, stackDraw2OnDraw2: true, stackDraw4OnDraw2Or4: true };
    expect(canContinueStack(c("red", "draw2"), "wild_draw4", on)).toBe(false);
    expect(canContinueStack(c(null, "wild_draw4"), "wild_draw4", on)).toBe(true);
  });
});

describe("turn flow", () => {
  it("advances to the next player on a number card", () => {
    const s = room();
    setup(s, c("red", "5"), [c("red", "7"), c("blue", "2")]);
    const uidPlay = s.players[0].hand[0].uid;
    const r = playCard(s, "p1", uidPlay);
    expect(r.ok).toBe(true);
    expect(s.currentSeat).toBe(1);
    expect(s.players[0].hand.length).toBe(1);
  });

  it("skip skips the next player (2p -> same player)", () => {
    const s = room();
    setup(s, c("red", "5"), [c("red", "skip"), c("red", "1")]);
    const skip = s.players[0].hand[0].uid;
    playCard(s, "p1", skip);
    expect(s.currentSeat).toBe(0); // opponent skipped, back to p1
  });

  it("draw2 accumulates a pending stack for the next player", () => {
    const s = room();
    setup(s, c("red", "5"), [c("red", "draw2"), c("red", "1")]);
    playCard(s, "p1", s.players[0].hand[0].uid);
    expect(s.pendingDraw).toBe(2);
    expect(s.currentSeat).toBe(1);
  });

  it("facing a stack, drawing takes the penalty and passes the turn", () => {
    const s = room();
    setup(s, c("red", "5"), [c("red", "draw2"), c("red", "1")]);
    playCard(s, "p1", s.players[0].hand[0].uid);
    const before = s.players[1].hand.length;
    drawCard(s, "p2");
    expect(s.players[1].hand.length).toBe(before + 2);
    expect(s.pendingDraw).toBe(0);
    expect(s.currentSeat).toBe(0);
  });
});

describe("uno + scoring", () => {
  it("marks a player catchable when reaching 1 card without calling", () => {
    const s = room({ unoCall: true });
    setup(s, c("red", "5"), [c("red", "7"), c("red", "1")]);
    playCard(s, "p1", s.players[0].hand[0].uid);
    expect(s.players[0].hand.length).toBe(1);
    expect(s.unoVulnerableSeat).toBe(0);
  });

  it("single round ends when a hand empties", () => {
    const s = room({ scoringMode: "singleRound" });
    setup(s, c("red", "5"), [c("red", "7")]);
    playCard(s, "p1", s.players[0].hand[0].uid);
    expect(s.phase).toBe("round_end");
    expect(s.roundWinnerId).toBe("p1");
  });
});

describe("stacking", () => {
  function room3(config: Partial<RuleConfig> = {}): RoomState {
    const s = createRoom("T3", { ...DEFAULT_CONFIG, ...config });
    addPlayer(s, "p1", "Alice");
    addPlayer(s, "p2", "Bob");
    addPlayer(s, "p3", "Cara");
    return s;
  }

  it("plays several same-rank cards (any color) in one turn when enabled", () => {
    const s = room({ stacking: true });
    setup(s, c("green", "5"), [c("red", "5"), c("blue", "5"), c("red", "8")]);
    const uids = [s.players[0].hand[0].uid, s.players[0].hand[1].uid];
    const r = playCards(s, "p1", uids);
    expect(r.ok).toBe(true);
    expect(s.players[0].hand.length).toBe(1);
    expect(s.currentSeat).toBe(1);
    expect(s.activeColor).toBe("blue"); // the last card sets the color
  });

  it("rejects multi-card plays when stacking is off", () => {
    const s = room({ stacking: false });
    setup(s, c("green", "5"), [c("red", "5"), c("blue", "5")]);
    const uids = s.players[0].hand.map((h) => h.uid);
    expect(playCards(s, "p1", uids).ok).toBe(false);
  });

  it("rejects a stack of mismatched ranks", () => {
    const s = room({ stacking: true });
    setup(s, c("green", "5"), [c("red", "5"), c("red", "8")]);
    const uids = s.players[0].hand.map((h) => h.uid);
    expect(playCards(s, "p1", uids).ok).toBe(false);
  });

  it("accumulates +2 draw penalties across a stack", () => {
    const s = room({ stacking: true });
    setup(s, c("red", "5"), [c("red", "draw2"), c("blue", "draw2"), c("red", "1")]);
    const uids = [s.players[0].hand[0].uid, s.players[0].hand[1].uid];
    playCards(s, "p1", uids);
    expect(s.pendingDraw).toBe(4);
    expect(s.currentSeat).toBe(1);
  });

  it("two skips skip two players", () => {
    const s = room3({ stacking: true });
    s.phase = "in_round";
    s.discardPile = [c("red", "5")];
    s.activeColor = "red";
    s.currentSeat = 0;
    s.pendingDraw = 0;
    s.pendingPass = null;
    s.drawPile = buildDeck();
    s.players[0].hand = [c("red", "skip"), c("blue", "skip"), c("red", "1")];
    s.players[1].hand = [c("green", "0")];
    s.players[2].hand = [c("green", "1")];
    playCards(s, "p1", [s.players[0].hand[0].uid, s.players[0].hand[1].uid]);
    // Skip p2 and p3 → back to p1.
    expect(s.currentSeat).toBe(0);
  });
});
