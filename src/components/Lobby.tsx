"use client";

import { useState } from "react";
import type { ClientView } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";

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

  const copy = async () => {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/${view.roomCode}`
        : view.roomCode;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl mb-1">Lobby</h1>
        <p className="text-uno-ink1 text-sm mb-6">
          Waiting for players — host starts when ready (2–4).
        </p>

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
              className="border-2 border-dashed border-uno-ink/15 rounded-card px-4 py-3 text-uno-ink2"
            >
              empty seat
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={() => send({ type: "startGame" })}
            disabled={!canStart}
            className="w-full bg-uno-green text-uno-cream font-extrabold uppercase tracking-wide py-3.5 rounded-card border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:hover:brightness-100 transition"
          >
            {canStart ? "Start Game" : "Need 2+ players"}
          </button>
        ) : (
          <div className="text-center text-uno-ink1 py-3">
            Waiting for host to start…
          </div>
        )}

        <ConfigSummary view={view} />
      </div>
    </main>
  );
}

function ConfigSummary({ view }: { view: ClientView }) {
  const c = view.config;
  const items: [string, string][] = [
    ["Deal size", String(c.dealSize)],
    ["UNO call", c.unoCall ? `on (−${c.unoPenalty})` : "off"],
    ["Stack +2/+2", c.stackDraw2OnDraw2 ? "on" : "off"],
    ["Stack +4", c.stackDraw4OnDraw2Or4 ? "on" : "off"],
    ["Draw rule", c.drawPenaltyBehavior === "drawUntilPlayable" ? "until playable" : "one & pass"],
    ["Force play", c.forcePlay ? "on" : "off"],
    ["Scoring", c.scoringMode === "targetScore" ? `to ${c.targetScore}` : "single round"],
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
      {items.map(([k, v]) => (
        <div
          key={k}
          className="bg-uno-white1 border-2 border-uno-ink/10 rounded-[14px] px-3 py-2 flex justify-between"
        >
          <span className="text-uno-ink2">{k}</span>
          <span className="font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}
