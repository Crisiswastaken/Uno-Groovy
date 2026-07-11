"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const decided = useRef(false);

  // Decide whether to show the intro, and if so kick off asset preloading.
  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    // The intro is a landing-page experience. If the first paint of the session
    // is any other route — the post-create redirect to /room/[code], or an
    // invite deep-link — DON'T gate it behind the opaque splash, or the real
    // page sits hidden until the video ends (it looked like a blank screen that
    // only a reload fixed). Reveal those routes immediately.
    if (pathname !== "/") {
      setStatus("done");
      return;
    }

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
  }, [pathname]);

  // While the intro zoom-blurs away, both the exiting overlay (scaling to 1.6)
  // and the counter-zooming app (starting at scale 1.05) briefly overflow the
  // viewport, flashing scrollbars. Clip the document for the duration.
  useEffect(() => {
    if (status !== "exiting") return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [status]);

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
