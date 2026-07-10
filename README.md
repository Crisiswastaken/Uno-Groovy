# Custom UNO

Web-based multiplayer **UNO** with host-configurable house rules — built with a
server-authoritative game engine so hands stay secret and dropped players can
rejoin their exact seat. Play 2–4 players per room over a shareable code.

> **Desktop only for now** — the table isn't responsive yet, so phones/small
> screens see a "Desktop only" notice. See [v1 scope](#notes--v1-scope).

## Features

- 🎴 **2–4 player rooms** with a shareable 6-char code / invite link.
- 🔒 **Server-authoritative** — the deck and every hand live on the server; the
  client only ever sees its own cards. No cheating, and reconnects restore state.
- ⚙️ **Configurable house rules** — UNO-call penalty, +2/+4 stacking, same-rank
  stacking, draw-until-playable, force-play, deal size, and single-round vs
  target-score scoring.
- 🔁 **Resilient** — rejoin-first connection, a 30s disconnect grace with
  auto-pass, and live reconnect banners.
- ✨ A hand-drawn "groovy" art style, a first-visit loading intro, and playful
  table motion.

## Tech stack

| Layer | Choice |
|---|---|
| UI + lobby | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (CSS-first) |
| Realtime game server | PartyKit (one stateful "party" per room) |
| Client view state | Zustand |
| Validation | Zod (every inbound action) |
| Tests | Vitest (pure engine) |

## Quick start

```bash
npm install
npm run dev        # starts the web app (:3000) + game server (:1999)
```

Open **http://localhost:3000**, create a room, and open the invite link in a
second window to join. Full instructions — including **playing with friends over
LAN or the internet** — are in **[SETUP.md](SETUP.md)**.

## Documentation

| Doc | What's in it |
|---|---|
| **[SETUP.md](SETUP.md)** | Install, run locally, and host a game for friends (LAN / ngrok / cloudflared). |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Deploy to production (PartyKit + Vercel), env-var reference, verification checklist. |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Architecture, project layout, and PR guidelines. |
| **[.env.example](.env.example)** | The environment variables and what they do. |

## Project structure

```
party/server.ts        PartyKit room server: identity, validation, broadcast, auto-pass
src/engine/            Pure, unit-tested game engine (types, deck, rules, engine)
src/shared/protocol.ts Zod message schemas + client/server message types
src/store/ src/hooks/  Zustand view store + PartySocket connection
src/lib/               identity, avatars, asset preloading, env flags
src/app/               Routes: landing, /create, /room/[code], /demo (dev-only)
src/components/         Lobby, GameTable, Card/Hand, ColorPicker, RoundEnd, Toasts, ...
public/                Served card art, fonts, avatars, backgrounds
```

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Web app + game server together (webpack). |
| `npm run dev:lan` | Same, but web app bound to `0.0.0.0` for LAN play. |
| `npm run dev:next` / `dev:party` | Run either process alone. |
| `npm test` | Engine unit tests (Vitest). |
| `npm run build` / `start` | Production build / serve. |
| `npm run deploy:party` | Deploy the game server to PartyKit. |
| `npm run clean` | Delete the `.next` cache. |

## House rules (set by the host at room creation)

| Rule | Default | Effect |
|---|---|---|
| `unoCall` / `unoPenalty` | on / 2 | Player at 1 card must call UNO; catchable until the next player acts. |
| `stackDraw2OnDraw2` | off | +2 may be stacked onto +2. |
| `stackDraw4OnDraw2Or4` | off | +4 may be stacked onto +2 or +4. **+2 onto +4 is never allowed.** |
| `stacking` | off | Play several same-rank cards (any color) in one turn. |
| `drawPenaltyBehavior` | drawOneAndPass | Draw one then pass, or keep drawing until playable. |
| `forcePlay` | off | Must immediately play a drawn card if it's playable. |
| `dealSize` | 7 | Starting hand size. |
| `scoringMode` / `targetScore` | singleRound / 500 | First to empty hand wins, or accumulate points to a target. |

## Notes / v1 scope

- Room state lives in **server memory**: a *player* dropping is covered by
  rejoin; a rare *server* restart drops an in-progress game (no database by
  design).
- **Non-goals for v1:** spectators, jump-in / 7-0, accounts, chat,
  cross-session persistence, and **mobile responsiveness**.

Built per [`UNO_PRD.md`](UNO_PRD.md). Design system in [`design.md`](design.md).
