"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Card } from "../components/ui/Card";
import { setName } from "../lib/identity";
import { usePlaySound } from "../hooks/use-play-sound";

/**
 * Redesigned landing hero.
 *
 * The whole composition is authored against a 3132×1762 background, so every
 * element is sized and placed as a fraction of that canvas — never in absolute
 * pixels. A single "scene" container reproduces the background's aspect ratio
 * and is scaled to cover the viewport; the custom unit `--u` (1% of the scene's
 * width) lets non-image chrome (the PLAY pill, the red bar) scale with it too.
 * The result holds its proportions identically at every screen size.
 *
 * Layers (cream field → rainbow → cut-outs → sparkles on top) each parallax off
 * the pointer at their own depth, and the pointer itself is eased every frame so
 * the scene trails the cursor with a soft, elegant lag rather than snapping.
 */

// Background canvas the design was authored against.
const BG_W = 3132;
const BG_H = 1762;
const RATIO = BG_W / BG_H; // ~1.7775
const RATIO_INV = BG_H / BG_W; // ~0.56258

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [popup, setPopup] = useState<null | "choose" | "join">(null);

  // Soft tick on hover, a satisfying pop on press — the whole app shares one
  // sensory-ui engine (arcade theme), configured in the root layout provider.
  const { play: playHover } = usePlaySound({ sound: "interaction.subtle" });
  const { play: playPress } = usePlaySound({ sound: "interaction.tap" });

  // Pointer parallax. The raw cursor position feeds a `target`; every frame the
  // rendered `pointer` eases toward it (lerp), so elements lag behind the cursor
  // for a smooth, weighted feel. Values are normalized to [-0.5, 0.5]. The loop
  // sleeps once settled and never runs under prefers-reduced-motion.
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const easedRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const reduceRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => (reduceRef.current = mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = () => {
    const t = targetRef.current;
    const e = easedRef.current;
    // Low lerp factor = long, gentle trail. Tune together with the depths below.
    const nx = e.x + (t.x - e.x) * 0.06;
    const ny = e.y + (t.y - e.y) * 0.06;
    const settled = Math.hypot(t.x - nx, t.y - ny) < 0.0004;
    const next = settled ? { ...t } : { x: nx, y: ny };
    easedRef.current = next;
    setPointer(next);
    rafRef.current = settled ? null : requestAnimationFrame(tick);
  };

  const onPointerMove = (ev: React.MouseEvent) => {
    if (reduceRef.current) return;
    targetRef.current = {
      x: ev.clientX / window.innerWidth - 0.5,
      y: ev.clientY / window.innerHeight - 0.5,
    };
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  };

  const openPopup = () => {
    playPress();
    setPopup("choose");
  };

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || !name.trim()) return;
    setName(c, name.trim());
    router.push(`/room/${c}`);
  };

  return (
    <main
      onMouseMove={onPointerMove}
      className="relative min-h-screen w-full overflow-hidden"
      style={
        {
          backgroundColor: "#f8eadb",
          // 1u = 1% of the scene's width, so everything scales with the scene.
          "--u": `max(1vw, ${RATIO}vh)`,
        } as CSSProperties
      }
    >
      {/* Scene: the background canvas' aspect ratio, scaled to cover the
          viewport and centered. All art lives inside, positioned in % so the
          layout is identical at any size. */}
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
        <Layer src="/home-new/plus4.png" w={9.74} h={22.42} cx={25.5} cy={37} depth={32} rot={-7} float={1.5} dur={6.2} delay={0.5} z={5} pointer={pointer} />
        <Layer src="/home-new/ship.png" w={11.85} h={26.73} cx={8.5} cy={84} depth={36} rot={-3} float={1.6} dur={5.8} delay={0.3} z={5} pointer={pointer} />

        {/* UNO wordmark — the scene anchor, so it drifts the least. */}
        <Layer src="/home-new/uno.png" w={35.44} h={27.81} cx={50.5} cy={48} depth={9} rot={0} float={0.7} dur={9} delay={0.6} z={6} pointer={pointer} shadow={false} />

        {/* Sparkles — the topmost art layer (above every other element). */}
        <Layer src="/home-new/sparkles.png" w={77.33} h={82.18} cx={50} cy={50} depth={42} rot={0} float={0.6} dur={10} delay={0} z={8} pointer={pointer} shadow={false} />
      </div>

      {/* Solid red top bar — the main shade of red (uno-red), pinned to the
          viewport top so it reads as a bar on every aspect ratio. */}
      <div className="absolute inset-x-0 top-0 bg-uno-red z-40 select-none pointer-events-none" style={{ height: "calc(var(--u) * 1.8)" }} />

      {/* PLAY pill — a custom control (no asset), sized 480×125 relative to the
          canvas via --u. Opens the create/join popup. */}
      <PlayButton depth={14} pointer={pointer} onHover={playHover} onClick={openPopup} />

      {popup && (
        <Popup
          mode={popup}
          onClose={() => setPopup(null)}
          onCreate={() => router.push("/create")}
          onJoinMode={() => setPopup("join")}
          name={name}
          code={code}
          setName={setNameInput}
          setCode={setCode}
          join={join}
          playHover={playHover}
          playPress={playPress}
        />
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One art layer. Nested transforms that never fight:
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
 * The custom PLAY pill: a cream capsule with a dark outline, the display-font
 * wordmark and an orange circle arrow. Sized 480×125 relative to the canvas
 * (via --u) and pinned below the wordmark. Interactive, so it opts back into
 * pointer events. Carries a light parallax of its own.
 */
function PlayButton({
  depth,
  pointer,
  onHover,
  onClick,
}: {
  depth: number;
  pointer: { x: number; y: number };
  onHover: () => void;
  onClick: () => void;
}) {
  // 480×125 on a 3132-wide canvas → 15.326u wide, 3.99u tall.
  return (
    <div
      className="absolute z-20"
      style={{ left: "50%", top: "72%", transform: "translate(-50%, -50%)", width: "calc(var(--u) * 15.326)", height: "calc(var(--u) * 3.99)" }}
    >
      <div
        className="w-full h-full"
        style={{
          transform: `translate3d(${(-pointer.x * depth).toFixed(2)}px, ${(-pointer.y * depth).toFixed(2)}px, 0)`,
          willChange: "transform",
        }}
      >
        <button
          onClick={onClick}
          onMouseEnter={onHover}
          className="group flex w-full h-full items-center justify-between rounded-full bg-uno-cream border-uno-ink hover:-translate-y-[1%] active:translate-y-[3%] transition-transform duration-100"
          style={{
            borderWidth: "calc(var(--u) * 0.28)",
            paddingLeft: "calc(var(--u) * 1.9)",
            paddingRight: "calc(var(--u) * 0.55)",
            boxShadow: "0 calc(var(--u) * 0.42) 0 rgba(43,42,39,0.28), 0 calc(var(--u) * 0.9) calc(var(--u) * 1.4) rgba(43,42,39,0.22)",
          }}
        >
          {/* Vodka Sans carries extra space below the glyphs, so nudge the
              wordmark up to sit optically centered in the pill. */}
          <span
            className="font-display leading-none text-uno-ink"
            style={{ fontSize: "calc(var(--u) * 2.35)", letterSpacing: "0.02em", transform: "translateY(calc(var(--u) * -0.2))", marginTop: "calc(var(--u) * 0.8)" }}
          >
            PLAY
          </span>
          <span
            className="grid place-items-center rounded-full bg-uno-red text-uno-cream transition-transform group-hover:translate-x-[8%]"
            style={{ width: "calc(var(--u) * 2.9)", height: "calc(var(--u) * 2.9)" }}
          >
            <ArrowRight />
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * The create/join popup opened by PLAY. Two states: `choose` (Create vs Join)
 * and `join` (name + room-code form). Backdrop click closes it.
 */
function Popup({
  mode,
  onClose,
  onCreate,
  onJoinMode,
  name,
  code,
  setName,
  setCode,
  join,
  playHover,
  playPress,
}: {
  mode: "choose" | "join";
  onClose: () => void;
  onCreate: () => void;
  onJoinMode: () => void;
  name: string;
  code: string;
  setName: (v: string) => void;
  setCode: (v: string) => void;
  join: () => void;
  playHover: () => void;
  playPress: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-uno-ink/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-uno-cream rounded-card border-2 border-uno-ink/15 p-6 shadow-[0_10px_0_rgba(43,42,39,0.22),0_26px_50px_rgba(43,42,39,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          onMouseEnter={playHover}
          aria-label="Close"
          className="absolute -top-3 -right-3 grid place-items-center w-9 h-9 rounded-full bg-uno-ink text-uno-cream border-2 border-uno-cream shadow-[0_3px_0_rgba(43,42,39,0.3)] hover:brightness-110 active:translate-y-0.5 transition"
        >
          <CloseIcon />
        </button>

        {mode === "choose" ? (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-3xl text-center text-uno-ink mb-1">New Game</h2>
            <button
              onClick={() => {
                playPress();
                onCreate();
              }}
              onMouseEnter={playHover}
              className="group flex w-full items-center gap-4 bg-uno-red text-uno-cream rounded-card px-6 py-5 border-2 border-uno-ink/15 shadow-[0_8px_0_rgba(43,42,39,0.28),0_16px_26px_rgba(43,42,39,0.20)] hover:-translate-y-0.5 hover:brightness-[1.05] hover:shadow-[0_10px_0_rgba(43,42,39,0.28),0_20px_32px_rgba(43,42,39,0.22)] active:translate-y-[6px] active:brightness-95 active:shadow-[inset_0_3px_6px_rgba(43,42,39,0.30)] transition-[transform,box-shadow,filter] duration-100"
            >
              <span className="grid place-items-center w-11 h-11 rounded-[14px] bg-uno-cream text-uno-red transition-transform group-hover:scale-110 group-hover:rotate-3">
                <PlusIcon />
              </span>
              <span className="font-extrabold text-2xl tracking-wide uppercase">Create Room</span>
            </button>
            <button
              onClick={() => {
                playPress();
                onJoinMode();
              }}
              onMouseEnter={playHover}
              className="group flex w-full items-center gap-4 bg-uno-blue text-uno-cream rounded-card px-6 py-5 border-2 border-uno-ink/15 shadow-[0_8px_0_rgba(43,42,39,0.28),0_16px_26px_rgba(43,42,39,0.20)] hover:-translate-y-0.5 hover:brightness-[1.05] hover:shadow-[0_10px_0_rgba(43,42,39,0.28),0_20px_32px_rgba(43,42,39,0.22)] active:translate-y-[6px] active:brightness-95 active:shadow-[inset_0_3px_6px_rgba(43,42,39,0.30)] transition-[transform,box-shadow,filter] duration-100"
            >
              <span className="grid place-items-center w-11 h-11 rounded-[14px] bg-uno-cream text-uno-blue transition-transform group-hover:scale-110 group-hover:-rotate-3">
                <PeopleIcon />
              </span>
              <span className="font-extrabold text-2xl tracking-wide uppercase">Join Room</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl text-center text-uno-ink mb-1">Join a Room</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              autoFocus
              className="bg-uno-white1 border-2 border-uno-ink/15 rounded-card px-4 py-3 outline-none text-uno-ink placeholder:text-uno-ink2 focus:border-uno-blue transition"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && join()}
              className="bg-uno-white1 border-2 border-uno-ink/15 rounded-card px-4 py-3 outline-none text-uno-ink placeholder:text-uno-ink2 focus:border-uno-blue tracking-[0.3em] uppercase transition"
            />
            <button
              onClick={join}
              onMouseEnter={playHover}
              onPointerDown={playPress}
              disabled={code.trim().length < 4 || !name.trim()}
              className="bg-uno-green text-uno-cream font-extrabold text-lg tracking-wide uppercase rounded-card py-3 border-2 border-uno-ink/15 shadow-[0_5px_0_rgba(43,42,39,0.25)] hover:-translate-y-0.5 hover:brightness-[1.04] hover:shadow-[0_7px_0_rgba(43,42,39,0.25)] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none disabled:hover:brightness-100 transition"
            >
              Join
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Icons --- */

function ArrowRight() {
  return (
    <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3 0-6 1.5-6 4.2V19h12v-1.8C15 14.5 12 13 9 13Zm8 0c-.6 0-1.2.06-1.7.17 1.1.9 1.7 2.1 1.7 4v1.83h4V17.2C21 14.5 19 13 17 13Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
