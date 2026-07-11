"use client";

import { useState } from "react";
import type { ClientView } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";
import { usePlaySound } from "../hooks/use-play-sound";
import { Card as Img } from "./ui/Card";

export function Lobby({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = view.hostPlayerId === view.youPlayerId;
  const canStart = view.players.length >= 2;

  const copySfx = usePlaySound({ sound: "interaction.confirm" });
  const startSfx = usePlaySound({ sound: "interaction.confirm" });

  const copy = async () => {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/${view.roomCode}`
        : view.roomCode;
    try {
      await navigator.clipboard.writeText(link);
      copySfx.play();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
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
      <div className="w-full max-w-md bg-uno-cream/80 backdrop-blur-2xl rounded-[28px] border-2 border-white/50 shadow-[0_20px_60px_rgba(43,42,39,0.25)] p-6">
        <h1 className="font-display text-5xl mb-1">Lobby</h1>

        <div className="bg-uno-white1 border-2 border-uno-ink/10 rounded-card p-5 mb-6 text-center">
          <div className="text-xs uppercase tracking-widest font-semibold text-uno-ink2">
            Room code
          </div>
          <div className="font-display text-5xl tracking-[0.1em] my-2">
            {view.roomCode}
          </div>
          <button
            onClick={copy}
            className="text-sm font-semibold bg-uno-cream border-2 border-uno-ink/15 hover:bg-uno-white2 hover:border-uno-ink/25 hover:-translate-y-0.5 active:translate-y-0 rounded-full px-4 py-1.5 transition"
          >
            {copied ? "Copied link!" : "Copy invite link"}
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-6">
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
