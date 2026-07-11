"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, ClientView, Color } from "../engine/types";
import { canPlay, isWild } from "../engine/rules";
import type { ClientMessage } from "../shared/protocol";
import { avatarFor } from "../lib/avatars";
import { usePlaySound } from "../hooks/use-play-sound";
import { CardBack, CardFace, swatch } from "./Card";
import { ColorPicker } from "./ColorPicker";
import { OpponentSeat } from "./OpponentSeat";
import { Card as Img } from "./ui/Card";
import { centerOf, FlightLayer, useFlights } from "./cardFlight";

/* Live game table, styled to match the /demo redesign (GameDemo): a focal
   discard on the star, a tucked draw pile, translucent opponent seats, and a
   short glass hand tray with the cards rising out of it. All game state is
   driven by `view` and actions flow through `send`. */

type Orientation = "top" | "left" | "right";

/** Where each opponent sits, by index in turn order. */
function orientationFor(i: number, n: number): Orientation {
  if (n <= 1) return "top";
  if (i === 0) return "left";
  if (i === n - 1) return "right";
  return "top";
}

export function GameTable({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const me = view.players.find((p) => p.playerId === view.youPlayerId);
  const mySeat = me?.seat ?? -1;
  const isMyTurn = view.currentSeat === mySeat && view.phase === "in_round";

  // Sound cues for the local player's own actions. (Opponent plays, turn
  // changes and wins are handled centrally by useGameSounds via view-diffing.)
  const playCardSfx = usePlaySound({ sound: "interaction.confirm" });
  const drawSfx = usePlaySound({ sound: "interaction.tap" });
  const passSfx = usePlaySound({ sound: "interaction.subtle" });
  const selectSfx = usePlaySound({ sound: "interaction.subtle" });
  const unoSfx = usePlaySound({ sound: "notification.success" });
  const catchSfx = usePlaySound({ sound: "notification.warning" });

  const opponents = useMemo(() => {
    const n = view.players.length;
    const ordered = [];
    for (let i = 1; i < n; i++) {
      const seat = (((mySeat + i) % n) + n) % n;
      const p = view.players.find((pl) => pl.seat === seat);
      if (p) ordered.push(p);
    }
    return ordered;
  }, [view.players, mySeat]);

  const seats = useMemo(() => {
    const left: typeof opponents = [];
    const right: typeof opponents = [];
    const top: typeof opponents = [];
    opponents.forEach((p, i) => {
      const o = orientationFor(i, opponents.length);
      (o === "left" ? left : o === "right" ? right : top).push(p);
    });
    return { left, right, top };
  }, [opponents]);

  const myHand = view.yourHand;
  const stackingOn = view.config.stacking;
  const mustPlay = view.pendingPass?.mustPlay ?? false;
  const drawnUids = view.pendingPass?.drawnUids ?? [];

  const handByUid = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of myHand) m.set(c.uid, c);
    return m;
  }, [myHand]);

  /** True if `card` can legally open a turn right now (draw stack + forcePlay). */
  const canOpenWith = (card: Card) =>
    isMyTurn &&
    canPlay(card, {
      activeColor: view.activeColor,
      discardTop: view.discardTop,
      pendingDraw: view.pendingDraw,
      config: view.config,
    }) &&
    (!mustPlay || drawnUids.includes(card.uid));

  // Stacking selection — uids in click order; the first sets the shared rank.
  const [selected, setSelected] = useState<string[]>([]);
  const selRank = selected.length ? handByUid.get(selected[0])?.value ?? null : null;

  // Drop the selection whenever the turn or the board shifts under us.
  useEffect(() => {
    setSelected([]);
  }, [isMyTurn, view.discardTop?.uid, view.currentSeat]);

  // Cards awaiting a color pick (a wild being played), as uids; null when none.
  const [pendingWild, setPendingWild] = useState<string[] | null>(null);

  // Announce, to everyone but the player who chose it, the color picked when a
  // wild / wild-draw-4 lands on the pile.
  const [wildPopup, setWildPopup] = useState<{ color: Color; key: number } | null>(null);
  const myWildUid = useRef<string | null>(null); // a wild I just played — skip its popup
  const lastWildUid = useRef<string | null>(null);
  useEffect(() => {
    const top = view.discardTop;
    if (!top || !isWild(top.value) || !view.activeColor) return;
    if (top.uid === lastWildUid.current) return; // already announced this one
    lastWildUid.current = top.uid;
    if (top.uid === myWildUid.current) return; // I'm the one who chose it
    setWildPopup({ color: view.activeColor, key: Date.now() });
    const t = setTimeout(() => setWildPopup(null), 1700);
    return () => clearTimeout(t);
  }, [view.discardTop, view.activeColor]);

  // Card-flight overlay (hand -> discard on a play, draw pile -> hand on a draw).
  const { flights, fly } = useFlights();
  // A uid I just launched toward the discard; its landing flight replaces the
  // pile's own drop-in so the card reads as one continuous motion.
  const flewToDiscard = useRef<string | null>(null);

  const sendPlay = (uids: string[], color?: Color) => {
    if (uids.length === 0) return;
    playCardSfx.play(); // a satisfying "commit" the moment a card leaves the hand

    // Launch each played card from its slot in the hand onto the discard, before
    // the authoritative update removes it. Capture rects up front (the cards are
    // still mounted now).
    const to = centerOf("[data-discard]");
    const froms = uids.map((u) => centerOf(`[data-hand-uid="${u}"]`));
    let launched = false;
    uids.forEach((uid, i) => {
      const from = froms[i];
      const c = handByUid.get(uid);
      if (from && to && c) {
        fly({ card: c, from, to, toRot: -6, width: 150, duration: 340, lift: 44 });
        launched = true;
      }
    });
    // Only hand the landing over to the flight if one actually took off; else
    // let the pile keep its own drop-in so the card is never truly abrupt.
    if (launched) flewToDiscard.current = uids[uids.length - 1];

    if (uids.length === 1) send({ type: "playCard", uid: uids[0], chosenColor: color });
    else send({ type: "playCards", uids, chosenColor: color });
    setSelected([]);
  };

  /** Fly a face-down card off the draw pile into the hand, then draw for real. */
  const flyDrawToHand = (count = 1) => {
    const from = centerOf("[data-draw]");
    if (!from) return;
    const to =
      centerOf("[data-hand-target]") ?? { x: from.x, y: window.innerHeight - 90 };
    const n = Math.min(Math.max(1, count), 6);
    for (let i = 0; i < n; i++) {
      window.setTimeout(
        () => fly({ card: null, from, to, width: 100, duration: 360, lift: 28 }),
        i * 90,
      );
    }
  };

  const handleDraw = () => {
    drawSfx.play();
    flyDrawToHand(1);
    send({ type: "drawCard" });
  };

  // Auto-resolve a draw penalty: when it's my turn, a +2/+4 stack is pending,
  // and I hold nothing that can continue it, the cards are handed to me
  // automatically (with a flight) instead of forcing a manual click on the
  // pile. If I *can* stack, leave the choice to me.
  const autoDrawGuard = useRef<string>("");
  useEffect(() => {
    if (!isMyTurn || view.pendingDraw <= 0 || view.pendingPass) return;
    const canRespond = myHand.some((c) => canOpenWith(c));
    if (canRespond) return;
    const key = `${view.discardTop?.uid ?? ""}:${view.pendingDraw}`;
    if (autoDrawGuard.current === key) return;
    autoDrawGuard.current = key;
    flyDrawToHand(view.pendingDraw);
    const t = window.setTimeout(() => send({ type: "drawCard" }), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, view.pendingDraw, view.pendingPass, view.discardTop?.uid]);

  /** Commit a set of cards; wilds route through the color picker first. */
  const commit = (uids: string[]) => {
    const cards = uids.map((u) => handByUid.get(u)).filter(Boolean) as Card[];
    if (cards.length === 0 || !cards.some(canOpenWith)) return;
    if (isWild(cards[cards.length - 1].value)) setPendingWild(uids);
    else sendPlay(uids);
  };

  // Tappable if it's a legal opener, or (mid-stack) matches the selected rank.
  const cardClickable = (card: Card) =>
    canOpenWith(card) ||
    (stackingOn && selected.length > 0 && card.value === selRank);

  const onCardClick = (card: Card) => {
    if (!isMyTurn) return;

    if (!stackingOn) {
      if (canOpenWith(card)) commit([card.uid]);
      return;
    }

    if (selected.length === 0) {
      if (!canOpenWith(card)) return;
      const sameRank = myHand.filter((c) => c.value === card.value);
      if (sameRank.length <= 1) commit([card.uid]); // nothing to stack — just play
      else {
        selectSfx.play();
        setSelected([card.uid]); // enter selection
      }
      return;
    }

    if (card.value !== selRank) {
      // Tapped a different rank — switch the selection to it.
      if (!canOpenWith(card)) return;
      const sameRank = myHand.filter((c) => c.value === card.value);
      if (sameRank.length <= 1) commit([card.uid]);
      else {
        selectSfx.play();
        setSelected([card.uid]);
      }
      return;
    }

    // Same rank — toggle in/out of the stack.
    selectSfx.play();
    setSelected((sel) =>
      sel.includes(card.uid) ? sel.filter((u) => u !== card.uid) : [...sel, card.uid],
    );
  };

  const confirmWild = (color: Color) => {
    if (pendingWild) {
      // Remember the wild I'm playing so its own color popup is suppressed for me.
      myWildUid.current = pendingWild[pendingWild.length - 1];
      sendPlay(pendingWild, color);
    }
    setPendingWild(null);
  };

  const selectionPlayable = selected.some((u) => {
    const c = handByUid.get(u);
    return c ? canOpenWith(c) : false;
  });

  const canDraw = isMyTurn && !view.pendingPass;
  const canPass = isMyTurn && !!view.pendingPass && !mustPlay;
  // UNO is called on your last-but-one card — only ever with a single card left.
  const canCallUno = myHand.length === 1 && !me?.hasCalledUno;

  const renderSeat = (p: (typeof opponents)[number], o: Orientation) => (
    <OpponentSeat
      key={p.playerId}
      player={p}
      orientation={o}
      isCurrent={view.currentSeat === p.seat}
      onCatch={() => {
        catchSfx.play();
        send({ type: "catchMissedUno", targetPlayerId: p.playerId });
      }}
    />
  );

  return (
    <main className="fixed inset-0 overflow-hidden select-none font-body">
      {/* Top seats */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-10">
        {seats.top.map((p) => renderSeat(p, "top"))}
      </div>

      {/* Left seats */}
      <div className="absolute left-7 top-[45%] -translate-y-1/2 flex flex-col gap-8">
        {seats.left.map((p) => renderSeat(p, "left"))}
      </div>

      {/* Right seats */}
      <div className="absolute right-7 top-[45%] -translate-y-1/2 flex flex-col gap-8">
        {seats.right.map((p) => renderSeat(p, "right"))}
      </div>

      {/* Center piles — discard dead-center on the star, draw pile tucked left. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid place-items-center">
          {view.activeColor && (
            <span
              aria-hidden
              className="focal-halo absolute left-1/2 top-1/2 -z-10 rounded-full blur-2xl pointer-events-none"
              style={{
                width: 300,
                height: 300,
                background: `radial-gradient(circle, ${swatch[view.activeColor]}55 0%, ${swatch[view.activeColor]}22 40%, transparent 70%)`,
              }}
            />
          )}

          <DirectionArrows direction={view.direction} activeColor={view.activeColor} />

          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-12">
            <DrawPile
              count={view.drawPileCount}
              pendingDraw={view.pendingDraw}
              canDraw={canDraw}
              onDraw={handleDraw}
            />
          </div>

          <DiscardPile
            top={view.discardTop}
            activeColor={view.activeColor}
            drop={view.discardTop?.uid !== flewToDiscard.current}
          />
        </div>
      </div>

      {/* Bottom hand tray — a short glass slab the cards rise out of. */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[860px]">
        <div className="relative bg-uno-cream/45 backdrop-blur-2xl rounded-t-[30px] border-t border-x border-white/45 shadow-[0_-10px_44px_rgba(43,42,39,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] pl-4 pr-5 pt-2 pb-4">
          <div className="flex items-end gap-2">
            {/* You — the local player. */}
            <div className="flex flex-col items-center gap-1 pb-3 shrink-0 z-10">
              <MyAvatar seat={mySeat} glow={isMyTurn} />
              <span className="px-2.5 py-0.5 rounded-[10px] bg-uno-ink text-uno-cream text-[11px] font-extrabold leading-none shadow-[0_2px_5px_rgba(43,42,39,0.3)]">
                You
              </span>
            </div>

            {/* Hand */}
            <div className="flex-1 min-w-0" data-hand-target>
              <Hand
                cards={myHand}
                isPlayable={cardClickable}
                isHighlighted={(c) => mustPlay && drawnUids.includes(c.uid)}
                isSelected={(c) => selected.includes(c.uid)}
                onPlay={onCardClick}
              />
            </div>

            {/* Contextual actions, right by the hand so they're easy to reach. */}
            {(selected.length > 0 || canPass) && (
              <div className="flex flex-col items-stretch gap-2 pb-3 shrink-0 z-10 w-[96px]">
                {selected.length > 0 ? (
                  <>
                    <button
                      onClick={() => commit(selected)}
                      disabled={!selectionPlayable}
                      className="bg-uno-green text-uno-cream font-extrabold text-sm uppercase tracking-wide px-3 py-2.5 rounded-[16px] border-2 border-uno-ink/15 shadow-[0_4px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none transition"
                    >
                      Play {selected.length}
                    </button>
                    <button
                      onClick={() => setSelected([])}
                      className="text-uno-ink1 hover:text-uno-ink font-bold text-xs py-1 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      passSfx.play();
                      send({ type: "passAfterDraw" });
                    }}
                    className="bg-uno-cream text-uno-ink font-extrabold text-sm uppercase tracking-wide px-3 py-2.5 rounded-[16px] border-2 border-uno-ink/15 shadow-[0_4px_0_rgba(43,42,39,0.22)] hover:-translate-y-0.5 hover:bg-uno-white2 active:translate-y-[2px] active:shadow-none transition"
                  >
                    Pass
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* UNO! call, bottom-right. */}
      <UnoButton
        className="absolute bottom-8 right-10"
        enabled={canCallUno}
        onClick={() => {
          unoSfx.play();
          send({ type: "callUno" });
        }}
      />

      {pendingWild && (
        <ColorPicker onPick={confirmWild} onCancel={() => setPendingWild(null)} />
      )}

      {wildPopup && <WildColorPopup key={wildPopup.key} color={wildPopup.color} />}

      <FlightLayer flights={flights} />
    </main>
  );
}

/* ------------------------------------------------------- Wild color popup --- */

/** A brief centered flourish shown to everyone else when a wild sets the color. */
function WildColorPopup({ color }: { color: Color }) {
  const label = color[0].toUpperCase() + color.slice(1);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="wild-pop flex flex-col items-center gap-4">
        <span
          className="grid place-items-center w-32 h-32 rounded-full border-[6px] border-uno-cream shadow-[0_16px_50px_rgba(43,42,39,0.45)]"
          style={{ background: swatch[color] }}
        >
          <span
            aria-hidden
            className="w-16 h-16 rounded-full"
            style={{ background: "rgba(241,231,220,0.35)" }}
          />
        </span>
        <span className="font-display text-4xl text-uno-cream tracking-wide drop-shadow-[0_3px_8px_rgba(43,42,39,0.6)]">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Local avatar --- */

function MyAvatar({ seat, glow }: { seat: number; glow: boolean }) {
  const size = 52;
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-[18px] card-shadow ${glow ? "turn-glow" : ""}`}
    >
      <Img
        src={avatarFor(seat)}
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

/* ------------------------------------------------------------- Draw pile --- */

function DrawPile({
  count,
  pendingDraw,
  canDraw,
  onDraw,
}: {
  count: number;
  pendingDraw: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  const W = 108; // a touch smaller than the discard, so the discard reads focal
  const layers = Math.min(4, Math.max(1, Math.ceil(count / 8)));
  return (
    <button
      type="button"
      onClick={() => canDraw && onDraw()}
      disabled={!canDraw}
      data-draw
      style={{ width: W, height: Math.round((W * 3) / 2) + 10 }}
      className={`group relative shrink-0 transition-transform duration-200 ${
        canDraw ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
      }`}
      title="Draw a card"
    >
      {/* Soft contact shadow grounding the deck on the table. */}
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-md pointer-events-none"
        style={{ width: W * 0.82, height: 20, bottom: -10, zIndex: 0, background: "rgba(43,42,39,0.30)" }}
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
      {pendingDraw > 0 && (
        <span className="absolute -top-2 -right-2 z-20 bg-uno-red text-uno-cream text-xs font-extrabold px-2.5 py-1 rounded-full border-2 border-uno-cream shadow-[0_2px_5px_rgba(43,42,39,0.35)]">
          +{pendingDraw}
        </span>
      )}
      {canDraw && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-uno-ink/85 text-uno-cream text-[10px] font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
          DRAW
        </span>
      )}
    </button>
  );
}

/* ---------------------------------------------------------- Discard pile --- */

// Cosmetic cards fanned under the live discard, so the pile reads with depth.
const GHOSTS: { card: Card; rot: number; x: number; y: number }[] = [
  { card: { uid: "ghost-g", color: "green", value: "reverse" }, rot: -15, x: -16, y: 6 },
  { card: { uid: "ghost-b", color: "blue", value: "reverse" }, rot: 13, x: 14, y: 2 },
  { card: { uid: "ghost-r", color: "red", value: "reverse" }, rot: -5, x: -3, y: -3 },
];

function DiscardPile({
  top,
  activeColor,
  drop = true,
}: {
  top: Card | null;
  activeColor: Color | null;
  /** Play the drop-in animation. Off when a hand flight already animated it in. */
  drop?: boolean;
}) {
  const W = 150; // the board's primary focal point
  const h = Math.round((W * 3) / 2);
  return (
    <div data-discard className="relative shrink-0" style={{ width: W + 40, height: h + 30 }}>
      {/* Active-color ring bloom hugging the top card. */}
      {activeColor && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-[20px] pointer-events-none"
          style={{
            width: W + 10,
            height: h + 10,
            marginLeft: -(W + 10) / 2,
            marginTop: -(h + 10) / 2,
            transform: "rotate(-6deg)",
            boxShadow: `0 0 0 4px ${swatch[activeColor]}66`,
          }}
        />
      )}

      {GHOSTS.map((g) => (
        <div
          key={g.card.uid}
          className="absolute left-1/2 top-1/2 card-shadow-sm"
          style={{ marginLeft: -W / 2 + g.x, marginTop: -h / 2 + g.y, transform: `rotate(${g.rot}deg)` }}
        >
          <CardFace card={g.card} width={W} />
        </div>
      ))}

      {top && (
        <div
          key={top.uid}
          className={`absolute left-1/2 top-1/2 card-shadow-lg ${drop ? "animate-card-drop" : ""}`}
          style={
            {
              marginLeft: -W / 2,
              marginTop: -h / 2,
              "--rot": "-6deg",
              transform: "rotate(-6deg)",
            } as React.CSSProperties
          }
        >
          <CardFace card={top} width={W} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------- Direction arcs --- */

function DirectionArrows({
  direction,
  activeColor,
}: {
  direction: 1 | -1;
  activeColor: Color | null;
}) {
  // Sit well outside the discard (a larger radius) and take on the current
  // active color, so the flow of play reads at a glance without a separate
  // color chip. Falls back to a neutral ink before the first card lands.
  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 pointer-events-none arrow-drift"
      style={{
        width: 480,
        height: 480,
        color: activeColor ? swatch[activeColor] : "var(--color-uno-ink1)",
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

/* ------------------------------------------------------------ UNO button --- */

function UnoButton({
  className = "",
  enabled,
  onClick,
}: {
  className?: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`pointer-events-none z-20 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!enabled}
        title="Call UNO!"
        className={`pointer-events-auto group relative grid place-items-center px-8 py-3 rounded-[22px] bg-uno-red border-[3px] border-uno-cream shadow-[0_5px_0_rgba(43,42,39,0.28)] transition disabled:opacity-30 disabled:grayscale disabled:shadow-none active:translate-y-[3px] active:shadow-none ${
          enabled ? "hover:-translate-y-0.5 uno-wiggle" : ""
        }`}
      >
        <span className="font-display text-uno-cream text-[34px] leading-none tracking-wide drop-shadow-[0_2px_2px_rgba(43,42,39,0.35)]">
          UNO
        </span>
        {enabled && (
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

/* ----------------------------------------------------------------- Hand --- */

// Tiny deterministic per-card jitter so a held hand never looks mechanically
// even. Keyed by index → stable across renders.
const JITTER = [0.9, -1.4, 0.5, -0.7, 1.2, -0.4, 0.8, -1.1];

/** Arced, overlapping hand that fans and lifts on hover. */
function Hand({
  cards,
  isPlayable,
  isHighlighted,
  isSelected,
  onPlay,
}: {
  cards: Card[];
  isPlayable: (c: Card) => boolean;
  isHighlighted: (c: Card) => boolean;
  isSelected: (c: Card) => boolean;
  onPlay: (c: Card) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // A very quiet tick when the pointer lifts a *playable* card, throttled so a
  // sweep across the fan never machine-guns.
  const hoverSfx = usePlaySound({ sound: "interaction.subtle", volume: 0.5 });
  const lastHoverTs = useRef(0);
  const onHoverCard = (i: number, playable: boolean) => {
    setHover(i);
    if (!playable) return;
    const now = Date.now();
    if (now - lastHoverTs.current < 80) return;
    lastHoverTs.current = now;
    hoverSfx.play();
  };
  const W = 102;
  const n = cards.length;

  if (n === 0) {
    return <div className="flex justify-center items-end h-[128px] text-uno-ink2">no cards</div>;
  }

  const mid = (n - 1) / 2;
  // Tighten overlap as the hand grows so it always fits the tray.
  const overlap = -Math.min(W * 0.52, Math.max(W * 0.3, (n - 6) * 7 + W * 0.34));

  return (
    <div className="flex justify-center items-end h-[128px]" onMouseLeave={() => setHover(null)}>
      {cards.map((card, i) => {
        const canPlayIt = isPlayable(card);
        const selected = isSelected(card);
        const d = i - mid;
        const jit = JITTER[i % JITTER.length];
        const baseRot = d * 3.4 + jit; // wider fan + organic wobble
        const baseY =
          Math.abs(d) * Math.abs(d) * 1.15 + Math.abs(jit) + (canPlayIt ? -10 : 0);

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

        // Selected cards (mid-stack) sit raised and ringed until played.
        if (selected && hover !== i) {
          y -= 30;
          z = Math.max(z, 60);
          lifted = true;
        }

        return (
          <div
            key={card.uid}
            data-hand-uid={card.uid}
            onMouseEnter={() => onHoverCard(i, canPlayIt)}
            className={`relative ${lifted ? "card-shadow-hover" : "card-shadow"}`}
            style={{
              marginLeft: i === 0 ? 0 : overlap,
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
              transformOrigin: "bottom center",
              zIndex: z,
              transition: "transform 220ms cubic-bezier(0.22,1,0.36,1), margin 220ms ease",
            }}
          >
            <CardFace
              card={card}
              width={W}
              playable={canPlayIt}
              highlight={isHighlighted(card) || selected}
              onClick={() => onPlay(card)}
            />
          </div>
        );
      })}
    </div>
  );
}
