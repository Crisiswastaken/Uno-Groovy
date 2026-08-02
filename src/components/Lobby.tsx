"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientView } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";
import { usePlaySound } from "../hooks/use-play-sound";
import { Card as Img } from "./ui/Card";
import { RoomQr } from "./RoomQr";

export function Lobby({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pressing, setPressing] = useState(false);
  const isHost = view.hostPlayerId === view.youPlayerId;
  const canStart = view.players.length >= 2;

  const copySfx = usePlaySound({ sound: "interaction.confirm" });
  const startSfx = usePlaySound({ sound: "interaction.confirm" });

  // Owns its own timer, so a second tap mid-window extends the message instead
  // of letting the first tap's timeout cut it short.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/${view.roomCode}`
        : view.roomCode;
    // Drop the class for a frame so a repeat tap restarts the animation. Keying
    // the button instead would remount the QR inside it and rebuild its SVG.
    setPressing(false);
    requestAnimationFrame(() => setPressing(true));
    try {
      await navigator.clipboard.writeText(link);
      copySfx.play();
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard can be blocked (insecure origin, denied permission). The
         code stays on screen to be typed in, so there's nothing to recover. */
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
      {/* Branded groovy backdrop (same as the landing), so the lobby reads as a
          proper entry screen rather than the misplaced game-table art. */}
      <Img
        src="/home/background.png"
        alt=""
        fill
        rounded={false}
        priority
        sizes="100vw"
        className="object-cover -z-10 select-none pointer-events-none"
      />

      {/* A frosted sheet lifts the lobby cleanly off the busy background. */}
      <div className="w-full max-w-md bg-uno-cream/80 backdrop-blur-2xl rounded-[28px] border-2 border-white/50 shadow-[0_20px_60px_rgba(43,42,39,0.25)] p-5 sm:p-6">
        {/* Code and QR are one target: both say "this is how you get people in",
            so making them separately clickable would only add a decision. */}
        <button
          onClick={copy}
          onAnimationEnd={() => setPressing(false)}
          aria-label={`Copy the invite link for room ${view.roomCode}`}
          className={[
            pressing && "copy-press",
            "w-full bg-uno-white1 border-2 border-uno-ink/10 hover:border-uno-ink/25",
            "rounded-card px-4 pt-4 pb-3 mb-4 text-center transition-colors cursor-pointer",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="font-display text-4xl sm:text-5xl tracking-[0.1em] leading-none">
            {view.roomCode}
          </div>

          {/* The QR reserves a 10% quiet zone inside its own square (it has to —
              see RoomQr), which reads as dead air on all four sides. The
              negative margin pulls the neighbours into that band so the spacing
              is judged off the code's ink instead. The quiet zone still exists
              and still sits on this pale panel, so scanning is unaffected.
              Percentages here resolve against the wrapper's width, which is the
              QR's width — so this stays proportional at any panel size. */}
          <div className="mx-auto w-full max-w-[17rem]">
            <RoomQr roomCode={view.roomCode} className="-my-[7%]" />
          </div>

          {/* Swaps in place in a fixed-height slot, so nothing below shifts.
              aria-live announces the copy without stealing focus from Start. */}
          <div className="h-4 text-xs" aria-live="polite">
            {copied ? (
              <span className="copy-note font-semibold text-uno-green">
                Link copied
              </span>
            ) : (
              <span className="text-uno-ink2">Tap to copy the invite link</span>
            )}
          </div>
        </button>

        <div className="flex flex-col gap-2 mb-4">
          {view.players.map((p) => (
            <div
              key={p.playerId}
              className="flex items-center justify-between bg-uno-white1 border-2 border-uno-ink/10 rounded-card px-4 py-3"
            >
              <span className="font-semibold">
                {p.displayName}
                {p.playerId === view.youPlayerId && (
                  <span className="text-uno-ink2"> (you)</span>
                )}
              </span>
              {p.playerId === view.hostPlayerId && (
                <span className="text-xs font-bold text-uno-cream bg-uno-red px-2.5 py-0.5 rounded-full">
                  HOST
                </span>
              )}
            </div>
          ))}
          {Array.from({ length: 4 - view.players.length }).map((_, i) => (
            <div
              key={i}
              className="bg-uno-cream/60 border-2 border-dashed border-uno-ink/15 rounded-card px-4 py-3 text-uno-ink2"
            >
              empty seat
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={() => {
              startSfx.play();
              send({ type: "startGame" });
            }}
            disabled={!canStart}
            className="w-full bg-uno-green text-uno-cream font-extrabold uppercase tracking-wide py-3.5 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:hover:brightness-100 transition"
          >
            {canStart ? "Start Game" : "Need 2+ players"}
          </button>
        ) : (
          <div className="text-center text-uno-ink1 py-3">
            Waiting for host to start
          </div>
        )}
      </div>
    </main>
  );
}
