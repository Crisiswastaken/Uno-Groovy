# Deploying Custom UNO

This app ships as **two independently deployed pieces**:

| Piece | What it is | Where it runs |
|---|---|---|
| **Game server** | The PartyKit party in `party/server.ts` — authoritative game state, one stateful room per code. | PartyKit (Cloudflare Workers) |
| **Web app** | The Next.js front end in `src/` — landing, `/create`, `/room/[code]`. | Vercel (or any Node host) |

The browser loads the web app, then opens a WebSocket **directly** to the game
server. So the web app must be told the game server's public host via the
`NEXT_PUBLIC_PARTYKIT_HOST` environment variable.

> **Deploy order matters:** ship the **game server first**, copy its URL, then
> build the web app with that URL baked in. `NEXT_PUBLIC_*` vars are inlined at
> **build** time — changing one means a rebuild/redeploy of the web app.

---

## Prerequisites

- Node 18+ and this repo installed (`npm install`).
- A **PartyKit / Cloudflare** account (free tier is fine) — the CLI walks you
  through login.
- A **Vercel** account (or any host that runs `next build` + `next start`).
- Green local checks:
  ```bash
  npm test                 # 15 engine unit tests
  npx tsc --noEmit         # typecheck
  npx next build           # production build
  ```

---

## Step 1 — Deploy the game server (PartyKit)

From the project root:

```bash
npx partykit login          # one-time, opens a browser
npm run deploy:party        # = partykit deploy
```

The project name comes from `partykit.json` (`"name": "custom-uno"`). On success
the CLI prints the deployed URL, of the form:

```
custom-uno.<your-partykit-username>.partykit.dev
```

**Copy that host** (without `https://` / `wss://`) — you need it in Step 2.

Redeploy any time you change `party/server.ts` or the engine in `src/engine/`
(the server imports the engine).

---

## Step 2 — Configure the web app's environment

The web app reads two variables (see `.env.example`):

| Variable | Required? | Value |
|---|---|---|
| `NEXT_PUBLIC_PARTYKIT_HOST` | **Yes, in production** | The host from Step 1, e.g. `custom-uno.<user>.partykit.dev`. Defaults to `127.0.0.1:1999` when unset (local dev only). |
| `NEXT_PUBLIC_APP_ENV` | No | `development` or `production`. Leave **unset** to follow `NODE_ENV` automatically. Set to `development` only to expose the `/demo` scratch routes on a staging build. |

For a local production test, put them in `.env.local`. For Vercel, set them in
the project's **Settings → Environment Variables** (Production scope).

---

## Step 3 — Deploy the web app

### Option A — Vercel (recommended)

1. Import the Git repo into Vercel. Framework preset: **Next.js** (auto-detected).
2. Add the env var **`NEXT_PUBLIC_PARTYKIT_HOST`** = your Step 1 host.
3. Deploy. Vercel runs `next build` and hosts the result.

Build settings are the defaults — no overrides needed. `next.config.mjs` already
sets `images.unoptimized: true`, so no Vercel Image Optimization is used.

### Option B — Self-host (any Node server)

```bash
NEXT_PUBLIC_PARTYKIT_HOST=custom-uno.<user>.partykit.dev npx next build
npx next start -p 3000        # serve the built app
```

Put it behind your own HTTPS reverse proxy. Serve over **HTTPS** in production so
the browser can open a secure `wss://` socket to PartyKit.

---

## Step 4 — Verify the deployment

Against the live web app URL:

- [ ] Landing (`/`) loads; the first visit plays the intro splash once.
- [ ] **Create Room** → `/create` → **Create & Open Lobby** lands in a lobby with
      a room code.
- [ ] Open the invite link in a second browser/incognito window and join — both
      players appear in the lobby.
- [ ] Host starts the game; cards deal, turns advance, a wild prompts the color
      picker, and a round completes.
- [ ] Kill one tab mid-game and reopen the room URL — it **rejoins** the same seat
      (proves the socket points at the deployed server, not `localhost`).
- [ ] `/demo` and `/demo/components` return **404** (dev routes are gated off in
      production).

If the board never leaves "Connecting…", the web app can't reach the game
server — re-check `NEXT_PUBLIC_PARTYKIT_HOST` and that you **rebuilt** after
setting it.

---

## Operational notes (v1 scope)

- **State is in memory.** Each room lives in its PartyKit party's memory. A player
  dropping is covered by rejoin; a rare **server restart** drops any in-progress
  game. There is no database by design (see `UNO_PRD.md`).
- **Disconnect grace:** a disconnected player's turn auto-passes after 30s
  (`DISCONNECT_GRACE_MS` in `party/server.ts`).
- **Rooms are ephemeral** and keyed only by the 6-char code — no accounts, no
  persistence, no spectators (all v1 non-goals).
- **Scaling:** PartyKit runs one isolate per room, so rooms scale independently;
  no shared bottleneck.
