"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Card } from "../components/ui/Card";
import { setName } from "../lib/identity";
import { usePlaySound } from "../hooks/use-play-sound";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [mode, setMode] = useState<"home" | "join">("home");

  // Soft tick on hover, a satisfying pop on press — the whole app shares one
  // sensory-ui engine (arcade theme), configured in the root layout provider.
  const { play: playHover } = usePlaySound({ sound: "interaction.subtle" });
  const { play: playPress } = usePlaySound({ sound: "interaction.tap" });

  // Pointer position (normalized to [-0.5, 0.5]) drives the layered card
  // parallax. Updates are coalesced through a single rAF so a busy mouse never
  // triggers more than one render per frame, and skipped entirely when the user
  // asks for reduced motion.
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
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

  const onPointerMove = (e: React.MouseEvent) => {
    if (reduceRef.current || rafRef.current != null) return;
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setPointer({ x: nx, y: ny });
    });
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
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-6"
    >
      {/* Groovy background — a barely-perceptible 14s drift keeps the swirl alive */}
      <Card
        src="/home/background.png"
        alt=""
        fill
        rounded={false}
        priority
        sizes="100vw"
        className="object-cover -z-10 select-none pointer-events-none groovy-drift"
      />

      {/* Decorative cards — a slow, staggered idle drift plus a mouse-driven
          parallax (each at a different depth) keeps the hero alive and layered. */}
      <DecorCard
        src="/home/plus4.png"
        place="left-[7%] top-[10%]"
        size="w-[9rem] lg:w-[11rem]"
        rot={-6}
        dur={7}
        float={-16}
        delay={0}
        depth={26}
        pointer={pointer}
      />
      <DecorCard
        src="/cards/wild.png"
        place="left-[6%] bottom-[8%]"
        size="w-[8.5rem] lg:w-[10.5rem]"
        rot={-3}
        dur={6.4}
        float={-13}
        delay={0.9}
        depth={38}
        pointer={pointer}
      />
      <DecorCard
        src="/home/uno-back.png"
        place="right-[7%] top-[16%]"
        size="w-[9rem] lg:w-[11rem]"
        rot={6}
        dur={7.6}
        float={-15}
        delay={0.4}
        depth={18}
        pointer={pointer}
      />

      {/* Center column */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        <Card
          src="/home/uno-wordmark.png"
          alt="UNO"
          width={556}
          height={330}
          priority
          rounded={false}
          className="w-64 sm:w-80 h-auto drop-shadow-[0_8px_16px_rgba(43,42,39,0.25)] select-none"
        />

        {mode === "home" ? (
          // Create and Join share one size; only the color coding (red = create,
          // blue = join) separates them. Both carry the same skeuomorphic depth.
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={() => router.push("/create")}
              onMouseEnter={playHover}
              onPointerDown={playPress}
              className="group flex w-full items-center gap-4 bg-uno-red text-uno-cream rounded-card px-6 py-5 border-2 border-uno-ink/15 shadow-[0_8px_0_rgba(43,42,39,0.28),0_16px_26px_rgba(43,42,39,0.20)] hover:-translate-y-0.5 hover:brightness-[1.05] hover:shadow-[0_10px_0_rgba(43,42,39,0.28),0_20px_32px_rgba(43,42,39,0.22)] active:translate-y-[6px] active:brightness-95 active:shadow-[inset_0_3px_6px_rgba(43,42,39,0.30)] transition-[transform,box-shadow,filter] duration-100"
            >
              <span className="grid place-items-center w-11 h-11 rounded-[14px] bg-uno-cream text-uno-red transition-transform group-hover:scale-110 group-hover:rotate-3">
                <PlusIcon />
              </span>
              <span className="font-extrabold text-2xl tracking-wide uppercase">
                Create Room
              </span>
            </button>
            <button
              onClick={() => setMode("join")}
              onMouseEnter={playHover}
              onPointerDown={playPress}
              className="group flex w-full items-center gap-4 bg-uno-blue text-uno-cream rounded-card px-6 py-5 border-2 border-uno-ink/15 shadow-[0_8px_0_rgba(43,42,39,0.28),0_16px_26px_rgba(43,42,39,0.20)] hover:-translate-y-0.5 hover:brightness-[1.05] hover:shadow-[0_10px_0_rgba(43,42,39,0.28),0_20px_32px_rgba(43,42,39,0.22)] active:translate-y-[6px] active:brightness-95 active:shadow-[inset_0_3px_6px_rgba(43,42,39,0.30)] transition-[transform,box-shadow,filter] duration-100"
            >
              <span className="grid place-items-center w-11 h-11 rounded-[14px] bg-uno-cream text-uno-blue transition-transform group-hover:scale-110 group-hover:-rotate-3">
                <PeopleIcon />
              </span>
              <span className="font-extrabold text-2xl tracking-wide uppercase">
                Join Room
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-sm bg-uno-cream/95 rounded-card border-2 border-uno-ink/15 p-5 shadow-[0_5px_0_rgba(43,42,39,0.2)]">
            <input
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
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
            <button
              onClick={() => setMode("home")}
              className="group flex items-center justify-center gap-1.5 text-uno-ink1 hover:text-uno-ink text-sm font-semibold mt-1 transition-colors"
            >
              <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * A single scattered landing-page card, built as three nested transform layers
 * that never fight:
 *   1. outer wrapper — placement only (`place`)
 *   2. parallax layer — a mouse-driven shift; `depth` sets how far this card
 *      travels, so the three cards move at different rates for layered depth
 *   3. tilt layer — the card's intentional resting angle (`rot`)
 *   4. `.decor-float` inner — the slow vertical idle drift
 * The `.decor-shadow` on the art casts a soft floating shadow so each card reads
 * as lifted off the swirl, not printed on it. Idle drift is disabled under
 * prefers-reduced-motion via `.decor-float`; parallax is skipped upstream.
 */
function DecorCard({
  src,
  place,
  size,
  rot,
  dur,
  float,
  delay,
  depth,
  pointer,
}: {
  src: string;
  place: string;
  size: string;
  rot: number;
  dur: number;
  float: number;
  delay: number;
  depth: number;
  pointer: { x: number; y: number };
}) {
  return (
    <div className={`hidden md:block absolute ${place} select-none pointer-events-none`}>
      <div
        style={{
          transform: `translate3d(${(-pointer.x * depth).toFixed(1)}px, ${(
            -pointer.y * depth
          ).toFixed(1)}px, 0)`,
          transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ transform: `rotate(${rot}deg)` }}>
          <div
            className="decor-float"
            style={
              {
                "--dur": `${dur}s`,
                "--float": `${float}px`,
                animationDelay: `${delay}s`,
              } as CSSProperties
            }
          >
            <Card
              src={src}
              alt=""
              width={220}
              height={340}
              priority
              rounded={false}
              className={`${size} h-auto rounded-[10px] decor-shadow`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
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

function ArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
