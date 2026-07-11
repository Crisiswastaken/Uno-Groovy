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
  fromRot?: number;
  toRot?: number;
  width?: number;
  duration?: number;
  /** A little arc height (px) so the card lofts rather than sliding flat. */
  lift?: number;
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
    setFlights((cur) => [...cur, { ...spec, id }]);
    window.setTimeout(() => {
      setFlights((cur) => cur.filter((f) => f.id !== id));
      onDone?.();
    }, duration + 40);
  }, []);

  return { flights, fly };
}

export function FlightLayer({ flights }: { flights: Flight[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} />
      ))}
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
