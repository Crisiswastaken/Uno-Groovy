// Single source of truth for the assets warmed by the loading splash.
//
// The splash (src/components/Splash.tsx) downloads every entry here exactly
// once while the intro animation plays, so that after the intro the whole app
// is served from the browser cache — no image or font is fetched twice. Keep
// this list in lockstep with what the app actually renders; the card list below
// is derived the same way as cardAsset() in src/components/Card.tsx so it can
// never drift.

const CARD_COLORS = ["red", "yellow", "green", "blue"] as const;
const CARD_VALUES = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "skip", "reverse", "draw2",
] as const;

/** Every card PNG under /public/cards (52 colored + 3 wild/back = 55). */
const CARD_ASSETS: string[] = [
  ...CARD_COLORS.flatMap((color) =>
    CARD_VALUES.map((value) => `/cards/${color}_${value}.png`)
  ),
  "/cards/wild.png",
  "/cards/wild_draw4.png",
  "/cards/back.png",
];

const HOME_ASSETS = [
  "/home/background.png",
  "/home/plus4.png",
  "/home/uno-back.png",
  "/home/uno-wordmark.png",
];

const GAME_ASSETS = ["/game/background.png", "/game/uno-logo.png"];

const AVATAR_ASSETS = [
  "/avatars/AV1.png",
  "/avatars/AV2.png",
  "/avatars/AV3.png",
  "/avatars/AV4.png",
];

// Referenced by the themed cursor in globals.css.
const CURSOR_ASSETS = ["/cursor-sm.png", "/cursor.png"];

/** All image assets to warm during the splash. */
export const ASSET_MANIFEST: string[] = [
  ...CARD_ASSETS,
  ...HOME_ASSETS,
  ...GAME_ASSETS,
  ...AVATAR_ASSETS,
  ...CURSOR_ASSETS,
];

/**
 * Font faces to warm, one per @font-face declared in globals.css. Loaded via
 * the FontFace API (document.fonts.load) so the .otf files are fetched during
 * the splash rather than lazily on first text paint.
 */
export type FontSpec = { family: string; weight: number };

export const FONT_SPECS: FontSpec[] = [
  { family: "Vodka Sans", weight: 400 },
  { family: "Switzer", weight: 400 },
  { family: "Switzer", weight: 500 },
  { family: "Switzer", weight: 600 },
  { family: "Switzer", weight: 700 },
  { family: "Switzer", weight: 800 },
  { family: "Switzer", weight: 900 },
];
