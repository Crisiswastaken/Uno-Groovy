"use client";

import { useEffect } from "react";
import type { Color } from "../engine/types";
import { usePlaySound } from "../hooks/use-play-sound";
import { swatch } from "./Card";

/** The four wedges of the wheel, each pinned to a corner and rounded on its
 *  outer edge so together they read as one disc. `origin` points at the wheel
 *  centre so a hovered wedge bulges outward. */
const WEDGES: {
  color: Color;
  pos: string;
  round: string;
  origin: string;
}[] = [
  { color: "red", pos: "top-0 left-0", round: "rounded-tl-full", origin: "bottom right" },
  { color: "yellow", pos: "top-0 right-0", round: "rounded-tr-full", origin: "bottom left" },
  { color: "green", pos: "bottom-0 left-0", round: "rounded-bl-full", origin: "top right" },
  { color: "blue", pos: "bottom-0 right-0", round: "rounded-br-full", origin: "top left" },
];

export function ColorPicker({
  onPick,
  onCancel,
}: {
  onPick: (c: Color) => void;
  onCancel: () => void;
}) {
  // The wheel appears as a modal — a soft "open" whoosh; a "close" on dismiss.
  // (The actual color pick sounds via GameTable's play cue.)
  const openSfx = usePlaySound({ sound: "overlay.open" });
  const closeSfx = usePlaySound({ sound: "overlay.close" });
  useEffect(() => {
    openSfx.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cancel = () => {
    closeSfx.play();
    onCancel();
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-uno-ink/55 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={cancel}
    >
      <div
        className="relative flex flex-col items-center gap-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-5xl text-uno-cream tracking-wide drop-shadow-[0_3px_8px_rgba(43,42,39,0.55)]">
          Pick a color
        </h3>

        {/* The wheel — a cream disc showing through 3px seams between wedges. */}
        <div className="relative w-64 h-64 rounded-full bg-uno-cream shadow-[0_16px_50px_rgba(43,42,39,0.45)]">
          {WEDGES.map((w) => (
            <button
              key={w.color}
              onClick={() => onPick(w.color)}
              aria-label={w.color}
              className={`absolute ${w.pos} ${w.round} w-[calc(50%-3px)] h-[calc(50%-3px)] transition-transform duration-150 ease-out hover:z-10 hover:scale-[1.09] active:scale-105`}
              style={{ background: swatch[w.color], transformOrigin: w.origin }}
            />
          ))}

          {/* Centre hub hides the wedges' sharp inner points and cancels. */}
          <button
            onClick={cancel}
            aria-label="Cancel"
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-16 h-16 rounded-full bg-uno-cream border-2 border-uno-ink/15 text-uno-ink1 shadow-[0_4px_12px_rgba(43,42,39,0.3)] hover:bg-uno-white2 hover:text-uno-ink transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
