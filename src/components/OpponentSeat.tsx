"use client";

import type { ClientView } from "../engine/types";
import { avatarFor } from "../lib/avatars";
import { CardBack } from "./Card";
import { Card as Img } from "./ui/Card";

type PlayerView = ClientView["players"][number];

/* Live opponent seat, styled to match the redesigned table (see GameDemo):
   a grouped avatar + name label, a soft translucent backing that warms when
   it's the player's turn, a fanned stack of card backs, and a count badge.
   Keeps the live-only affordances the mock omits: a disconnected marker and
   the "Catch! no UNO" button. */

/** Rounded avatar tile with an optional turn glow + disconnected marker. */
function Avatar({
  player,
  size,
  glow,
}: {
  player: PlayerView;
  size: number;
  glow: boolean;
}) {
  return (
    <div className="relative">
      <div
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-[16px] card-shadow ${glow ? "turn-glow" : ""}`}
      >
        <Img
          src={avatarFor(player.seat)}
          alt=""
          width={size}
          height={size}
          rounded={false}
          unoptimized
          draggable={false}
          style={{ width: "100%", height: "100%" }}
          className="object-cover pointer-events-none rounded-[18px]"
        />
      </div>
      {!player.connected && (
        <span
          title="disconnected"
          className="absolute -bottom-1 -right-1 grid place-items-center w-4 h-4 bg-uno-cream rounded-full border border-uno-ink/15 text-uno-ink1 shadow-[0_1px_2px_rgba(43,42,39,0.25)]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </span>
      )}
    </div>
  );
}

/** Name label; fills solid ink when it's this player's turn. */
function NamePill({
  name,
  active,
  connected,
}: {
  name: string;
  active: boolean;
  connected: boolean;
}) {
  return (
    <span
      className={`max-w-[7rem] truncate px-2.5 py-0.5 rounded-[10px] text-[11px] font-extrabold leading-none shadow-[0_2px_5px_rgba(43,42,39,0.28)] ${
        active
          ? "bg-uno-ink text-uno-cream"
          : "bg-uno-cream text-uno-ink border-2 border-uno-ink/10"
      } ${connected ? "" : "line-through opacity-70"}`}
    >
      {name}
    </span>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="grid place-items-center min-w-7 h-7 px-1.5 rounded-[9px] bg-uno-cream text-uno-ink text-sm font-extrabold border-2 border-uno-ink/12 shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
      {n}
    </span>
  );
}

export function OpponentSeat({
  player,
  isCurrent,
  orientation,
  onCatch,
}: {
  player: PlayerView;
  isCurrent: boolean;
  /** Layout of the seat relative to the table edge. */
  orientation: "top" | "left" | "right";
  onCatch?: () => void;
}) {
  const count = player.handCount;
  const vertical = orientation !== "top";
  // One more back than the badge count, capped — reads as a held fan, per mock.
  const backs = Math.min(Math.max(count, 1) + 1, 8);

  const identity = (
    <div className="flex flex-col items-center gap-1">
      <Avatar player={player} size={54} glow={isCurrent} />
      <NamePill name={player.displayName} active={isCurrent} connected={player.connected} />
    </div>
  );

  // A translucent backing unifies the seat and warms on the active turn —
  // depth/turn signalled without introducing a new hue.
  const backing = isCurrent
    ? "bg-uno-cream/35 ring-2 ring-uno-ink/10 shadow-[0_6px_18px_rgba(43,42,39,0.16)]"
    : "bg-uno-cream/0";

  const catchBtn = player.isCatchable && onCatch && (
    <button
      onClick={onCatch}
      className="text-[11px] bg-uno-red text-uno-cream font-bold px-2.5 py-1 rounded-full border-2 border-uno-cream shadow-[0_2px_4px_rgba(43,42,39,0.3)] animate-pulse hover:scale-105 transition-transform"
    >
      Catch!
    </button>
  );

  // Left/right seats: cards lie on their side (rotated 90°) and stack down the
  // screen edge, fanned + staggered so they read as a hand seen edge-on.
  if (vertical) {
    const W = 44; // portrait width, pre-rotation
    const boxW = W * 1.5; // landscape footprint of the rotated card
    const step = W * 0.5; // slice of each stacked card left visible
    const mid = (backs - 1) / 2;
    // Each side faces its own player: left tops point left, right tops mirror.
    const base = orientation === "left" ? 90 : -90;
    const sign = orientation === "left" ? 1 : -1;
    return (
      <div className={`flex flex-col items-center gap-2 rounded-[22px] p-2.5 transition-colors ${backing}`}>
        {identity}
        <div className="relative">
          <div className="flex flex-col items-center">
            {Array.from({ length: backs }).map((_, i) => {
              const d = i - mid;
              const rot = base + d * 3.4 * sign; // fan open, mirrored per side
              const x = -Math.abs(d) * 1.6 * sign; // curve the fan away from edge
              return (
                <div
                  key={i}
                  className="relative card-shadow-sm"
                  style={{ width: boxW, height: step, marginTop: i > 0 ? 0 : (W - step) / 2, zIndex: i }}
                >
                  <div
                    className="absolute left-1/2 top-1/2"
                    style={{ transform: `translate(calc(-50% + ${x}px), -50%) rotate(${rot}deg)` }}
                  >
                    <CardBack width={W} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute -bottom-3 -right-3 z-20">
            <CountBadge n={count} />
          </div>
        </div>
        {catchBtn}
      </div>
    );
  }

  // Top seat: portrait cards fanned horizontally with a gentle upward arc.
  const W = 48;
  const mid = (backs - 1) / 2;
  return (
    <div className={`flex items-center gap-3 rounded-[22px] p-2.5 transition-colors ${backing}`}>
      {identity}
      <div className="relative">
        <div className="flex flex-row items-end">
          {Array.from({ length: backs }).map((_, i) => {
            const d = i - mid;
            const rot = d * 2.6;
            const y = Math.abs(d) * Math.abs(d) * 0.7; // ends dip, center rides up
            return (
              <div
                key={i}
                className="card-shadow-sm"
                style={{
                  marginLeft: i > 0 ? -W * 0.58 : 0,
                  transform: `translateY(${y}px) rotate(${rot}deg)`,
                  transformOrigin: "bottom center",
                  zIndex: i,
                }}
              >
                <CardBack width={W} />
              </div>
            );
          })}
        </div>
        <div className="absolute -bottom-2 right-0 z-20">
          <CountBadge n={count} />
        </div>
      </div>
      {catchBtn}
    </div>
  );
}
