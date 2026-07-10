// Single source of truth for the app's runtime environment.
//
// `NEXT_PUBLIC_APP_ENV` explicitly selects "development" or "production". When
// it's unset the flag follows Next's own NODE_ENV — "development" under
// `next dev`, "production" under `next build` / `next start` — so no config is
// required for the common case. Set it explicitly only to override that (e.g.
// to expose the dev-only scratch routes on a staging deployment).

export type AppEnv = "development" | "production";

export const APP_ENV: AppEnv =
  process.env.NEXT_PUBLIC_APP_ENV === "development" ||
  process.env.NEXT_PUBLIC_APP_ENV === "production"
    ? process.env.NEXT_PUBLIC_APP_ENV
    : process.env.NODE_ENV === "production"
      ? "production"
      : "development";

export const isDev = APP_ENV === "development";
export const isProd = APP_ENV === "production";

/**
 * Whether the dev-only scratch routes (`/demo`, `/demo/components`,
 * `/demo/part/[c]`) are reachable. On in production so they 404 for players.
 */
export const devPagesEnabled = isDev;
