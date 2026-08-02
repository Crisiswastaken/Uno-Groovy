"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { normalizeRoomCode, setName } from "../lib/identity";
import { usePlaySound } from "../hooks/use-play-sound";
import { useIsPhone } from "../hooks/useIsPhone";
import { HeroBackdrop, HERO_PORTRAIT_RATIO, HERO_RATIO } from "../components/HeroScene";
import { HomeFooter } from "../components/HomeFooter";

/**
 * The landing hero: the shared <HeroBackdrop /> art composition (see
 * HeroScene.tsx — it also backs the round/match end screens) plus this page's
 * own chrome, the PLAY pill and the create/join popup.
 *
 * Both compositions are authored against a fixed canvas and cover-scaled, with
 * the custom unit `--u` (1% of the scene's width) letting non-image chrome scale
 * with the art. On desktop the pointer is eased every frame so the scene trails
 * the cursor with a soft lag rather than snapping.
 */

/** Scene units per vw for the PLAY pill — 15.326u wide ⇒ ~55% of the screen. */
const PILL_U = 3.6;

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [popup, setPopup] = useState<null | "choose" | "join">(null);
  // Phones get a purpose-built portrait composition instead of the 16:9 scene
  // below — see LandingPortrait. SSR-safe (false first render), same contract
  // RoomClient uses to pick the mobile table.
  const isPhone = useIsPhone();

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
    const c = normalizeRoomCode(code);
    if (c.length < 4 || !name.trim()) return;
    setName(c, name.trim());
    router.push(`/room/${c}`);
  };

  // The popup is identical on both layouts (fixed, self-centering), so it's
  // hoisted out of the two scene trees.
  const popupEl = popup && (
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
  );

  if (isPhone) {
    return (
      <>
        <LandingPortrait onPlay={openPopup} onHover={playHover} />
        <HomeFooter />
        {popupEl}
      </>
    );
  }

  return (
    <main
      onMouseMove={onPointerMove}
      className="relative min-h-screen w-full overflow-hidden"
      style={
        {
          // 1u = 1% of the scene's width, so the PLAY pill scales with the art.
          // (The backdrop sets the same unit on itself; each is self-contained.)
          "--u": `max(1vw, ${HERO_RATIO}vh)`,
        } as CSSProperties
      }
    >
      <HeroBackdrop pointer={pointer} />

      {/* PLAY pill — a custom control (no asset), sized 480×125 relative to the
          canvas via --u. Opens the create/join popup. */}
      <PlayButton depth={14} pointer={pointer} onHover={playHover} onClick={openPopup} />

      <HomeFooter />
      {popupEl}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The phone hero: the shared portrait backdrop plus the PLAY pill.
 *
 * The desktop scene is one 16:9 canvas cover-scaled to the viewport, which works
 * beautifully on a landscape screen and falls apart on a portrait one: at
 * 390×844 it renders ~1500px wide, so most of the composition — half the UNO
 * wordmark included — sits outside the frame. HeroScene.tsx carries a separate
 * portrait composition for phones; this only adds the button on top.
 */
function LandingPortrait({
  onPlay,
  onHover,
}: {
  onPlay: () => void;
  onHover: () => void;
}) {
  return (
    <main className="fixed inset-0 overflow-hidden select-none">
      <HeroBackdrop />

      {/* PLAY — absent from the design, added here. Reuses the desktop pill
          verbatim: it's authored entirely in `--u`, so redefining that unit
          rescales it intact. The pill is 15.326u wide, so u = 3.6vw puts it at
          ~55% of the screen; the `max()` keeps it locked to the scene when the
          scene is height-driven. Sat at 64%, tucked just under the wordmark
          (which ends at 57%) rather than down in the ship/sunflower row — at
          full width and 73% it read as a detached bar stranded in the white
          gap. */}
      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={
          {
            "--u": `max(${PILL_U}vw, ${(HERO_PORTRAIT_RATIO * PILL_U).toFixed(4)}vh)`,
          } as CSSProperties
        }
      >
        {/* pointer-events is inherited, so this re-enables just the pill and
            leaves the rest of the full-screen positioning layer click-through. */}
        <div className="pointer-events-auto">
          <PlayButton
            depth={0}
            pointer={{ x: 0, y: 0 }}
            onHover={onHover}
            onClick={onPlay}
            top="64%"
          />
        </div>
      </div>
    </main>
  );
}

/**
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
  top = "72%",
}: {
  depth: number;
  pointer: { x: number; y: number };
  onHover: () => void;
  onClick: () => void;
  /** Vertical placement; the portrait layout sits it higher under the wordmark. */
  top?: string;
}) {
  // 480×125 on a 3132-wide canvas → 15.326u wide, 3.99u tall.
  return (
    <div
      className="absolute z-20"
      style={{ left: "50%", top, transform: "translate(-50%, -50%)", width: "calc(var(--u) * 15.326)", height: "calc(var(--u) * 3.99)" }}
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
              // Codes are letters only — the lobby renders them in Vodka Sans,
              // which has no digit or punctuation glyphs. Strip as they type
              // rather than failing later on a code that looked accepted.
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
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
