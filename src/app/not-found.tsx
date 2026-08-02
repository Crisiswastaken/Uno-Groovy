"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { usePlaySound } from "../hooks/use-play-sound";
import { HeroBackdrop } from "../components/HeroScene";
import { Card as Img } from "../components/ui/Card";

/**
 * The 404 page.
 *
 * The joke writes itself: the number is a hand of UNO cards. A red 4, a blue 0
 * and a yellow 4 are dealt into a fan on the landing hero's own art — that's the
 * whole page. No panel, no explanatory copy: the cards say "404" louder than a
 * sentence would, and one green pill says how to leave.
 *
 * The backdrop is asked for `plus4={false}` — the scene's scattered wild +4
 * cut-out sat right beside the fan and read as a stray fourth member of it.
 *
 * Fully fluid: clamp() throughout, no breakpoints and no useIsPhone() branch,
 * because HeroBackdrop already picks its own portrait/desktop composition.
 * Splash, ClickSpark, CursorTrail, RotatePrompt and MuteToggle come from the
 * root layout.
 */

/**
 * Entrance choreography, in ms. Nothing on this page appears on frame one —
 * the reveal reads left to right and top to bottom:
 *
 *   0ms      the art washes in (slow, opacity only)
 *   260ms+   the three cards are dealt, 160ms apart, each settling with a tip
 *   1180ms   the pill rises under the settled hand
 *   1360ms   its arrow chip pops — the full stop on the sequence
 *
 * The overlaps are deliberate: the pill starts before the last card has fully
 * settled, so the page arrives as one movement rather than four separate ones.
 * Keyframes live in globals.css under `nf-*`.
 */
const T = {
  backdrop: 0,
  cards: 260,
  cardStep: 160,
  button: 1180,
  chip: 1360,
} as const;

/** `animation-delay` shorthand — the keyframes carry `backwards` fill. */
const at = (ms: number) => ({ animationDelay: `${ms}ms` });

/**
 * The hand that spells 404.
 *
 * `rot`/`arc` are the resting pose (inline, on the middle wrapper — see the
 * note in globals.css), `from` is where the card starts the deal, and
 * `dur`/`float` desync each card's idle bob so the fan never breathes in sync.
 */
const HAND = [
  { src: "/cards/red_4.png", rot: -14, arc: 5, from: "115%", dur: "6.4s", float: "-14px" },
  { src: "/cards/blue_0.png", rot: 2, arc: -7, from: "0%", dur: "7.3s", float: "-20px" },
  { src: "/cards/yellow_4.png", rot: 15, arc: 6, from: "-115%", dur: "6.9s", float: "-15px" },
] as const;

/**
 * Rendered card width, the overlap that fans them, and the corner radius.
 *
 * The cards are the page's whole subject, so they're sized as a hero rather
 * than as decor: ~27vw on a phone, capped at 13rem so they don't turn cartoonish
 * on a wide monitor. The overlap scales with them, otherwise the fan splays
 * apart at the large end and stacks into a pile at the small end.
 *
 * ui/Card.tsx rounds to ~10% of the rendered width, but it can only do that
 * when `width` is a plain number — ours is a clamp() expression (the intrinsic
 * 660×1029 is passed only so Next can reserve the aspect ratio), so a 66px
 * radius would come out of it. Compute the same 10% in CSS instead, off the
 * width the card is actually painted at, so it matches every other card in the
 * app at any size.
 */
const CARD_W = "clamp(6rem, 27vw, 13rem)";
const CARD_RADIUS = `calc(${CARD_W} * 0.1)`;

export default function NotFound() {
  const router = useRouter();
  const tap = usePlaySound({ sound: "interaction.tap" });
  const hover = usePlaySound({ sound: "interaction.subtle" });

  return (
    // overflow-x-clip (not hidden) so the tilted outer cards can't widen the
    // page while the document stays free to scroll on a short viewport.
    <main className="relative min-h-screen w-full overflow-x-clip flex flex-col items-center justify-center gap-[clamp(1.75rem,6vh,3.25rem)] px-5 py-[clamp(3rem,9vh,5rem)]">
      {/* wordmark off — the hand is what belongs in that spot; +4 off so the
          backdrop's loose card doesn't read as part of the hand. */}
      <div className="nf-backdrop" style={at(T.backdrop)}>
        <HeroBackdrop wordmark={false} plus4={false} />
      </div>

      {/* The only text on the page. The hand carries the meaning visually, but a
          screen reader needs it said once, properly. */}
      <h1 className="sr-only">404 — page not found</h1>

      <Hand />

      {/* The green pill: the landing PLAY button's shape in the go-color,
          matching RoundEnd's continue action. */}
      <button
        onClick={() => {
          tap.play();
          router.push("/");
        }}
        onMouseEnter={() => hover.play()}
        style={at(T.button)}
        className="nf-pill group flex items-center justify-center gap-[clamp(0.7rem,3vw,1.1rem)] rounded-full bg-uno-green text-uno-ink border-[3px] border-uno-ink pl-[clamp(1.4rem,6vw,2.2rem)] pr-[clamp(0.4rem,1.6vw,0.6rem)] py-[clamp(0.4rem,1.6vw,0.6rem)] shadow-[0_6px_0_rgba(43,42,39,0.3),0_14px_22px_rgba(43,42,39,0.24)] hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(43,42,39,0.3)] transition"
      >
        <span className="font-display uppercase leading-none tracking-[0.04em] text-[clamp(1.05rem,4.6vw,1.5rem)] mt-[0.18em]">
          Back Home
        </span>
        <span
          aria-hidden
          style={at(T.chip)}
          className="nf-chip grid place-items-center rounded-full bg-uno-red text-uno-cream shrink-0 w-[clamp(2rem,8.5vw,2.75rem)] h-[clamp(2rem,8.5vw,2.75rem)] transition-transform group-hover:translate-x-[8%]"
        >
          <ArrowRight />
        </span>
      </button>
    </main>
  );
}

/* ------------------------------------------------------------------ Hand --- */

/**
 * Three cards overlapped into a fan, exactly like a held hand.
 *
 * Three nested elements per card, and the split matters:
 *   outer  — the deal-in animation (`backwards` fill, ends at identity) plus the
 *            hover lift, which only works BECAUSE the fill releases the transform
 *            when the deal finishes.
 *   middle — the resting rotate + arc offset (inline; a rotate utility here
 *            would be clobbered by the animation).
 *   inner  — the shared idle bob (.decor-float), reused from the landing decor.
 *
 * Cards are width-driven with height auto (the art is 660×1029, ratio 1.559 —
 * never force an aspect-ratio on a card). `rounded={false}` opts out of
 * ui/Card.tsx's radius only to replace it with a correctly-scaled one — see
 * CARD_RADIUS above.
 *
 * The row is centred on the flex axis, and the tilts are near-symmetric
 * (-14°/+15°) so the fan's optical centre lands on the page's centre too.
 */
function Hand() {
  return (
    <div
      role="img"
      aria-label="404"
      className="flex items-end justify-center select-none"
    >
      {HAND.map((c, i) => (
        <div
          key={c.src}
          className="nf-deal transition-transform duration-200 hover:-translate-y-[6%] [&:not(:first-child)]:-ml-[clamp(1.1rem,5.5vw,2.4rem)]"
          style={
            {
              width: CARD_W,
              zIndex: i,
              "--nf-from": c.from,
              ...at(T.cards + i * T.cardStep),
            } as CSSProperties
          }
        >
          <div style={{ transform: `rotate(${c.rot}deg) translateY(${c.arc}%)` }}>
            {/* The idle bob waits out the card's own deal (delay + the 760ms
                keyframe duration) so it picks up exactly where the card lands,
                instead of bobbing underneath a card that's still flying in.
                Their differing --dur values desync them from there. */}
            <div
              className="decor-float decor-shadow"
              style={
                {
                  "--dur": c.dur,
                  "--float": c.float,
                  animationDelay: `${T.cards + i * T.cardStep + 760}ms`,
                } as CSSProperties
              }
            >
              <Img
                src={c.src}
                alt=""
                aria-hidden
                width={660}
                height={1029}
                priority
                rounded={false}
                className="w-full h-auto"
                style={{ borderRadius: CARD_RADIUS }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Icons --- */

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
