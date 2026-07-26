"use client";

import type { ClientView } from "../engine/types";
import type { ClientMessage } from "../shared/protocol";
import { usePlaySound } from "../hooks/use-play-sound";
import { HeroBackdrop } from "./HeroScene";
import { Confetti } from "./Confetti";
import { Card as Img } from "./ui/Card";

/**
 * Entrance choreography, in ms. Everything lands inside ~1.3s: backdrop, then
 * the panel, its text lines, the crown dropping on, the +4 sliding out, the
 * scoreboard rows, and the button last so the eye ends on the thing to click.
 * Keyframes live in globals.css under `win-*`.
 */
const T = {
  backdrop: 0,
  panel: 120,
  label: 320,
  name: 420,
  wins: 520,
  crown: 560,
  card: 660,
  scores: 720,
  scoreRowStep: 80,
  button: 980,
} as const;

/** `animation-delay` shorthand — the keyframes carry `backwards` fill. */
const at = (ms: number) => ({ animationDelay: `${ms}ms` });

/**
 * The end-of-round / end-of-match screen.
 *
 * Three states share one layout, differing only in their label, whether the
 * scoreboard shows, and the continue button's wording:
 *
 *   round_end + singleRound  → "ROUND OVER", no scores,  "Next Round"
 *   round_end + targetScore  → "ROUND OVER", scoreboard, "Next Round"
 *   match_end                → "MATCH OVER", scoreboard, "New Match"
 *
 * It sits on the landing hero's art (<HeroBackdrop />, shared with the landing
 * page) rather than a bare cream field, and the winner's NAME is the hero —
 * where the landing puts its UNO wordmark, this puts "<NAME> WINS!".
 */
export function RoundEnd({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  const nextSfx = usePlaySound({ sound: "interaction.confirm" });
  const isHost = view.hostPlayerId === view.youPlayerId;
  const isMatchEnd = view.phase === "match_end";
  const winnerId = isMatchEnd ? view.matchWinnerId : view.roundWinnerId;
  const winner = view.players.find((p) => p.playerId === winnerId);
  const showScores = view.config.scoringMode === "targetScore";

  const ranked = [...view.players].sort(
    (a, b) => (view.scores[b.playerId] ?? 0) - (view.scores[a.playerId] ?? 0),
  );

  return (
    // overflow-x-clip (not hidden) keeps the tilted +4 card from widening the
    // page while leaving the document free to scroll vertically when the
    // scoreboard makes this taller than the viewport.
    <main className="relative min-h-screen w-full overflow-x-clip flex flex-col items-center justify-center gap-[clamp(1.1rem,3.5vh,2rem)] px-5 py-[clamp(3.5rem,10vh,6rem)]">
      {/* wordmark off — the winner's name is what belongs in that spot. */}
      <div className="win-backdrop" style={at(T.backdrop)}>
        <HeroBackdrop wordmark={false} />
      </div>

      <Confetti />

      <WinnerCard
        label={isMatchEnd ? "Match Over" : "Round Over"}
        name={winner?.displayName ?? null}
      />

      {showScores && (
        <Scoreboard
          ranked={ranked}
          scores={view.scores}
          target={view.config.targetScore}
          youPlayerId={view.youPlayerId}
        />
      )}

      {isHost ? (
        <ContinuePill
          label={isMatchEnd ? "New Match" : "Next Round"}
          onClick={() => {
            nextSfx.play();
            send({ type: "startNextRound" });
          }}
        />
      ) : (
        <div
          className="win-rise rounded-full bg-uno-cream/85 backdrop-blur-sm border-2 border-uno-ink/15 px-5 py-2 text-uno-ink1 font-semibold text-sm shadow-[0_3px_0_rgba(43,42,39,0.16)]"
          style={at(T.button)}
        >
          Waiting for host to continue
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------ Winner card --- */

/**
 * The focal panel: a crowned cream slab carrying the winner's name.
 *
 * The name is display-font and set in the accent red, with "WINS!" under it in
 * ink — a two-tone stack that reads at a glance from across a room. Type size
 * steps down by name length so a 3-letter name fills the panel and a 20-letter
 * one still fits (`clamp()` then handles the viewport).
 */
function WinnerCard({ label, name }: { label: string; name: string | null }) {
  const n = name?.trim() ?? "";
  const nameSize =
    n.length <= 5
      ? "clamp(2.9rem, 15vw, 5rem)"
      : n.length <= 8
        ? "clamp(2.3rem, 12vw, 4rem)"
        : n.length <= 12
          ? "clamp(1.8rem, 9vw, 3rem)"
          : "clamp(1.35rem, 6.5vw, 2.2rem)";

  return (
    <div className="relative w-[min(90vw,30rem)]">
      {/* Crown, straddling the panel's top edge. Its centering translate lives
          inside the keyframes, so it carries no -translate-x-1/2 class. */}
      <Crown
        className="win-crown absolute left-1/2 -top-[9%] w-[clamp(3.6rem,17vw,5.5rem)] h-auto z-10 drop-shadow-[0_4px_6px_rgba(43,42,39,0.28)]"
        style={at(T.crown)}
      />

      <div
        className="win-panel relative z-0 bg-uno-cream border-[3px] border-uno-ink rounded-[26px] px-6 pt-[clamp(1.9rem,6vw,2.6rem)] pb-[clamp(1.2rem,4vw,1.8rem)] text-center shadow-[0_9px_0_rgba(43,42,39,0.26),0_24px_46px_rgba(43,42,39,0.3)]"
        style={at(T.panel)}
      >
        <div
          className="win-line flex items-center justify-center gap-2 text-uno-ink font-extrabold uppercase tracking-[0.16em] text-[clamp(0.68rem,2.9vw,0.9rem)]"
          style={at(T.label)}
        >
          <Sparkle className="w-[0.8em] h-[0.8em] text-uno-red shrink-0" />
          {label}
          <Sparkle className="w-[0.8em] h-[0.8em] text-uno-red shrink-0" />
        </div>

        {n ? (
          <>
            <div
              className="win-line font-display uppercase text-uno-red leading-[0.92] mt-1.5 [overflow-wrap:anywhere]"
              style={{ fontSize: nameSize, ...at(T.name) }}
            >
              {n}
            </div>
            {/* No "!" — Vodka Sans has no punctuation glyphs, so it rendered
                as tofu. Same constraint that made room codes letters-only. */}
            <div
              className="win-line font-display uppercase text-uno-ink leading-[0.92]"
              style={{ fontSize: nameSize, ...at(T.wins) }}
            >
              Wins
            </div>
          </>
        ) : (
          <div
            className="win-line font-display uppercase text-uno-ink leading-[0.95] mt-1.5 text-[clamp(1.8rem,9vw,3rem)]"
            style={at(T.name)}
          >
            Round Complete
          </div>
        )}
      </div>

      {/* A wild +4 tucked under the panel's bottom-right corner, echoing the
          landing's scattered cut-outs. Inset far enough that it can't reach the
          viewport edge on a narrow phone. */}
      <Img
        src="/cards/wild_draw4.png"
        alt=""
        width={132}
        height={206}
        priority
        aria-hidden
        // The resting 12° tilt is the last keyframe, not a class — a rotate
        // utility here would be overwritten the moment the animation ends.
        className="win-card pointer-events-none select-none absolute -right-[3%] -bottom-[14%] w-[clamp(3.4rem,15vw,5.2rem)] h-auto drop-shadow-[0_10px_16px_rgba(43,42,39,0.32)]"
        style={at(T.card)}
      />
    </div>
  );
}

/* ------------------------------------------------------------- Scoreboard --- */

function Scoreboard({
  ranked,
  scores,
  target,
  youPlayerId,
}: {
  ranked: { playerId: string; displayName: string }[];
  scores: Record<string, number>;
  target: number;
  youPlayerId: string;
}) {
  return (
    <div className="w-[min(90vw,30rem)] flex flex-col gap-1.5 rounded-[20px] border-[3px] border-uno-ink bg-uno-cream/90 backdrop-blur-sm p-2.5 shadow-[0_6px_0_rgba(43,42,39,0.22),0_16px_30px_rgba(43,42,39,0.22)]">
      {ranked.map((p, i) => {
        const isLeader = i === 0;
        return (
          <div
            key={p.playerId}
            className={`win-rise flex items-center justify-between gap-3 rounded-[13px] px-3.5 py-2 ${
              isLeader ? "bg-uno-yellow/45 border-2 border-uno-ink/15" : "bg-uno-white1/70 border-2 border-transparent"
            }`}
            style={at(T.scores + i * T.scoreRowStep)}
          >
            <span className="flex items-center gap-2 min-w-0 font-bold text-uno-ink">
              <span
                aria-hidden
                className={`grid place-items-center shrink-0 w-5 h-5 rounded-full text-[11px] font-extrabold tabular-nums ${
                  isLeader ? "bg-uno-red text-uno-cream" : "bg-uno-ink/12 text-uno-ink1"
                }`}
              >
                {i + 1}
              </span>
              <span className="truncate">
                {p.displayName}
                {p.playerId === youPlayerId && (
                  <span className="text-uno-ink2 font-semibold"> (you)</span>
                )}
              </span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums text-uno-ink">
              {scores[p.playerId] ?? 0}
              <span className="text-uno-ink2 text-xs font-semibold"> / {target}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Pill --- */

/** The green continue pill — the landing PLAY button's shape in the go-color. */
function ContinuePill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={at(T.button)}
      className="win-rise group flex items-center justify-center gap-[clamp(0.7rem,3vw,1.1rem)] rounded-full bg-uno-green text-uno-ink border-[3px] border-uno-ink pl-[clamp(1.4rem,6vw,2.2rem)] pr-[clamp(0.4rem,1.6vw,0.6rem)] py-[clamp(0.4rem,1.6vw,0.6rem)] shadow-[0_6px_0_rgba(43,42,39,0.3),0_14px_22px_rgba(43,42,39,0.24)] hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(43,42,39,0.3)] transition"
    >
      <span className="font-display uppercase leading-none tracking-[0.04em] text-[clamp(1.05rem,4.6vw,1.5rem)] mt-[0.18em]">
        {label}
      </span>
      <span
        aria-hidden
        className="grid place-items-center rounded-full bg-uno-red text-uno-cream shrink-0 w-[clamp(2rem,8.5vw,2.75rem)] h-[clamp(2rem,8.5vw,2.75rem)] transition-transform group-hover:translate-x-[8%]"
      >
        <ArrowRight />
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- Icons --- */

/**
 * Retro crown. Inline SVG (decorative, viewBox-driven so it scales with its
 * sized container) — there's no crown in /public, and the app has no icon set
 * to borrow one from.
 */
function Crown({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden className={className} style={style}>
      <path
        d="M17 78 L21 28 L40 50 L60 18 L80 50 L99 28 L103 78 Z"
        fill="var(--color-uno-yellow)"
        stroke="var(--color-uno-ink)"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="26" r="7.5" fill="var(--color-uno-yellow)" stroke="var(--color-uno-ink)" strokeWidth="5" />
      <circle cx="60" cy="14" r="8.5" fill="var(--color-uno-yellow)" stroke="var(--color-uno-ink)" strokeWidth="5" />
      <circle cx="99" cy="26" r="7.5" fill="var(--color-uno-yellow)" stroke="var(--color-uno-ink)" strokeWidth="5" />
      <path
        d="M60 54 L67 63 L60 72 L53 63 Z"
        fill="var(--color-uno-red)"
        stroke="var(--color-uno-ink)"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Four-point sparkle flanking the label. */
function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 0c.7 6.4 4.9 10.6 12 12-7.1 1.4-11.3 5.6-12 12-.7-6.4-4.9-10.6-12-12C7.1 10.6 11.3 6.4 12 0Z" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h13M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
