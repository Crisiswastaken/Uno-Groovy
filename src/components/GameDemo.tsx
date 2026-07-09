"use client";

import { useState } from "react";
import type { Card as CardType, Color } from "../engine/types";
import { CardBack, CardFace } from "./Card";
import { Card as Img } from "./ui/Card";

/* --------------------------------------------------------------------------
   STATIC GAME-ROOM DEMO

   A pixel-faithful reconstruction of the target game-room mock, built as a
   throwaway scene on an always-on route (/demo) so the real /room/[code]
   table can be redesigned against it and swapped in later. Everything here is
   hardcoded — no engine, no socket. Cards are rendered exclusively through the
   <CardFace> / <CardBack> components (never raw <img>), per the brief.
-------------------------------------------------------------------------- */

const c = (color: Color | null, value: CardType["value"], id: string): CardType => ({
  uid: id,
  color,
  value,
});

// The player's hand, left-to-right, matching the mock.
const MY_HAND: CardType[] = [
  c("red", "8", "h1"),
  c("red", "1", "h2"),
  c("yellow", "3", "h3"),
  c(null, "wild_draw4", "h4"),
  c("blue", "5", "h5"),
  c("green", "6", "h6"),
];

const DISCARD_TOP = c("yellow", "reverse", "d0");
const ACTIVE_COLOR: Color = "yellow"; // current play color, drives the discard glow

// Cosmetic cards fanned under the live discard, so the pile reads with depth.
const GHOSTS: { card: CardType; rot: number; x: number; y: number }[] = [
  { card: c("green", "reverse", "g1"), rot: -15, x: -16, y: 6 },
  { card: c("blue", "reverse", "g2"), rot: 13, x: 14, y: 2 },
  { card: c("red", "reverse", "g3"), rot: -5, x: -3, y: -3 },
];

// Table roster. `seat` keys the avatar art; `active` marks whose turn it is.
const ACTIVE_SEAT = 2; // it's your turn
const DIRECTION: 1 | -1 = 1; // 1 = clockwise
type SeatDef = {
  name: string;
  seat: number;
  count: number;
  orientation: "top" | "left" | "right";
};
const OPPONENTS: SeatDef[] = [
  { name: "Maya", seat: 1, count: 7, orientation: "top" },
  { name: "Leo", seat: 0, count: 7, orientation: "left" },
  { name: "Sam", seat: 3, count: 6, orientation: "right" },
];

const swatch: Record<Color, string> = {
  red: "#ea6833",
  yellow: "#f8c368",
  green: "#97b16c",
  blue: "#3595c6",
};

export function GameDemo() {
  return (
    <main className="fixed inset-0 overflow-hidden select-none font-body">
      {/* Full-bleed groovy backdrop (the card-back universe as a table). */}
      <Img
        src="/game/background.png"
        alt=""
        fill
        rounded={false}
        priority
        unoptimized
        className="object-cover -z-10 pointer-events-none"
      />

      {/* Demo watermark — makes clear this route is a scratch mock. */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+250px)] text-[11px] font-bold tracking-[0.25em] uppercase text-uno-ink/25 pointer-events-none">
        Demo
      </span>

      {/* ---------------------------------------------------- Opponent seats */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Seat def={OPPONENTS[0]} active={OPPONENTS[0].seat === ACTIVE_SEAT} />
      </div>

      <div className="absolute left-7 top-[45%] -translate-y-1/2">
        <Seat def={OPPONENTS[1]} active={OPPONENTS[1].seat === ACTIVE_SEAT} />
      </div>

      <div className="absolute right-7 top-[45%] -translate-y-1/2">
        <Seat def={OPPONENTS[2]} active={OPPONENTS[2].seat === ACTIVE_SEAT} />
      </div>

      {/* ----------------------------------------------------- Center piles */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid place-items-center">
          {/* Focal halo — a soft cream bloom in the active color under the
              discard, breathing to pull the eye to the current card. */}
          <span
            aria-hidden
            className="focal-halo absolute left-1/2 top-1/2 -z-10 rounded-full blur-2xl pointer-events-none"
            style={{
              width: 300,
              height: 300,
              background: `radial-gradient(circle, ${swatch[ACTIVE_COLOR]}55 0%, ${swatch[ACTIVE_COLOR]}22 40%, transparent 70%)`,
            }}
          />

          <DirectionArrows direction={DIRECTION} />

          {/* Draw pile, tucked to the left of the discard. */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-12">
            <DrawPile />
          </div>

          <DiscardPile />
        </div>
      </div>

      {/* ---------------------------------------------------- Bottom hand tray
          Shorter glass slab; the hand rises out of the top of it so the cards
          — not the container — own the space. */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[860px]">
        <div className="relative bg-uno-cream/45 backdrop-blur-2xl rounded-t-[30px] border-t border-x border-white/45 shadow-[0_-10px_44px_rgba(43,42,39,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] pl-4 pr-5 pt-2 pb-4">
          <div className="flex items-end">
            {/* You — the active player: avatar + name grouped as one unit. */}
            <div className="flex flex-col items-center gap-1 pb-3 shrink-0 z-10">
              <Avatar seat={2} size={52} glow />
              <span className="px-2.5 py-0.5 rounded-[10px] bg-uno-ink text-uno-cream text-[11px] font-extrabold leading-none shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
                You
              </span>
            </div>

            {/* Hand */}
            <div className="flex-1 min-w-0">
              <Hand cards={MY_HAND} />
            </div>
          </div>
        </div>
      </div>

      {/* UNO! call button, bottom-right. Static until the player is down to a
          single card and actually needs to call it. */}
      <UnoButton className="absolute bottom-8 right-10" callable={MY_HAND.length <= 1} />
    </main>
  );
}

/* ============================================================ Opponent seat */

function Seat({ def, active }: { def: SeatDef; active: boolean }) {
  const { name, seat, count, orientation } = def;
  const vertical = orientation !== "top";
  const backs = Math.min(count + 1, 8); // one more back than the badge, as in the mock

  // Avatar + name grouped so they always read as one label.
  const identity = (
    <div className="flex flex-col items-center gap-1">
      <Avatar seat={seat} size={54} glow={active} />
      <NamePill name={name} active={active} />
    </div>
  );

  // A translucent backing unifies the seat and, when active, warms up to show
  // whose turn it is — depth/turn signalled without a new hue.
  const backing = active
    ? "bg-uno-cream/35 ring-2 ring-uno-ink/10 shadow-[0_6px_18px_rgba(43,42,39,0.16)]"
    : "bg-uno-cream/0";

  // Left/right seats: cards lie on their side (rotated 90°) and stack down the
  // screen edge, gently fanned + staggered so they read as a held hand seen
  // edge-on rather than a flat blind.
  if (vertical) {
    const W = 44; // portrait width, pre-rotation
    const boxW = W * 1.5; // landscape footprint (the rotated card's visible width)
    const step = W * 0.5; // slice of each stacked card left visible
    const mid = (backs - 1) / 2;
    // Each side faces its own player: the left seat's tops point left (reads
    // upright from Leo); the right seat mirrors it so the tops point right
    // toward Sam.
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
              const x = -Math.abs(d) * 1.6 * sign; // curve the fan away from the edge
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
    </div>
  );
}

/** Avatar + name label used across every seat for consistent identity. */
function NamePill({ name, active }: { name: string; active: boolean }) {
  return (
    <span
      className={`max-w-[7rem] truncate px-2.5 py-0.5 rounded-[10px] text-[11px] font-extrabold leading-none shadow-[0_2px_5px_rgba(43,42,39,0.28)] ${
        active ? "bg-uno-ink text-uno-cream" : "bg-uno-cream text-uno-ink border-2 border-uno-ink/10"
      }`}
    >
      {name}
    </span>
  );
}

const AVATARS = ["/avatars/AV1.png", "/avatars/AV2.png", "/avatars/AV3.png", "/avatars/AV4.png"];

function Avatar({ seat, size, glow }: { seat: number; size: number; glow?: boolean }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-[18px] card-shadow ${glow ? "turn-glow rounded-[18px]" : ""}`}
    >
      <Img
        src={AVATARS[seat % AVATARS.length]}
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
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="grid place-items-center min-w-7 h-7 px-1.5 rounded-[9px] bg-uno-cream text-uno-ink text-sm font-extrabold border-2 border-uno-ink/12 shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
      {n}
    </span>
  );
}

/* ================================================================ Draw pile */

function DrawPile() {
  const W = 108; // a touch smaller than the discard, so the discard reads as focal
  const layers = 4;
  return (
    <button
      type="button"
      style={{ width: W, height: Math.round((W * 3) / 2) + 10 }}
      className="group relative shrink-0 cursor-pointer transition-transform duration-200 hover:-translate-y-1"
      title="Draw a card"
    >
      {/* Soft contact shadow grounding the deck on the table. */}
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-md pointer-events-none"
        style={{
          width: W * 0.82,
          height: 20,
          bottom: -10,
          zIndex: 0,
          background: "rgba(43,42,39,0.30)",
        }}
      />
      {Array.from({ length: layers }).map((_, i) => {
        const isTop = i === layers - 1;
        return (
          <div
            key={i}
            className={isTop ? "relative card-shadow" : "absolute inset-x-0 top-0"}
            style={{ transform: `translate(${i * -2}px, ${i * 3}px)`, zIndex: i }}
          >
            <CardBack width={W} />
          </div>
        );
      })}
      {/* Draw-count hint, sitting on the deck's corner. */}
      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-uno-ink/85 text-uno-cream text-[10px] font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
        DRAW
      </span>
    </button>
  );
}

/* ============================================================= Discard pile */

function DiscardPile() {
  const W = 150; // ~14% larger than before — the board's primary focal point
  const h = Math.round((W * 3) / 2);
  return (
    <div className="relative shrink-0" style={{ width: W + 40, height: h + 30 }}>
      {/* Active-color ring bloom hugging the top card. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-[20px] pointer-events-none"
        style={{
          width: W + 10,
          height: h + 10,
          marginLeft: -(W + 10) / 2,
          marginTop: -(h + 10) / 2,
          transform: "rotate(-6deg)",
          boxShadow: `0 0 0 4px ${swatch[ACTIVE_COLOR]}66`,
        }}
      />

      {GHOSTS.map((g) => (
        <div
          key={g.card.uid}
          className="absolute left-1/2 top-1/2 card-shadow-sm"
          style={{
            marginLeft: -W / 2 + g.x,
            marginTop: -h / 2 + g.y,
            transform: `rotate(${g.rot}deg)`,
          }}
        >
          <CardFace card={g.card} width={W} />
        </div>
      ))}

      <div
        className="absolute left-1/2 top-1/2 card-shadow-lg"
        style={{ marginLeft: -W / 2, marginTop: -h / 2, transform: "rotate(-6deg)" }}
      >
        <CardFace card={DISCARD_TOP} width={W} />
      </div>
    </div>
  );
}

/* =========================================================== Direction arcs */

function DirectionArrows({ direction }: { direction: 1 | -1 }) {
  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 pointer-events-none text-uno-ink1/45 arrow-drift"
      style={{
        width: 360,
        height: 360,
        transform: `translate(-50%,-50%) scaleX(${direction === -1 ? -1 : 1})`,
      }}
    >
      <svg viewBox="0 0 320 320" className="w-full h-full" fill="none">
        <path
          d="M250 92 A130 130 0 0 1 250 228"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="1.5 17"
        />
        <path d="M250 228 l-16 -4 l13 -14 z" fill="currentColor" />
        <path
          d="M70 228 A130 130 0 0 1 70 92"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="1.5 17"
        />
        <path d="M70 92 l16 4 l-13 14 z" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ===================================================================== Hand */

// Tiny deterministic per-card jitter so a held hand never looks mechanically
// even. Keyed by index → stable across renders.
const JITTER = [0.9, -1.4, 0.5, -0.7, 1.2, -0.4, 0.8, -1.1];

function Hand({ cards }: { cards: CardType[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 102; // larger cards now that the tray is shorter
  const n = cards.length;
  const mid = (n - 1) / 2;
  const overlap = -W * 0.34;

  return (
    <div
      className="flex justify-center items-end h-[128px]"
      onMouseLeave={() => setHover(null)}
    >
      {cards.map((card, i) => {
        const d = i - mid;
        const jit = JITTER[i % JITTER.length];
        const baseRot = d * 3.4 + jit; // wider fan + organic wobble
        const baseY = Math.abs(d) * Math.abs(d) * 1.15 + Math.abs(jit); // arced bottoms

        let rot = baseRot;
        let y = baseY;
        let scale = 1;
        let z = i;
        let x = 0;
        let lifted = false;

        if (hover === i) {
          rot = jit * 0.3; // settle almost upright
          y = -34;
          scale = 1.16;
          z = 100;
          lifted = true;
        } else if (hover !== null) {
          // Spread neighbors away from the raised card, nearer ones move more.
          const dist = i - hover;
          const push = Math.sign(dist) * Math.max(6, 22 - Math.abs(dist) * 5);
          x = push;
          rot = baseRot + Math.sign(dist) * 2;
          y = baseY + 4;
          z = 50 - Math.abs(dist);
        }

        return (
          <div
            key={card.uid}
            onMouseEnter={() => setHover(i)}
            className={`relative ${lifted ? "card-shadow-hover" : "card-shadow"}`}
            style={{
              marginLeft: i === 0 ? 0 : overlap,
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
              transformOrigin: "bottom center",
              zIndex: z,
              transition:
                "transform 220ms cubic-bezier(0.22,1,0.36,1), margin 220ms ease",
            }}
          >
            <CardFace card={card} width={W} playable onClick={() => {}} />
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================== UNO! button */

function UnoButton({ className = "", callable = false }: { className?: string; callable?: boolean }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <button
        type="button"
        className={`pointer-events-auto group relative grid place-items-center px-8 py-3 rounded-[22px] bg-uno-red border-[3px] border-uno-cream shadow-[0_5px_0_rgba(43,42,39,0.28)] transition hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none ${
          callable ? "uno-wiggle" : ""
        }`}
      >
        <span className="font-display text-uno-cream text-[34px] leading-none tracking-wide drop-shadow-[0_2px_2px_rgba(43,42,39,0.35)]">
          UNO!
        </span>
        {/* comic emphasis burst — only when a call is actually available */}
        {callable && (
          <svg
            aria-hidden
            className="absolute -top-5 -right-5 text-uno-yellow"
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
          >
            {[15, 45, 75].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={20 + Math.cos(a) * 9}
                  y1={20 - Math.sin(a) * 9}
                  x2={20 + Math.cos(a) * 17}
                  y2={20 - Math.sin(a) * 17}
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        )}
      </button>
    </div>
  );
}
