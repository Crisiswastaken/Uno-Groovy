"use client";

import { useEffect, useRef } from "react";

/**
 * Four soft ribbons that trail the pointer side by side, drawn on a fixed,
 * click-through canvas covering the whole viewport. Inspired by the rainbow
 * cursor in github.com/tholman/cursor-effects.
 *
 * Our twist: instead of one rainbow ribbon, four single-colored ribbons — the
 * four UNO accents (red / yellow / green / blue) — ride next to each other,
 * offset perpendicular to the pointer's motion so they stay parallel. Colors
 * stay in sync with the @theme accents in globals.css, matching ClickSpark.
 */
const TRAIL_COLORS = ["#ea6833", "#f8c368", "#97b16c", "#3595c6"];

const TRAIL_LENGTH = 10; // points remembered per ribbon
const LINE_WIDTH = 3;
const MAX_OPACITY = 0.7; // subtle at the head
const SPACING = 3; // px between adjacent ribbons

type Point = { x: number; y: number };

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<Point>({ x: 0, y: 0 });
  const prevCursorRef = useRef<Point>({ x: 0, y: 0 });
  // One tail of points per color.
  const trailsRef = useRef<Point[][]>([]);
  const hasMovedRef = useRef(false);

  // Keep the canvas backing store sized to the viewport (DPR-aware).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Respect users who ask for less motion — skip the effect entirely.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Seed each ribbon so the first frames have something to lerp toward.
    const start = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    cursorRef.current = { ...start };
    prevCursorRef.current = { ...start };
    trailsRef.current = TRAIL_COLORS.map(() =>
      Array.from({ length: TRAIL_LENGTH }, () => ({ ...start })),
    );

    let raf = 0;
    const dpr = () => window.devicePixelRatio || 1;

    const onMove = (e: PointerEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
      hasMovedRef.current = true;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width / dpr(), canvas.height / dpr());

      const cursor = cursorRef.current;
      const prev = prevCursorRef.current;

      // Perpendicular to the pointer's motion, so ribbons sit side by side.
      let dx = cursor.x - prev.x;
      let dy = cursor.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const perpX = -dy;
      const perpY = dx;
      prevCursorRef.current = { ...cursor };

      if (hasMovedRef.current) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = LINE_WIDTH;
      }

      trailsRef.current.forEach((points, ti) => {
        // Center the four ribbons around the cursor: offsets -1.5..+1.5 * spacing.
        const offset = (ti - (TRAIL_COLORS.length - 1) / 2) * SPACING;
        const target = {
          x: cursor.x + perpX * offset,
          y: cursor.y + perpY * offset,
        };

        // Each point eases toward the one ahead, the head toward its target —
        // a springy ribbon that lags smoothly behind the pointer.
        let leader = target;
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          p.x += (leader.x - p.x) * 0.4;
          p.y += (leader.y - p.y) * 0.4;
          leader = p;
        }

        if (!hasMovedRef.current) return;

        ctx.strokeStyle = TRAIL_COLORS[ti];
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i];
          const b = points[i + 1];
          // Fade out toward the tail.
          const t = i / (points.length - 1);
          ctx.globalAlpha = MAX_OPACITY * (1 - t);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}
