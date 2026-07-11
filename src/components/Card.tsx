"use client";

import type { Card as CardType, Color } from "../engine/types";
import { Card } from "./ui/Card";

/** Maps a card to its PNG type-key under /public/cards. */
export function cardAsset(card: CardType): string {
  if (card.value === "wild") return "/cards/wild.png";
  if (card.value === "wild_draw4") return "/cards/wild_draw4.png";
  return `/cards/${card.color}_${card.value}.png`;
}

const WIDTHS = { sm: 60, md: 104, lg: 132 } as const;

export function CardFace({
  card,
  onClick,
  size = "md",
  width,
  playable,
  highlight,
}: {
  card: CardType;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  /** Explicit pixel width; overrides `size`. */
  width?: number;
  /** Card can be played right now — gets an interactive lift affordance. */
  playable?: boolean;
  highlight?: boolean;
}) {
  const w = width ?? WIDTHS[size];
  const interactive = !!onClick && !!playable;
  // Match the card artwork's own corner radius (~10% of width, per ui/Card) so
  // the selection outline is a rounded rect that hugs the card, not a
  // square-cornered ring.
  const radius = Math.max(4, Math.round(w * 0.1));
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      style={{ width: w }}
      className={`card-face relative shrink-0 transition-transform duration-150 ${
        interactive ? "hover:-translate-y-3 cursor-pointer" : "cursor-default"
      } ${highlight ? "-translate-y-2" : ""}`}
    >
      <Card
        src={cardAsset(card)}
        alt={`${card.color ?? "wild"} ${card.value}`}
        width={w}
        height={Math.round((w * 3) / 2)}
        style={{ width: "100%", height: "auto" }}
        className="pointer-events-none select-none"
        draggable={false}
        unoptimized
      />
      {highlight && (
        <span
          aria-hidden
          className="pointer-events-none absolute border-[3px] border-uno-ink"
          style={{ inset: -3, borderRadius: radius + 3 }}
        />
      )}
    </button>
  );
}

export function CardBack({
  size = "sm",
  width,
}: {
  size?: "sm" | "md" | "lg";
  width?: number;
}) {
  const w = width ?? WIDTHS[size];
  return (
    <div style={{ width: w }} className="shrink-0">
      <Card
        src="/cards/back.png"
        alt="card back"
        width={w}
        height={Math.round((w * 3) / 2)}
        style={{ width: "100%", height: "auto" }}
        className="select-none pointer-events-none"
        draggable={false}
        unoptimized
      />
    </div>
  );
}

const swatch: Record<Color, string> = {
  red: "#ea6833",
  yellow: "#f8c368",
  green: "#97b16c",
  blue: "#3595c6",
};

export function ColorDot({ color }: { color: Color | null }) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-2 border-uno-ink/20"
      style={{ background: swatch[color] }}
    />
  );
}

export { swatch };
