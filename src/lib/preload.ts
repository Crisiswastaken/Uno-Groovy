// Warms every asset in the manifest into the browser cache. Called once by the
// loading splash while the intro animation plays; after it resolves, the app
// renders entirely from cache with no further asset network requests.

import { ASSET_MANIFEST, FONT_SPECS } from "./assets";

/** Hard cap so a single stalled asset can never trap the user on the splash. */
const SAFETY_TIMEOUT_MS = 8000;

/** Warm one image; resolves on load OR error so one bad asset never blocks. */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Warm every declared font face via the FontFace API. Never rejects. */
async function preloadFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  await Promise.allSettled(
    FONT_SPECS.map((f) => document.fonts.load(`${f.weight} 1em "${f.family}"`))
  );
  try {
    await document.fonts.ready;
  } catch {
    // ignore — best-effort
  }
}

let inFlight: Promise<void> | null = null;

/**
 * Download all images + fonts exactly once. Idempotent (a shared promise is
 * reused across calls, so React StrictMode's double-invoke warms assets once),
 * and bounded by a safety timeout so the caller always resumes.
 */
export function preloadAllAssets(): Promise<void> {
  if (inFlight) return inFlight;

  const work = Promise.allSettled([
    ...ASSET_MANIFEST.map(preloadImage),
    preloadFonts(),
  ]).then(() => undefined);

  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, SAFETY_TIMEOUT_MS)
  );

  inFlight = Promise.race([work, timeout]);
  return inFlight;
}
