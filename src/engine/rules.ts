import { Card, Color, RuleConfig, Value } from "./types";

export const isWild = (v: Value) => v === "wild" || v === "wild_draw4";
export const isDrawCard = (v: Value) => v === "draw2" || v === "wild_draw4";

/**
 * Can `card` legally be played given the active color and the discard top,
 * ignoring any pending draw stack (that is handled by `legalPlaysForStack`).
 */
export function isPlayableNormally(
  card: Card,
  activeColor: Color | null,
  discardTop: Card | null,
): boolean {
  if (isWild(card.value)) return true; // wilds are always playable (§4.1.2)
  if (!discardTop) return true;
  if (card.color === activeColor) return true;
  if (card.value === discardTop.value) return true;
  return false;
}

/**
 * When a draw stack is active (pendingDraw > 0), only certain draw cards may be
 * played to continue the stack. Returns whether `card` is a legal continuation.
 *
 * Legal transitions (only when the matching toggle is on):
 *   draw2 -> draw2         (stackDraw2OnDraw2)
 *   draw2 -> wild_draw4    (stackDraw4OnDraw2Or4)
 *   wild_draw4 -> wild_draw4 (stackDraw4OnDraw2Or4)
 *   wild_draw4 -> draw2    NEVER (hard constraint §4.1.6 / §4.3)
 */
export function canContinueStack(
  card: Card,
  topDrawValue: Value,
  config: RuleConfig,
): boolean {
  if (!isDrawCard(card.value)) return false;

  if (topDrawValue === "draw2") {
    if (card.value === "draw2") return config.stackDraw2OnDraw2;
    if (card.value === "wild_draw4") return config.stackDraw4OnDraw2Or4;
  }
  if (topDrawValue === "wild_draw4") {
    if (card.value === "wild_draw4") return config.stackDraw4OnDraw2Or4;
    if (card.value === "draw2") return false; // +2 onto +4 forbidden always
  }
  return false;
}

/**
 * Whether several cards of the same rank may be played in one turn.
 *
 * The master `stacking` toggle covers every rank, including wilds — two Wild +4s
 * are a legal same-rank stack exactly like two red 5s. The two draw-chain
 * toggles additionally imply same-turn stacking for the rank they name: a table
 * that allows a +4 to be chained onto a +4 across turns has no reason to forbid
 * a player from firing both of theirs at once, and players consistently read
 * those toggles as "+4s stack". Everything else needs the master toggle.
 */
export function canStackRank(value: Value, config: RuleConfig): boolean {
  if (config.stacking) return true;
  if (value === "draw2") return config.stackDraw2OnDraw2;
  if (value === "wild_draw4") return config.stackDraw4OnDraw2Or4;
  return false;
}

/**
 * Master playability check used for validation and for dimming cards in the UI.
 * Accounts for an active draw stack.
 */
export function canPlay(
  card: Card,
  opts: {
    activeColor: Color | null;
    discardTop: Card | null;
    pendingDraw: number;
    config: RuleConfig;
  },
): boolean {
  const { activeColor, discardTop, pendingDraw, config } = opts;
  if (pendingDraw > 0) {
    const topValue = discardTop?.value;
    if (!topValue || !isDrawCard(topValue)) return false;
    return canContinueStack(card, topValue, config);
  }
  return isPlayableNormally(card, activeColor, discardTop);
}
