"use client";

import type { ClientView } from "../engine/types";

/* Catching a missed UNO is a race against the vulnerable player's own UNO
   button, and the only control for it used to be an 11px pill tucked under an
   opponent seat — by the time you found it, they'd already called. So the catch
   now has TWO surfaces:

     • CatchAlert — a big, thumb-sized action that lives beside the local
       player's own UNO button (desktop: bottom-left; phone: above the tray), so
       it's always in the same place and always within reach.
     • CatchPill  — the seat-level marker, kept so you can see WHO is exposed,
       but sized to a real touch target instead of a sliver.

   Only one seat can be vulnerable at a time (`unoVulnerableSeat` is a single
   seat), so the alert never has to disambiguate between players. */

type PlayerView = ClientView["players"][number];

/** The one opponent who can be caught right now, if any. */
export function catchableOpponent(view: ClientView): PlayerView | null {
  return (
    view.players.find((p) => p.isCatchable && p.playerId !== view.youPlayerId) ?? null
  );
}

/**
 * The primary catch action. Sized and placed to be hit fast: a wide pill with a
 * 48px+ touch height, a pulsing halo to pull the eye, and the target's name so
 * it's unambiguous who's being caught.
 */
export function CatchAlert({
  name,
  onCatch,
  className = "",
  compact = false,
}: {
  name: string;
  onCatch: () => void;
  className?: string;
  /** Phone sizing — a little tighter, same touch target. */
  compact?: boolean;
}) {
  return (
    <div className={`pointer-events-none z-30 ${className}`}>
      {/* The throb rides on this wrapper, not the button — an infinite transform
          animation on the button itself would swallow its hover/active lift. */}
      <div className="catch-alert relative">
        {/* Attention halo, behind the button. */}
        <span
          aria-hidden
          className="catch-halo absolute -inset-2 rounded-[28px] pointer-events-none"
        />
        <button
          type="button"
          onClick={onCatch}
          title={`Catch ${name} — they never called UNO`}
          className={`pointer-events-auto relative flex flex-col items-center justify-center rounded-[22px] bg-uno-red text-uno-cream border-[3px] border-uno-cream shadow-[0_5px_0_rgba(43,42,39,0.28)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-[3px] active:shadow-none transition ${
            compact ? "min-h-[48px] px-5 py-2" : "min-h-[62px] px-8 py-2.5"
          }`}
        >
          <span
            className={`font-display leading-none tracking-wide drop-shadow-[0_2px_2px_rgba(43,42,39,0.35)] ${
              compact ? "text-[24px]" : "text-[32px]"
            }`}
          >
            Catch
          </span>
          <span
            className={`font-extrabold uppercase tracking-[0.12em] opacity-90 leading-none mt-1 max-w-[10rem] truncate ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {name} · no uno
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * Seat-level marker. Still a real button (catching from the seat works), but its
 * job is mostly to point at WHO is exposed — the fast action is CatchAlert.
 */
export function CatchPill({
  onCatch,
  compact = false,
}: {
  onCatch: () => void;
  compact?: boolean;
}) {
  return (
    <div className="catch-alert">
      <button
        onClick={onCatch}
        className={`bg-uno-red text-uno-cream font-extrabold uppercase tracking-wide rounded-full border-2 border-uno-cream shadow-[0_3px_0_rgba(43,42,39,0.3)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition ${
          // Phone side-seats are only 64px wide — keep the pill inside that box.
          compact ? "text-[11px] min-h-[32px] px-2.5 py-1.5" : "text-sm min-h-[40px] px-5 py-2"
        }`}
      >
        Catch!
      </button>
    </div>
  );
}
