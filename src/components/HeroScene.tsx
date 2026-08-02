"use client";

import { type CSSProperties } from "react";
import { Card } from "./ui/Card";
import { useIsPhone } from "../hooks/useIsPhone";

/**
 * The groovy hero backdrop — the landing page's art composition, extracted so
 * other full-screen moments can sit on it too (the round/match end screens).
 *
 * Two compositions, one seam:
 *  - desktop: the original 3132×1762 landscape canvas, cover-scaled, with
 *    pointer parallax when a `pointer` is supplied.
 *  - phone:   the portrait canvas from the Figma frame "iPhone 17 - 2"
 *    (node 1:153, file HLSVupE9fIzNI0p2T8i6Yj), transcribed in its own pixel
 *    coordinates so the code stays diffable against the design.
 *
 * Both render as a fixed, click-through layer behind the page (the same
 * `fixed inset-0 -z-10` pattern RoomClient uses for the table background), so a
 * caller just drops <HeroBackdrop /> in and lays its own content on top.
 */

/* ------------------------------------------------------- Desktop canvas --- */

const BG_W = 3132;
const BG_H = 1762;
/** Exported: the landing's PLAY pill is sized against this same unit. */
export const HERO_RATIO = BG_W / BG_H; // ~1.7775
const RATIO_INV = BG_H / BG_W; // ~0.56258
const DESKTOP_BG = "#f8eadb";

/* ------------------------------------------------------ Portrait canvas --- */

const P_W = 806;
const P_H = 1752;
export const HERO_PORTRAIT_RATIO = P_W / P_H; // ~0.46005
const P_RATIO_INV = P_H / P_W; // ~2.17370
/** The design's frame fill. */
const PORTRAIT_BG = "#ffffff";

const ZERO = { x: 0, y: 0 };

/** Shell shared by both scenes: fixed, click-through, clipped, owns `--u`. */
function Backdrop({
  bg,
  ratio,
  children,
}: {
  bg: string;
  ratio: number;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none"
      style={
        {
          backgroundColor: bg,
          // 1u = 1% of the scene's width, so everything scales with the scene.
          // `max()` cover-scales it, so an off-ratio viewport crops rather than
          // letterboxing.
          "--u": `max(1vw, ${ratio.toFixed(5)}vh)`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function HeroBackdrop({
  pointer = ZERO,
  wordmark = true,
  plus4 = true,
}: {
  /** Eased pointer for the desktop parallax; omit for a still backdrop. */
  pointer?: { x: number; y: number };
  /**
   * Draw the UNO wordmark at the scene's centre. Off for the end screens: the
   * winner's name takes that spot, and the logo behind it just read as clutter.
   */
  wordmark?: boolean;
  /**
   * Draw the scattered wild +4 cut-out. Off for the 404 page, whose subject is
   * itself a hand of cards — a second loose card in the art read as a stray
   * member of that hand. Desktop-only; the portrait canvas has no +4 layer.
   */
  plus4?: boolean;
}) {
  const isPhone = useIsPhone();
  return isPhone ? (
    <PortraitScene wordmark={wordmark} />
  ) : (
    <DesktopScene pointer={pointer} wordmark={wordmark} plus4={plus4} />
  );
}

/* -------------------------------------------------------- Desktop scene --- */

function DesktopScene({
  pointer,
  wordmark,
  plus4,
}: {
  pointer: { x: number; y: number };
  wordmark: boolean;
  plus4: boolean;
}) {
  return (
    <Backdrop bg={DESKTOP_BG} ratio={HERO_RATIO}>
      {/* The background canvas' aspect ratio, cover-scaled and centered. All art
          lives inside, positioned in % so the layout is identical at any size. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ width: "calc(var(--u) * 100)", height: `calc(var(--u) * ${100 * RATIO_INV})` }}
      >
        {/* Rainbow — the full-canvas backdrop art (fills the scene exactly). */}
        <Layer src="/home-new/rainbow.png" w={100} h={100} cx={50} cy={50} depth={6} z={0} pointer={pointer} fit="cover" shadow={false} />

        {/* Scattered cut-outs, each sized W/3132 × H/1762 and given its own
            depth + idle float so nothing moves in lockstep. */}
        <Layer src="/home-new/cloud-left.png" w={26.79} h={16.12} cx={5} cy={16} depth={12} rot={0} float={1.0} dur={7.5} delay={0.2} z={2} pointer={pointer} />
        <Layer src="/home-new/cloud-right.png" w={36.21} h={26.11} cx={88} cy={44} depth={16} rot={0} float={1.3} dur={8.4} delay={1.1} z={2} pointer={pointer} />
        <Layer src="/home-new/bottle.png" w={7.44} h={19.35} cx={9.5} cy={55} depth={20} rot={-4} float={1.4} dur={6.8} delay={0.9} z={3} pointer={pointer} />
        <Layer src="/home-new/sunflower.png" w={15.87} h={35.87} cx={86} cy={82} depth={15} rot={2} float={1.2} dur={7.9} delay={0.1} z={3} pointer={pointer} />
        <Layer src="/home-new/pencil.png" w={5.97} h={9.65} cx={34.5} cy={86} depth={24} rot={0} float={1.1} dur={7.1} delay={0.7} z={4} pointer={pointer} />
        <Layer src="/home-new/apple.png" w={4.92} h={9.53} cx={69.5} cy={71} depth={28} rot={5} float={1.3} dur={6.5} delay={1.4} z={4} pointer={pointer} />
        {plus4 && (
          <Layer src="/home-new/plus4.png" w={9.74} h={22.42} cx={25.5} cy={37} depth={32} rot={-7} float={1.5} dur={6.2} delay={0.5} z={5} pointer={pointer} />
        )}
        <Layer src="/home-new/ship.png" w={11.85} h={26.73} cx={8.5} cy={84} depth={36} rot={-3} float={1.6} dur={5.8} delay={0.3} z={5} pointer={pointer} />

        {/* UNO wordmark — the scene anchor, so it drifts the least. */}
        {wordmark && (
          <Layer src="/home-new/uno.png" w={35.44} h={27.81} cx={50.5} cy={48} depth={9} rot={0} float={0.7} dur={9} delay={0.6} z={6} pointer={pointer} shadow={false} />
        )}

        {/* Sparkles — the topmost art layer (above every other element). */}
        <Layer src="/home-new/sparkles.png" w={77.33} h={82.18} cx={50} cy={50} depth={42} rot={0} float={0.6} dur={10} delay={0} z={8} pointer={pointer} shadow={false} />
      </div>

      {/* Solid red top bar — the main shade of red (uno-red), pinned to the
          viewport top so it reads as a bar on every aspect ratio. */}
      <div className="absolute inset-x-0 top-0 bg-uno-red z-40 select-none pointer-events-none" style={{ height: "calc(var(--u) * 1.8)" }} />
    </Backdrop>
  );
}

/* ------------------------------------------------------- Portrait scene --- */

function PortraitScene({ wordmark }: { wordmark: boolean }) {
  return (
    <Backdrop bg={PORTRAIT_BG} ratio={HERO_PORTRAIT_RATIO}>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "calc(var(--u) * 100)",
          height: `calc(var(--u) * ${(100 * P_RATIO_INV).toFixed(4)})`,
        }}
      >
        {/* Layer order is the design's own paint order (bottom → top). Note
            SPARKLES sits UNDER the wordmark and clouds here, unlike desktop. */}
        <PLayer src="/home-new/rainbow.png" x={-1063} y={82} w={2062} h={1123} z={0} fit="cover" shadow={false} />
        <PLayer src="/home-new/sparkles.png" x={-667} y={200} w={1571} h={1448} z={1} shadow={false} float={0.6} dur={10} delay={0} />
        {wordmark && (
          <PLayer src="/home-new/uno.png" x={-19} y={753} w={844} h={245} z={2} shadow={false} float={0.7} dur={9} delay={0.6} />
        )}
        <PLayer src="/home-new/cloud-right.png" x={403} y={1034} w={704} h={221} z={3} float={1.3} dur={8.4} delay={1.1} />
        <PLayer src="/home-new/cloud-left.png" x={-507} y={153} w={839} h={284} z={4} float={1.0} dur={7.5} delay={0.2} />
        <PLayer src="/home-new/ship.png" x={-51} y={1301} w={245} h={293} z={6} float={1.6} dur={5.8} delay={0.3} />
        <PLayer src="/home-new/sunflower.png" x={403} y={1362} w={321} h={463} z={7} float={1.2} dur={7.9} delay={0.1} />
      </div>

      {/* Red bar. In the design it's a frame-anchored rectangle (0,0,806×127);
          pinned to the VIEWPORT rather than the scene so it can't drift out of
          frame on a phone whose aspect ratio crops the scene vertically. */}
      <div
        className="absolute inset-x-0 top-0 bg-uno-red border-b border-uno-ink z-40 select-none pointer-events-none"
        style={{ height: `calc(var(--u) * ${((127 / P_W) * 100).toFixed(4)})` }}
      />
    </Backdrop>
  );
}

/**
 * A desktop art layer. Nested transforms that never fight:
 *   1. outer — placement (cx/cy) + size (w/h, both % of the scene) + centering
 *   2. parallax — the pointer-driven shift, scaled by `depth` (px)
 *   3. tilt — the resting angle (`rot`)
 *   4. `.decor-float` — a slow idle bob (per-item dur/float/delay)
 * The image fills the box with `object-contain` (never distorted); box aspect
 * already matches the art, so it lands pixel-proportional to the background.
 */
function Layer({
  src,
  w,
  h,
  cx,
  cy,
  depth,
  z,
  pointer,
  rot = 0,
  float = 0,
  dur = 8,
  delay = 0,
  shadow = true,
  fit = "contain",
}: {
  src: string;
  w: number;
  h: number;
  cx: number;
  cy: number;
  depth: number;
  z: number;
  pointer: { x: number; y: number };
  rot?: number;
  float?: number;
  dur?: number;
  delay?: number;
  shadow?: boolean;
  fit?: "contain" | "cover";
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${cx}%`, top: `${cy}%`, width: `${w}%`, height: `${h}%`, transform: "translate(-50%, -50%)", zIndex: z }}
    >
      <div
        className="w-full h-full"
        style={{
          transform: `translate3d(${(-pointer.x * depth).toFixed(2)}px, ${(-pointer.y * depth).toFixed(2)}px, 0)`,
          willChange: "transform",
        }}
      >
        <div className="w-full h-full" style={{ transform: `rotate(${rot}deg)` }}>
          <div
            className="decor-float relative w-full h-full"
            style={
              {
                "--dur": `${dur}s`,
                "--float": `calc(var(--u) * ${-float})`,
                animationDelay: `${delay}s`,
              } as CSSProperties
            }
          >
            <Card
              src={src}
              alt=""
              fill
              rounded={false}
              priority
              sizes="100vw"
              className={`${fit === "cover" ? "object-cover" : "object-contain"} ${shadow ? "decor-shadow" : ""}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A portrait art layer, positioned in the DESIGN's own pixel coordinates (Figma
 * frame 806×1752) and converted to percentages of the scene — so each call site
 * reads as a direct transcription of the Figma node's x/y/w/h.
 *
 * The art is the existing `/public/home-new` PNGs: the design reuses them, so
 * there's nothing new to commit (cloud-left is a pixel-exact 1:1 match at
 * 839×284, and every other box is consistent with these files under
 * contain/cover). No parallax — it's driven by `onMouseMove`, which touch never
 * fires.
 */
function PLayer({
  src,
  x,
  y,
  w,
  h,
  z,
  float = 0,
  dur = 8,
  delay = 0,
  shadow = true,
  fit = "contain",
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  float?: number;
  dur?: number;
  delay?: number;
  shadow?: boolean;
  fit?: "contain" | "cover";
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${((x / P_W) * 100).toFixed(4)}%`,
        top: `${((y / P_H) * 100).toFixed(4)}%`,
        width: `${((w / P_W) * 100).toFixed(4)}%`,
        height: `${((h / P_H) * 100).toFixed(4)}%`,
        zIndex: z,
      }}
    >
      {/* The idle bob is the app's own character (`.decor-float`, shared with
          desktop), not something from the design — it's a fraction of a percent
          of the scene, so nothing drifts off its designed mark. */}
      <div
        className="decor-float relative w-full h-full"
        style={
          {
            "--dur": `${dur}s`,
            "--float": `calc(var(--u) * ${-float})`,
            animationDelay: `${delay}s`,
          } as CSSProperties
        }
      >
        <Card
          src={src}
          alt=""
          fill
          rounded={false}
          priority
          sizes="100vw"
          className={`${fit === "cover" ? "object-cover" : "object-contain"} ${shadow ? "decor-shadow" : ""}`}
        />
      </div>
    </div>
  );
}
