"use client";

import NextImage, { type ImageProps } from "next/image";

/**
 * The one reusable image surface for the whole app.
 *
 * Wraps Next.js' built-in <Image> (from next/image) for lazy loading and
 * layout-shift prevention (image optimization itself is off project-wide — see
 * next.config.mjs and src/lib/preload.ts), and applies the UNO card artwork's
 * own corner radius (8px, matching
 * `.card-face`) so every image reads as the same shape as a physical UNO
 * card. (Note: `--radius-card`/`rounded-card` is 22px — that's the larger
 * UI-surface token for buttons/panels, not the card artwork's corner.)
 *
 * Nothing else in the app should import next/image directly: render a <Card>.
 */
type CardProps = ImageProps & {
  /**
   * Round the corners to the UNO card radius (default). Set false only for
   * edge-to-edge surfaces (e.g. a full-bleed background) where rounding the
   * corners would be invisible or wrong.
   */
  rounded?: boolean;
};

export function Card({ rounded = true, className, style, ...props }: CardProps) {
  // Scale the corner radius with the rendered card size (~10% of width) so a
  // 44px opponent back and a 130px discard read with the same rounded-rect
  // language instead of a fixed 14px that looks over-rounded when small.
  const w = typeof props.width === "number" ? props.width : undefined;
  const radius = rounded && w !== undefined ? Math.max(4, Math.round(w * 0.1)) : undefined;

  return (
    <NextImage
      {...props}
      style={radius !== undefined ? { ...style, borderRadius: radius } : style}
      className={[
        rounded && w === undefined && "rounded-[12px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
