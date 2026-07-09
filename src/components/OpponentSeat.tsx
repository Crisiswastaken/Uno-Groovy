"use client";

import type { ClientView } from "../engine/types";
import { avatarFor } from "../lib/avatars";
import { Card } from "./ui/Card";

type PlayerView = ClientView["players"][number];

/** A single card-back tile used inside opponent fans. */
function MiniBack({ width }: { width: number }) {
  return (
    <div style={{ width }} className="shrink-0 card-shadow-sm">
      <Card
        src="/cards/back.png"
        alt=""
        width={width}
        height={Math.round((width * 3) / 2)}
        style={{ width: "100%", height: "auto" }}
        className="select-none pointer-events-none rounded-[6px]"
        draggable={false}
        unoptimized
      />
    </div>
  );
}

/** Avatar chip + name pill, matching the reference's sticker look. */
function AvatarChip({
  player,
  bob,
}: {
  player: PlayerView;
  bob: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${bob ? "seat-bob" : ""}`}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl overflow-hidden border-[3px] border-uno-cream shadow-[0_3px_8px_rgba(43,42,39,0.28)] bg-uno-white1">
          <Card
            src={avatarFor(player.seat)}
            alt=""
            width={48}
            height={48}
            rounded={false}
            style={{ width: "100%", height: "100%" }}
            className="object-cover select-none pointer-events-none"
            draggable={false}
            unoptimized
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
      <span
        className={`max-w-[7rem] truncate px-2 py-0.5 rounded-full bg-uno-ink text-uno-cream text-[11px] font-bold leading-tight ${
          player.connected ? "" : "line-through opacity-70"
        }`}
      >
        {player.displayName}
      </span>
    </div>
  );
}

/** Small round count badge, bottom-corner of a card fan. */
function CountBadge({ n }: { n: number }) {
  return (
    <span className="grid place-items-center min-w-7 h-7 px-1.5 rounded-full bg-uno-cream text-uno-ink text-sm font-extrabold border-2 border-uno-ink/15 shadow-[0_2px_4px_rgba(43,42,39,0.25)]">
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
  const backs = Math.min(player.handCount, 8);
  const vertical = orientation !== "top";
  const W = vertical ? 40 : 46;

  const fan = (
    <div
      className={`flex ${vertical ? "flex-col" : "flex-row"} ${
        isCurrent ? "" : "opacity-95"
      }`}
    >
      {Array.from({ length: backs }).map((_, i) => {
        // Gentle fan: a touch of rotation that grows toward the ends.
        const mid = (backs - 1) / 2;
        const rot = backs > 1 ? (i - mid) * (vertical ? 1.2 : 2.4) : 0;
        return (
          <div
            key={i}
            style={{
              marginLeft: !vertical && i > 0 ? -W * 0.62 : 0,
              marginTop: vertical && i > 0 ? -W * 1.05 : 0,
              transform: `rotate(${rot}deg)`,
              zIndex: i,
            }}
          >
            <MiniBack width={W} />
          </div>
        );
      })}
    </div>
  );

  const catchBtn = player.isCatchable && onCatch && (
    <button
      onClick={onCatch}
      className="text-[11px] bg-uno-red text-uno-cream font-bold px-2.5 py-1 rounded-full border-2 border-uno-cream shadow-[0_2px_4px_rgba(43,42,39,0.3)] animate-pulse hover:scale-105 transition-transform"
    >
      Catch! no UNO
    </button>
  );

  // Vertical seats (left/right): avatar on top, column of backs below, badge.
  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-2">
        <AvatarChip player={player} bob={isCurrent} />
        <div className="relative flex flex-col items-center">
          {fan}
          <div className="mt-1">
            <CountBadge n={player.handCount} />
          </div>
        </div>
        {catchBtn}
      </div>
    );
  }

  // Top seat: avatar to the left of a horizontal fan, badge at the corner.
  return (
    <div className="flex items-center gap-3">
      <AvatarChip player={player} bob={isCurrent} />
      <div className="relative pb-1">
        {fan}
        <div className="absolute -bottom-2 -right-2">
          <CountBadge n={player.handCount} />
        </div>
      </div>
      {catchBtn}
    </div>
  );
}
