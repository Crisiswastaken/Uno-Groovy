"use client";

import { useEffect, useRef, useState } from "react";
import type { Phase } from "../engine/types";

/* The server flips `phase` to round_end the instant the winning card leaves a
   hand, so every other player's board was replaced by the win screen before
   they'd seen the play that ended the round — it just cut, with no explanation.
   This holds the table on screen for a beat after the final card lands, fades it
   out, and only then hands over to <RoundEnd>, whose own `win-*` choreography
   brings the winner's name up first and the rest of the panel after it. */

/** Frozen final board — long enough to read the winning card. */
export const END_HOLD_MS = 1100;
/** Cross-fade out of the table before the win screen arrives. */
export const END_OUTRO_MS = 420;

type Stage = "live" | "hold" | "outro";

export function useEndHold(phase: Phase | undefined): {
  /** The phase to RENDER (still "in_round" while the board is held). */
  shownPhase: Phase | undefined;
  /** True while the held board is fading out. */
  exiting: boolean;
} {
  const [stage, setStage] = useState<Stage>("live");
  const prev = useRef<Phase | undefined>(phase);

  // Detect the transition into an end phase. Only a round that was actually
  // being played gets held — joining a room that's already on the end screen
  // shows it immediately.
  useEffect(() => {
    const was = prev.current;
    prev.current = phase;
    if (was === "in_round" && (phase === "round_end" || phase === "match_end")) {
      setStage("hold");
    } else if (phase === "in_round" || phase === "lobby") {
      setStage("live");
    }
  }, [phase]);

  // The timers live in their own stage-scoped effect. Scheduling them alongside
  // the setState above would tear them down on the very state change they set
  // (the Splash scar in CLAUDE.md §7).
  useEffect(() => {
    if (stage === "live") return;
    const t = window.setTimeout(
      () => setStage((s) => (s === "hold" ? "outro" : "live")),
      stage === "hold" ? END_HOLD_MS : END_OUTRO_MS,
    );
    return () => window.clearTimeout(t);
  }, [stage]);

  return {
    shownPhase: stage === "live" ? phase : "in_round",
    exiting: stage === "outro",
  };
}
