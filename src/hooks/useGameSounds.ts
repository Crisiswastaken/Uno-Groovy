"use client";

import * as React from "react";
import { useSensoryUI } from "../lib/provider";
import type { SoundRole } from "../lib/sound-roles";
import type { ClientView, Value } from "../engine/types";

/**
 * Derives sound cues from successive `ClientView` snapshots.
 *
 * The client is server-authoritative and only ever receives whole-state
 * snapshots (no per-event stream), so "opponent played / skip / reverse /
 * your turn / you won" are recovered by diffing the previous view against the
 * next one. Direct actions the *local* player takes (playing, drawing, calling
 * UNO) already play their own sound in the relevant handler — so every cue
 * here is gated on the acting player being an **opponent**, and we emit at most
 * one (prioritised) sound per diff to stay tasteful.
 *
 * Call this once, high in the tree (RoomClient). Passing `null` (no view yet)
 * is safe and no-ops.
 */
export function useGameSounds(view: ClientView | null): void {
  const { playSound } = useSensoryUI();
  const prevRef = React.useRef<ClientView | null>(null);

  React.useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = view;
    if (!view) return;

    // First snapshot for this room — nothing to compare against yet.
    if (!prev) return;

    const mySeat = view.players.find(
      (p) => p.playerId === view.youPlayerId
    )?.seat;
    const isMyTurn = mySeat != null && view.currentSeat === mySeat;
    const wasMyTurn = mySeat != null && prev.currentSeat === mySeat;

    // --- Round / match resolution (highest priority) ----------------------
    const matchJustEnded = !prev.matchWinnerId && !!view.matchWinnerId;
    const roundJustEnded = !prev.roundWinnerId && !!view.roundWinnerId;
    if (matchJustEnded || roundJustEnded) {
      const winner = view.matchWinnerId ?? view.roundWinnerId;
      const iWon = winner === view.youPlayerId;
      void playSound(iWon ? "hero.complete" : "notification.info");
      return;
    }

    // --- A new card hit the discard pile ----------------------------------
    const discardChanged =
      view.discardTop != null &&
      view.discardTop.uid !== prev.discardTop?.uid;

    // Only sound cards *opponents* played — my own plays sound in the handler.
    // The player who just acted is whoever's turn it was in the previous view.
    if (discardChanged && !wasMyTurn) {
      const special = specialRole(view.discardTop!.value);
      if (special) {
        void playSound(special);
        return;
      }
      // Plain card: prefer the "your move" chime if the turn came to me,
      // otherwise a quiet landing tick.
      void playSound(isMyTurn ? "notification.info" : "interaction.subtle");
      return;
    }

    // --- Turn passed to me without a card being played (e.g. a draw+pass) --
    if (isMyTurn && !wasMyTurn) {
      void playSound("notification.info");
    }
  }, [view, playSound]);
}

/** Map a special card value to its cue; null for plain number/wild cards. */
function specialRole(value: Value): SoundRole | null {
  switch (value) {
    case "reverse":
      return "navigation.backward";
    case "skip":
      return "navigation.tab";
    case "draw2":
    case "wild_draw4":
      return "notification.warning";
    default:
      return null;
  }
}
