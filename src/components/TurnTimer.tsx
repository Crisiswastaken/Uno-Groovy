"use client";

import { useEffect, useState } from "react";

/* Turn countdown — rendered as the active avatar's own border: a rounded-rect
   stroke that hugs the avatar at the same corner radius and depletes as the
   clock runs down, warming to the alert red near the end. It doubles as the
   "whose turn is it" cue. Purely presentational: the server owns the real
   deadline and the auto-pass, this just visualizes `deadline` (epoch ms). */

/** Total turn length, kept in step with the server's TURN_TIMEOUT_MS. */
export const TURN_TOTAL_MS = 30_000;
/** Below this, the border turns red. */
const URGENT_MS = 10_000;

/** Live milliseconds left until `deadline`, or null when there's no deadline. */
function useRemaining(deadline: number | null): number | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (deadline == null) return;
    const id = window.setInterval(() => tick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (deadline == null) return null;
  return Math.max(0, deadline - Date.now());
}

export function CountdownRing({
  deadline,
  size,
  radius,
  total = TURN_TOTAL_MS,
}: {
  deadline: number | null;
  /** Side length of the (square) avatar the border traces. */
  size: number;
  /** The avatar's corner radius, so the border matches exactly. */
  radius: number;
  total?: number;
}) {
  const remaining = useRemaining(deadline);
  if (remaining == null) return null;

  const frac = Math.max(0, Math.min(1, remaining / total));
  const urgent = remaining <= URGENT_MS;

  const stroke = 3;
  const inset = stroke / 2;
  const rx = Math.max(2, radius - inset);
  const color = urgent ? "var(--color-uno-red)" : "var(--color-uno-ink)";

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      className="pointer-events-none absolute left-0 top-0"
    >
      {/* Faint full-border track so the depletion reads. */}
      <rect
        x={inset}
        y={inset}
        width={size - stroke}
        height={size - stroke}
        rx={rx}
        ry={rx}
        fill="none"
        stroke="rgba(43,42,39,0.14)"
        strokeWidth={stroke}
      />
      {/* Depleting border. */}
      <rect
        x={inset}
        y={inset}
        width={size - stroke}
        height={size - stroke}
        rx={rx}
        ry={rx}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - frac}
        style={{ transition: "stroke-dashoffset 220ms linear, stroke 300ms ease" }}
      />
    </svg>
  );
}
