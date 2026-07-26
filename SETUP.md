# Setup & running Custom UNO

A step-by-step guide to running the game locally and to letting friends play. For
production deployment (Render + Vercel), see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 1. Prerequisites

- **Node.js 20+** and **npm** — check with `node -v`.
- **Git**.
- A modern browser. Desktop and phones are both supported (see
  [testing the phone layout](#8-testing-the-phone-layout)).

## 2. Install

```bash
git clone <your-repo-url> custom-uno
cd custom-uno
npm install
```

## 3. Run it locally

The app is two processes: the **Next.js web app** (`:3000`) and the **game
server** (`:1999`, the standalone Node WebSocket server in `server/index.ts`).
One command starts both:

```bash
npm run dev
```

Open **http://localhost:3000**. To test multiplayer on one machine, create a
room, copy the invite link, and open it in a second browser or incognito window
to join as another player.

Prefer separate terminals?

```bash
npm run dev:next     # web app     → http://localhost:3000  (webpack)
npm run dev:server   # game server → ws://localhost:1999
```

### Optional: environment config

For plain local play you don't need any config — the client defaults to
`127.0.0.1:1999`. To point it at a different game server, copy the example env
file and edit it:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_PARTYKIT_HOST` | Host the browser connects to for the game server. Defaults to `127.0.0.1:1999`. |
| `NEXT_PUBLIC_APP_ENV` | `development` / `production`. Leave unset to follow `NODE_ENV`. Set `development` to reveal the `/demo` design routes. |

> Env vars are read when the dev server **starts** (and inlined at build time),
> so restart after changing `.env.local`.

## 4. Checks

```bash
npm test              # engine unit tests
npx tsc --noEmit      # typecheck (app + server)
npx next build        # production build of the web app
```

## 5. Windows / OneDrive note

Dev uses the **webpack** bundler by default. If the project lives inside a
**OneDrive** folder, OneDrive can corrupt Turbopack's cache
(*"Could not find the module … in the React Client Manifest"*). If you hit a
stale-cache error, run `npm run clean` and restart. For the smoothest ride, keep
the repo outside OneDrive.

---

## 6. Play with friends 🎮

Three ways, best first. Pick based on where your friends are.

### A. Deploy it (recommended — reliable, and free)

Host the game server on **Render** (free) and the web app on **Vercel** (free).
This gives everyone a stable link, no tunnels, no keeping your laptop on. Full
walkthrough in **[DEPLOYMENT.md](DEPLOYMENT.md)** — about 5 minutes.

Once deployed, just share your Vercel URL. This is the path to use for anything
beyond a quick one-off session.

### B. Same Wi-Fi (LAN) — no tools, no deploy

If everyone is on the same network:

1. Find your machine's LAN IP:
   - **Windows:** `ipconfig` → the *IPv4 Address* (e.g. `192.168.0.106`).
   - **macOS/Linux:** `ipconfig getifaddr en0` or `hostname -I`.
2. Point the client at that IP for the game server — in `.env.local`:
   ```bash
   NEXT_PUBLIC_PARTYKIT_HOST=192.168.0.106:1999
   ```
3. Start both servers, with the web app bound to all interfaces:
   ```bash
   npm run dev:lan
   ```
4. Friends open **`http://192.168.0.106:3000`**.

> First run, Windows may pop a **Firewall** prompt for Node — allow it on private
> networks, or others can't connect.

### C. Quick internet tunnel (throwaway)

For a one-off game with a remote friend and no deploy, you can tunnel your local
servers with [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
Two caveats learned the hard way:

- **Use `--protocol http2`.** The default QUIC transport mangles WebSocket
  handshakes on quick tunnels.
- **Serve a production build**, not the dev server — HMR over a tunnel is flaky.
  Build once (`NEXT_PUBLIC_PARTYKIT_HOST=<game-tunnel-host> npx next build`) then
  `npx next start`.

```bash
# 1) game server
npm run dev:server
# 2) tunnel it (copy the host, WITHOUT https://)
cloudflared tunnel --protocol http2 --url http://localhost:1999
# 3) .env.local: NEXT_PUBLIC_PARTYKIT_HOST=<that-host>, then build + start the web app
NEXT_PUBLIC_PARTYKIT_HOST=<game-tunnel-host> npx next build && npx next start
# 4) tunnel the web app and share its URL
cloudflared tunnel --protocol http2 --url http://localhost:3000
```

Honestly, if it's more than a quick test, **option A is less hassle**. Quick-tunnel
URLs also change every run.

**Which should I use?** Anything recurring → **A**. Same room → **B**. One-off with
a remote friend and you don't want to deploy → **C**.

---

## 8. Testing the phone layout

Phones are a **separate component tree**, not a reflowed desktop one, so they
need testing on their own.

- The switch is **viewport width ≤ 500px** (`src/hooks/useIsPhone.ts`). In
  Chrome DevTools, toggle device emulation and pick any phone preset — 390×844
  is a good default, 360×640 is the tight case worth checking.
- **Portrait only.** A phone in landscape gets a "rotate to portrait" overlay
  (`.rotate-prompt` in `globals.css`); that's intentional, not a bug.
- To play on a real phone on your network, use the LAN instructions in §6B — the
  phone just opens the same `http://<your-ip>:3000`.
- `/demo/mobile-2` and `/demo/mobile-4` render the phone table in a 390×844
  frame on a desktop browser, which is the fastest way to iterate on it. These
  routes are dev-only and 404 in production.
