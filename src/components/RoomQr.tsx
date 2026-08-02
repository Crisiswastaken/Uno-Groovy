"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The invite QR for a room: ink dots with the three finder rings in the UNO
 * accents and blue pupils.
 *
 * Standalone by design — it takes a room code, nothing else — so `Lobby` can
 * render it without the component knowing anything about `ClientView`.
 *
 * ## Scannability — two things here are load-bearing
 *
 * Both were established after a first cut that would not scan at all:
 *
 *  1. **The quiet zone is not optional.** The spec wants four clear modules on
 *     every side; with `margin: 0` the code runs edge to edge and scanners fail
 *     to find it. `QUIET_ZONE` reserves that band inside the component so it
 *     does not depend on the host happening to add padding. This was the actual
 *     bug.
 *  2. **Nothing is drawn over the middle.** An earlier version punched a hole
 *     in the code to seat the room code inside it. That is a real technique,
 *     but it cost enough modules to stop the code decoding — and `Lobby` shows
 *     the room code above the QR in type far larger than a QR centre could
 *     hold, so the centre is left alone.
 *
 * On the coloured rings: finder patterns are what a scanner uses to *locate* a
 * code, so they are its most contrast-sensitive part. Against the cream surface
 * the accents measure red 2.63:1, green 2.27:1 and yellow 1.49:1, against ink's
 * 11.76:1 — and a strict software decoder (jsQR) reads them only ~1 time in 36.
 * Phone cameras binarize far better than that and handle them fine, which is
 * what the design is tuned for. Worth knowing if a cheap dedicated scanner ever
 * has to read one: darkening the rings ~60% toward ink (#7d3e23 / #515b3a /
 * #7e6029) satisfies even the strict decoder, at the cost of the colour.
 *
 * The background stays transparent so the QR takes on whatever surface hosts
 * it. That means **the host surface must be light** — the quiet zone is only
 * quiet if what shows through it is pale.
 */

/** Ink/accent values mirrored from the `@theme` block in `globals.css`. */
const INK = "#2b2a27";
const RED = "#f85c1e";
const BLUE = "#177dc6";
const GREEN = "#89a557";
const YELLOW = "#fbb22d";

/**
 * A ring colour per finder pattern, keyed by the `column-row` coordinates the
 * library names its corner elements with: top-left, top-right, bottom-left.
 * The pupils stay blue throughout, so the three corners read as one set rather
 * than three unrelated marks.
 *
 * `qr-code-styling` only takes one colour for all three corners, so these are
 * painted on after the draw (see `decorate`). If that ever stops matching, the
 * corners fall back to the flat `cornersSquareOptions.color` below — still a
 * valid, on-brand code, just monochrome rings.
 */
const CORNERS = [
  { at: "0-0", ring: RED, pupil: BLUE },
  { at: "1-0", ring: GREEN, pupil: BLUE },
  { at: "0-1", ring: YELLOW, pupil: BLUE },
] as const;

/**
 * The clear band around the code, as a fraction of its edge. The spec asks for
 * four modules; our payloads land around 41–45 modules across, so 0.1 covers it
 * with room to spare at every code size the app uses.
 */
const QUIET_ZONE = 0.1;

/**
 * Redraw granularity when auto-sizing. Every change of the rendered edge throws
 * the whole SVG away and rebuilds it, so snapping to a step keeps a drag-resize
 * from rebuilding on every animation frame.
 */
const SIZE_STEP = 8;

export function RoomQr({
  roomCode,
  url,
  size,
  className,
}: {
  roomCode: string;
  /**
   * The link to encode. Defaults to this origin's room URL, resolved on the
   * client — the server has no way to know the origin a player will scan from.
   */
  url?: string;
  /**
   * Rendered edge length in px, quiet zone included. Omit to fill the available
   * width and stay square, which is what `Lobby` wants — the code is raster-ish
   * enough to want a whole number of pixels, but its *container* should stay
   * fluid.
   */
  size?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Resolved after mount so SSR and the first client render agree (the origin
  // is browser-only); until then there is nothing to draw.
  const [href, setHref] = useState<string | null>(url ?? null);
  useEffect(() => {
    setHref(url ?? `${window.location.origin}/room/${roomCode}`);
  }, [url, roomCode]);

  // Auto-size to the container unless an explicit size was given.
  const [measured, setMeasured] = useState<number | null>(null);
  useEffect(() => {
    if (size !== undefined) return;
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setMeasured(Math.round(w / SIZE_STEP) * SIZE_STEP);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [size]);

  const edge = size ?? measured;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !href || !edge) return;

    let cancelled = false;
    let observer: MutationObserver | undefined;

    (async () => {
      // Browser-only library (it reaches for `document` at construction), so it
      // has to be pulled in past the server render.
      const { default: QRCodeStyling } = await import("qr-code-styling");
      if (cancelled || !hostRef.current) return;

      const qr = new QRCodeStyling({
        type: "svg",
        width: edge,
        height: edge,
        margin: Math.round(edge * QUIET_ZONE),
        data: href,
        // Nothing covers the centre, so the default level is plenty. H would
        // only make the code denser — smaller modules, harder to read at the
        // sizes a lobby shows it at.
        qrOptions: { errorCorrectionLevel: "M" },
        dotsOptions: { type: "extra-rounded", color: INK },
        // Per-corner colours are applied in `decorate`; this is the fallback.
        cornersSquareOptions: { type: "extra-rounded", color: RED },
        cornersDotOptions: { type: "dot", color: BLUE },
        // Transparent: whatever surface hosts the QR shows through, so this
        // works on the lobby's sunken panel and on the cream sheet alike.
        backgroundOptions: { color: "transparent" },
      });

      host.replaceChildren();
      qr.append(host);

      // `append` returns before the draw lands and the library exposes no
      // promise for it, so watch for the tree instead of racing it on a timer.
      const decorate = () => {
        const svg = host.querySelector("svg");
        if (!svg?.querySelector('[clip-path*="corners-square-color-"]')) return false;

        for (const { at, ring, pupil } of CORNERS) {
          svg
            .querySelector(`[clip-path*="corners-square-color-${at}-"]`)
            ?.setAttribute("fill", ring);
          svg
            .querySelector(`[clip-path*="corners-dot-color-${at}-"]`)
            ?.setAttribute("fill", pupil);
        }
        return true;
      };

      if (!decorate()) {
        observer = new MutationObserver(() => {
          if (cancelled || decorate()) observer?.disconnect();
        });
        observer.observe(host, { childList: true, subtree: true });
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [href, edge]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-labelledby={titleId}
      className={["relative select-none", className].filter(Boolean).join(" ")}
      style={
        size !== undefined
          ? { width: size, height: size }
          : { width: "100%", aspectRatio: "1 / 1" }
      }
    >
      <span id={titleId} className="sr-only">
        {`QR code linking to room ${roomCode.split("").join(" ")}`}
      </span>

      {/* Owned by qr-code-styling, not React — it swaps the whole subtree on
          every redraw, so React must never render children in here. */}
      <div ref={hostRef} aria-hidden className="absolute inset-0" />
    </div>
  );
}
