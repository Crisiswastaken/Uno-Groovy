// Pure game-model types shared by the engine, the PartyKit server, and the client.

export type Color = "red" | "yellow" | "green" | "blue";

export type NumberValue = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type ActionValue = "skip" | "reverse" | "draw2";
export type WildValue = "wild" | "wild_draw4";
export type Value = NumberValue | ActionValue | WildValue;

export const COLORS: Color[] = ["red", "yellow", "green", "blue"];

/** A concrete card instance. `color` is null only for wild types. */
export interface Card {
  uid: string;
  color: Color | null;
  value: Value;
}

export type Phase = "lobby" | "in_round" | "round_end" | "match_end";

export interface RuleConfig {
  unoCall: boolean;
  unoPenalty: number;
  stackDraw2OnDraw2: boolean;
  stackDraw4OnDraw2Or4: boolean;
  /**
   * Stacking: play several cards of the same rank (number or symbol) in a
   * single turn, regardless of their color — e.g. two 5s, or a red Skip and a
   * blue Skip together. Off by default.
   */
  stacking: boolean;
  drawPenaltyBehavior: "drawOneAndPass" | "drawUntilPlayable";
  forcePlay: boolean;
  dealSize: number;
  scoringMode: "singleRound" | "targetScore";
  targetScore: number;
}

export const DEFAULT_CONFIG: RuleConfig = {
  unoCall: true,
  unoPenalty: 2,
  stackDraw2OnDraw2: false,
  stackDraw4OnDraw2Or4: false,
  stacking: false,
  drawPenaltyBehavior: "drawOneAndPass",
  forcePlay: false,
  dealSize: 7,
  scoringMode: "singleRound",
  targetScore: 500,
};

export interface Player {
  playerId: string;
  displayName: string;
  seat: number;
  hand: Card[]; // private — never sent to other clients
  hasCalledUno: boolean;
  connected: boolean;
}

export interface ActionLogEntry {
  id: string;
  text: string;
  seat: number | null;
}

/**
 * Set when the current player has drawn on a normal (non-stack) turn and must
 * now either play the drawn card or explicitly pass.
 */
export interface PendingPass {
  playerId: string;
  drawnUids: string[];
  mustPlay: boolean; // forcePlay + drawn card is playable
}

export interface RoomState {
  roomCode: string;
  hostPlayerId: string | null;
  config: RuleConfig;
  phase: Phase;
  players: Player[]; // seat order
  drawPile: Card[];
  discardPile: Card[];
  activeColor: Color | null;
  direction: 1 | -1;
  currentSeat: number;
  pendingDraw: number;
  pendingPass: PendingPass | null;
  /** Seat that is currently catchable for a missed UNO call, or null. */
  unoVulnerableSeat: number | null;
  scores: Record<string, number>;
  roundWinnerId: string | null;
  matchWinnerId: string | null;
  lastActionLog: ActionLogEntry[];
}

/** The personalized, public-safe snapshot a single client receives. */
export interface ClientView {
  roomCode: string;
  youPlayerId: string;
  hostPlayerId: string | null;
  config: RuleConfig;
  phase: Phase;
  players: {
    playerId: string;
    displayName: string;
    seat: number;
    handCount: number;
    hasCalledUno: boolean;
    connected: boolean;
    isCatchable: boolean;
  }[];
  yourHand: Card[];
  drawPileCount: number;
  discardTop: Card | null;
  activeColor: Color | null;
  direction: 1 | -1;
  currentSeat: number;
  pendingDraw: number;
  pendingPass: PendingPass | null;
  scores: Record<string, number>;
  roundWinnerId: string | null;
  matchWinnerId: string | null;
  lastActionLog: ActionLogEntry[];
}
