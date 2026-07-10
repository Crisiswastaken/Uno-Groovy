# Deploying Custom UNO

The app ships as **two independently deployed pieces**:

| Piece | What it is | Where it runs |
|---|---|---|
| **Game server** | The standalone Node WebSocket server in `server/index.ts` — authoritative game state, one room per code, in memory. | **Render** (any Node host works) |
| **Web app** | The Next.js front end in `src/` — landing, `/create`, `/room/[code]`. | **Vercel** |

The browser loads the web app, then opens a WebSocket **directly** to the game
server. So the web app must be told the game server's public host via the
`NEXT_PUBLIC_PARTYKIT_HOST` environment variable.

> **Why not PartyKit?** The original backend was PartyKit, which only runs on
> Cloudflare's Workers runtime, and its free `*.partykit.dev` platform is at
> capacity (the shared zone hit Cloudflare's 10,000-custom-domain limit). The
> Node server in `server/` runs the **same game engine** (`src/engine`) over
> plain `ws`, so it deploys to any ordinary Node host. `party/server.ts` remains
> in the repo as the legacy PartyKit variant but is no longer used.

> **Deploy order matters:** ship the **game server first**, copy its URL, then
> build the web app with that URL baked in. `NEXT_PUBLIC_*` vars are inlined at
> **build** time — changing one means a redeploy of the web app.

---

## Prerequisites

- This repo pushed to GitHub (Render and Vercel both deploy from a Git repo).
- A **Render** account (free) and a **Vercel** account (free).
- Green local checks:
  ```bash
  npm test                 # engine unit tests
  npx tsc --noEmit         # typecheck (includes the server)
  npx next build           # production build of the web app
  ```

---

## Step 1 — Deploy the game server (Render)

The repo includes a **`render.yaml`** Blueprint, so this is nearly automatic.

1. In the Render dashboard: **New + → Blueprint**, and pick this repo.
2. Render reads `render.yaml` and creates a free Node **Web Service**
   (`custom-uno-server`) with:
   - Build: `npm ci --omit=dev`
   - Start: `npm run start:server` (runs `tsx server/index.ts`)
   - Health check: `/`
3. Click **Apply / Deploy** and wait for it to go live.

Your server URL will look like **`custom-uno-server.onrender.com`**. Copy that
host (no `https://`). It serves HTTPS + WebSockets on the same domain.

<details>
<summary>Prefer manual setup (no Blueprint)?</summary>

New + → **Web Service** → this repo, then set:
- **Runtime:** Node
- **Build Command:** `npm ci --omit=dev`
- **Start Command:** `npm run start:server`
- **Health Check Path:** `/`
- **Instance Type:** Free
</details>

> **Free-tier note:** Render's free web services **sleep after ~15 min idle** and
> take ~30–60s to wake on the next request. The first player in after a lull will
> see "Connecting…" for a moment while it spins up. Fine for casual games; upgrade
> to a paid instance if you want it always-on.

Redeploy the server whenever you change `server/index.ts` or anything in
`src/engine/` or `src/shared/`.

---

## Step 2 — Deploy the web app (Vercel)

1. Import the repo into Vercel. Framework preset: **Next.js** (auto-detected).
2. Add an environment variable (Production scope):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_PARTYKIT_HOST` | Your Step 1 host, e.g. `custom-uno-server.onrender.com` |

3. Deploy. Vercel runs `next build`; the client connects to
   `wss://custom-uno-server.onrender.com/parties/main/<room>`.

Build settings are the defaults — `next.config.mjs` already sets
`images.unoptimized: true`, so no Vercel Image Optimization is used. The
dev-only `/demo` routes automatically **404 in production**.

> The variable is still named `NEXT_PUBLIC_PARTYKIT_HOST` (the client code is
> unchanged); it just points at the Render host now. See `.env.example`.

---

## Step 3 — Verify

Against the live Vercel URL:

- [ ] Landing (`/`) loads; first visit plays the intro splash once.
- [ ] **Create Room** → lobby with a room code appears (proves the socket reached
      the Render server).
- [ ] Open the invite link in a second browser/incognito window and join — both
      players show in the lobby.
- [ ] Host starts; cards deal, turns advance, a wild prompts the color picker, a
      round completes.
- [ ] Kill a tab mid-game and reopen the room URL — it **rejoins** the same seat.
- [ ] `/demo` returns **404**.

If it sticks on "Connecting…": the Render service may be waking from sleep (wait
~30s), or `NEXT_PUBLIC_PARTYKIT_HOST` is wrong / the web app wasn't rebuilt after
setting it.

---

## Operational notes (v1 scope)

- **State is in memory.** Each room lives in the server process's memory. A player
  dropping is covered by rejoin; a **server restart or free-tier sleep** drops any
  in-progress game. There is no database by design (see `UNO_PRD.md`).
- **Disconnect grace:** a disconnected player's turn auto-passes after 30s
  (`DISCONNECT_GRACE_MS` in `server/index.ts`).
- **Room cleanup:** rooms with no live connections are swept from memory after
  30 minutes.
- **Rooms are ephemeral**, keyed only by the 6-char code — no accounts, no
  persistence, no spectators (all v1 non-goals).

## Other hosts

Any Node host works — the start command is just `npm run start:server` and the
server binds `process.env.PORT`. On **Railway** create a service from the repo,
set the start command, and use the generated domain as `NEXT_PUBLIC_PARTYKIT_HOST`.
On **Fly.io**, `fly launch` with a Node builder and internal port from `PORT`.
