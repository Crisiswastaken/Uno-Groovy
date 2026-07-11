"use client";

import { useSensoryUI } from "../lib/provider";

/**
 * A small fixed speaker button that mutes / unmutes all sensory-ui sound.
 * Rendered once, globally, inside the provider (see app/layout.tsx). Hidden
 * entirely when sound is suppressed by prefers-reduced-motion — there's nothing
 * to toggle then.
 */
export function MuteToggle() {
  const { muted, setMuted, reducedMotion } = useSensoryUI();
  if (reducedMotion) return null;

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      title={muted ? "Unmute" : "Mute"}
      className="fixed top-4 right-4 z-[60] grid place-items-center w-9 h-9 rounded-full bg-uno-cream/85 backdrop-blur border-2 border-uno-ink/15 text-uno-ink1 hover:text-uno-ink hover:bg-uno-cream hover:-translate-y-0.5 active:translate-y-0 shadow-[0_3px_10px_rgba(43,42,39,0.22)] transition"
    >
      {muted ? <SpeakerMuted /> : <SpeakerOn />}
    </button>
  );
}

function SpeakerOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6a8 8 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function SpeakerMuted() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.5l5 5M21 9.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
