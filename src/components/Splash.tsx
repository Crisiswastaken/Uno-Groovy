"use client";

import { useEffect, useRef, useState } from "react";
import { preloadAllAssets } from "../lib/preload";

/** Session flag: once set, the intro is skipped for the rest of the session. */
const SEEN_KEY = "uno:intro-seen";
/** Duration of the zoom-blur exit; keep in sync with globals.css. */
const EXIT_MS = 650;
/** Last-resort cap so a stuck video can never trap the user (art is ~7s). */
const VIDEO_FALLBACK_MS = 15000;

type Status = "deciding" | "playing" | "exiting" | "done";

/**
 * First-visit loading gate. The opaque splash is the default render (SSR and
 * first client paint) so the landing page never flashes. On mount we decide:
 * a returning session skips straight to the app; a fresh session plays the
 * intro animation while every asset is warmed into cache, then zoom-blurs away
 * to reveal the app. After the intro, nothing is fetched again — the whole app
 * is served from cache.
 */
export function Splash({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("deciding");
  const [videoEnded, setVideoEnded] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const decided = useRef(false);

  // Decide whether to show the intro, and if so kick off asset preloading.
  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // sessionStorage unavailable (private mode / blocked) — just play it.
    }

    if (seen) {
      setStatus("done"); // fast path: no video, no preload
      return;
    }

    setStatus("playing");
    preloadAllAssets().finally(() => setAssetsReady(true));
  }, []);

  // Once the video is mounted (status "playing"), nudge autoplay and arm the
  // safety fallback. Autoplay blocked or a load error counts as "ended".
  useEffect(() => {
    if (status !== "playing") return;

    const video = videoRef.current;
    if (video) video.muted = true; // reflect the property (React quirk) so autoplay is allowed
    video?.play?.().catch(() => setVideoEnded(true));
    const fallback = setTimeout(() => setVideoEnded(true), VIDEO_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [status]);

  // Reveal only when the animation has finished AND every asset is cached.
  useEffect(() => {
    if (status !== "playing" || !videoEnded || !assetsReady) return;

    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // best-effort — worst case the intro replays next load
    }

    setStatus("exiting");
    const t = setTimeout(() => setStatus("done"), EXIT_MS);
    return () => clearTimeout(t);
  }, [status, videoEnded, assetsReady]);

  return (
    <>
      <div className={status === "exiting" ? "intro-content-enter" : undefined}>
        {children}
      </div>

      {status !== "done" && (
        <div
          className={`splash-overlay${
            status === "exiting" ? " splash-overlay--exit" : ""
          }`}
          aria-hidden="true"
        >
          {(status === "playing" || status === "exiting") && (
            <video
              ref={videoRef}
              className="splash-video"
              src="/loading-animation.webm"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={() => setVideoEnded(true)}
              onError={() => setVideoEnded(true)}
            />
          )}
        </div>
      )}
    </>
  );
}
