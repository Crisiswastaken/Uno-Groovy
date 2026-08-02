"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/**
 * Win-screen confetti — the magicui Confetti component
 * (https://magicui.design/docs/components/confetti) reduced to the one thing
 * this app needs: a burst that fires once, on its own canvas, when a round or
 * match is won.
 *
 * It draws on a dedicated fixed canvas (the same click-through overlay pattern
 * as ClickSpark and CursorTrail) rather than canvas-confetti's global one, so
 * it can't fight those effects or outlive this screen.
 *
 * Palette is the four UNO accents plus the cream, so the burst reads as part of
 * the design system rather than generic party confetti.
 */
const COLORS = ["#f85c1e", "#fbb22d", "#89a557", "#177dc6", "#f1e7dc"];

export function Confetti({ delay = 0 }: { delay?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect the OS setting — a full-screen particle burst is exactly the kind
    // of motion this preference exists to suppress.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // useWorker:false deliberately. The worker path calls
    // transferControlToOffscreen(), which is one-way — and with
    // reactStrictMode on (next.config.mjs) this effect double-invokes in dev,
    // so anything that makes a canvas single-use is a trap. ~230 particles for
    // under two seconds costs nothing on the main thread, where ClickSpark and
    // CursorTrail already run their loops.
    const fire = confetti.create(canvas, {
      resize: true,
      useWorker: false,
    });

    // Two angled cannons from the lower corners, then a centre burst — reads as
    // a celebration rather than a single puff.
    const shots: { delay: number; opts: confetti.Options }[] = [
      {
        delay: 180,
        opts: { particleCount: 70, angle: 60, spread: 62, origin: { x: 0, y: 0.85 }, startVelocity: 52 },
      },
      {
        delay: 180,
        opts: { particleCount: 70, angle: 120, spread: 62, origin: { x: 1, y: 0.85 }, startVelocity: 52 },
      },
      {
        delay: 520,
        opts: { particleCount: 90, spread: 100, origin: { x: 0.5, y: 0.6 }, startVelocity: 38, scalar: 1.05 },
      },
    ];

    // `delay` offsets the whole volley so it can be fired on a cue — the win
    // screen holds it until the winner's name lands.
    const timers = shots.map(({ delay: at, opts }) =>
      setTimeout(() => {
        void fire({ colors: COLORS, ticks: 220, gravity: 0.9, decay: 0.92, ...opts });
      }, delay + at),
    );

    return () => {
      timers.forEach(clearTimeout);
      // Stops in-flight particles and releases the worker.
      fire.reset();
    };
  }, [delay]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 w-full h-full select-none"
    />
  );
}
