# Setup & running Custom UNO

A step-by-step guide to running the game on your machine — and to hosting it so
friends can join. For deploying to the cloud (Vercel + PartyKit), see
[DEPLOYMENT.md](DEPLOYMENT.md).

---

## 1. Prerequisites

- **Node.js 18+** and **npm** — check with `node -v`.
- **Git**.
- A modern desktop browser (the game is **desktop-only** for now — see the note
  at the bottom).

## 2. Install

```bash
git clone <your-repo-url> custom-uno
cd custom-uno
npm install
```

## 3. Run it locally

The app is two processes: the **Next.js web app** (`:3000`) and the **PartyKit
game server** (`:1999`). One command starts both:

```bash
npm run dev
```

Open **http://localhost:3000**. To test multiplayer on one machine, create a
room, copy the invite link, and open it in a second browser or an incognito
window to join as another player.

Prefer separate terminals?

```bash
npm run dev:next    # web app  → http://localhost:3000  (webpack)
npm run dev:party   # game server → http://127.0.0.1:1999
```

### Optional: environment config

For plain local play you don't need any config. To point the client at a
different game server, copy the example env file and edit it:

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
npx tsc --noEmit      # typecheck
npx next build        # production build
```

## 5. Windows / OneDrive notes

- Use `partykit` **≥ 0.0.115** (earlier versions have a Windows dev-server bug).
- Dev uses the **webpack** bundler by default. If the project lives inside a
  **OneDrive** folder, OneDrive can corrupt Turbopack's cache
  (*"Could not find the module … in the React Client Manifest"*). If you hit a
  stale-cache error, run `npm run clean` and restart. For the smoothest ride,
  keep the repo outside OneDrive.

---

## 6. Play with friends 🎮

Three ways, easiest first. Pick based on where your friends are.

### A. Same Wi-Fi (LAN) — no extra tools

If everyone is on the same network, just expose your local servers.

1. Find your machine's LAN IP:
   - **Windows:** `ipconfig` → the *IPv4 Address* (e.g. `192.168.0.106`).
   - **macOS/Linux:** `ipconfig getifaddr en0` or `hostname -I`.
2. Point the client at that IP for the game server — in `.env.local`:
   ```bash
   NEXT_PUBLIC_PARTYKIT_HOST=192.168.0.106:1999
   ```
3. Start both servers bound to all interfaces:
   ```bash
   npm run dev:lan
   ```
   (`dev:lan` runs the web app with `-H 0.0.0.0`; PartyKit already listens on
   `0.0.0.0`.)
4. Friends open **`http://192.168.0.106:3000`** in their browser.

> First run, Windows may pop a **Firewall** prompt for Node — allow it on
> private networks, or the others can't connect.

### B. Over the internet — deploy the game server + tunnel the web app (recommended)

The game server (PartyKit) has a **free** cloud, and deploying it once is far
simpler than tunneling two ports. Then you only tunnel the local web app.

1. Deploy the game server (one-time login, then deploy):
   ```bash
   npx partykit login
   npm run deploy:party
   ```
   Copy the printed host, e.g. `custom-uno.<your-user>.partykit.dev`.
2. Point the web app at it — in `.env.local`:
   ```bash
   NEXT_PUBLIC_PARTYKIT_HOST=custom-uno.<your-user>.partykit.dev
   ```
3. Run the web app locally:
   ```bash
   npm run dev:next
   ```
4. Expose port 3000 with a free tunnel and share the URL:
   ```bash
   ngrok http 3000
   #   → https://xxxx.ngrok-free.app   (send this to your friends)
   ```
   [ngrok](https://ngrok.com/download) free is fine here — you only need **one**
   tunnel. (`cloudflared tunnel --url http://localhost:3000` works too, with no
   account.)

### C. Fully local over the internet — two tunnels, no deploy

Keep *both* servers on your machine and tunnel each. This needs a tool that can
run two tunnels; [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
"quick tunnels" are free and need no account.

```bash
# terminal 1 — game server
npm run dev:party

# terminal 2 — tunnel the game server
cloudflared tunnel --url http://localhost:1999
#   → https://aaaa.trycloudflare.com   (copy the host, WITHOUT https://)
```

Put that host in `.env.local`, then start and tunnel the web app:

```bash
# .env.local
NEXT_PUBLIC_PARTYKIT_HOST=aaaa.trycloudflare.com
```

```bash
# terminal 3 — web app (start AFTER setting .env.local above)
npm run dev:next

# terminal 4 — tunnel the web app
cloudflared tunnel --url http://localhost:3000
#   → https://bbbb.trycloudflare.com   (send this to your friends)
```

> Order matters: the web app reads `NEXT_PUBLIC_PARTYKIT_HOST` at startup, so set
> it **before** starting terminal 3. Quick-tunnel URLs change every run.

**Which should I use?** Same room → **A**. Friends elsewhere → **B** (least
fiddly). No cloud account at all → **C**.

---

## Note: desktop only

The game is desktop-first and **not responsive yet**. On phones and small touch
screens it shows a "Desktop only" notice instead of the (broken) table. This is
a deliberate v1 restriction — see `src/components/MobileGate.tsx`.
