"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Card } from "../engine/types";
import { CardBack, CardFace } from "./Card";

/* ------------------------------------------------------------------------- *
 * Reusable card-flight animation.
 *
 * A single fixed overlay (`<FlightLayer>`) renders cards that glide from one
 * screen point to another — a hand card sailing onto the discard, a card
 * lifting off the draw pile into a hand. Callers describe a flight in viewport
 * coordinates (via `centerOf`) and fire it through the `useFlights` hook; the
 * layer owns the tween and self-cleans when it lands.
 *
 * It's purely cosmetic and additive: the authoritative game state still drives
 * the real piles, so a missed/again-timed flight never desyncs the board.
 * ------------------------------------------------------------------------- */

export interface Point {
  x: number;
  y: number;
}

export interface FlightSpec {
  /** The face to show; `null` flies a face-down back (draws, opponents). */
  card: Card | null;
  from: Point;
  to: Point;
  /** Optional waypoint the card passes through (used by the draw reveal). */
  via?: Point;
  fromRot?: number;
  toRot?: number;
  width?: number;
  duration?: number;
  /** A little arc height (px) so the card lofts rather than sliding flat. */
  lift?: number;
  /**
   * Draw-reveal mode: the card leaves face-down, flips to reveal `card` as it
   * reaches `via` (enlarged at the center), then settles at `to`.
   */
  reveal?: boolean;
}

interface Flight extends FlightSpec {
  id: number;
}

/** Viewport-space center of the first element matching `selector`, or null. */
export function centerOf(selector: string): Point | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const seq = useRef(0);

  const fly = useCallback((spec: FlightSpec, onDone?: () => void) => {
    const id = ++seq.current;
    const duration = spec.duration ?? 340;
    // Reveal flights land ~20ms after `duration` (they start their final leg
    // slightly after mount), so keep the overlay alive a touch longer.
    const linger = spec.reveal ? 120 : 40;
    setFlights((cur) => [...cur, { ...spec, id }]);
    window.setTimeout(() => {
      setFlights((cur) => cur.filter((f) => f.id !== id));
      onDone?.();
    }, duration + linger);
  }, []);

  return { flights, fly };
}

export function FlightLayer({ flights }: { flights: Flight[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      {flights.map((f) =>
        f.reveal && f.card ? (
          <RevealingCard key={f.id} flight={f} />
        ) : (
          <FlyingCard key={f.id} flight={f} />
        ),
      )}
    </div>
  );
}

/**
 * Draw reveal: face-down off the pile, out to a waypoint near the center where
 * it flips up (enlarged) to show its real face, then tucks down into the hand.
 * A tiny three-phase tween (from → via → to) with a Y-axis flip on the way out.
 */
function RevealingCard({ flight }: { flight: Flight }) {
  const width = flight.width ?? 112;
  const total = flight.duration ?? 640;
  const leg1 = Math.round(total * 0.55); // pile -> center + flip
  const leg2 = total - leg1; // center -> hand
  const via = flight.via ?? { x: (flight.from.x + flight.to.x) / 2, y: (flight.from.y + flight.to.y) / 2 };

  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useLayoutEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setPhase(1)));
    const t = window.setTimeout(() => setPhase(2), leg1 + 20);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, [leg1]);

  const p = phase === 0 ? flight.from : phase === 1 ? via : flight.to;
  const scale = phase === 1 ? 1.4 : 1; // bloom at the center
  const rotY = phase === 0 ? 0 : 180; // flip face-up on the way out
  const legMs = phase === 2 ? leg2 : leg1;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width,
        perspective: 900,
        transform: `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${scale})`,
        transition: `transform ${legMs}ms cubic-bezier(0.33, 0, 0.2, 1)`,
        willChange: "transform",
      }}
      className="card-shadow"
    >
      <div
        style={{
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotY}deg)`,
          transition: `transform ${leg1}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        <div style={{ backfaceVisibility: "hidden" }}>
          <CardBack width={width} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {flight.card && <CardFace card={flight.card} width={width} />}
        </div>
      </div>
    </div>
  );
}

function FlyingCard({ flight }: { flight: Flight }) {
  const [landed, setLanded] = useState(false);
  const width = flight.width ?? 120;
  const duration = flight.duration ?? 340;
  const fromRot = flight.fromRot ?? 0;
  const toRot = flight.toRot ?? 0;
  const lift = flight.lift ?? 26;

  // Kick the transition on the frame after mount so the browser tweens from the
  // start transform rather than snapping straight to the end.
  useLayoutEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setLanded(true)));
    return () => cancelAnimationFrame(r);
  }, []);

  const p = landed ? flight.to : flight.from;
  const rot = landed ? toRot : fromRot;
  // Midpoint loft: pull the card up toward the viewer at the animation's peak
  // via a scale bump; combined with easing this reads as a gentle arc.
  const scale = landed ? 1 : 1.08;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width,
        transform: `translate3d(${p.x}px, ${p.y - (landed ? 0 : lift)}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`,
        transition: `transform ${duration}ms cubic-bezier(0.33, 0, 0.2, 1)`,
        willChange: "transform",
      }}
      className="card-shadow"
    >
      {flight.card ? (
        <CardFace card={flight.card} width={width} />
      ) : (
        <CardBack width={width} />
      )}
    </div>
  );
}
