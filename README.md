# Uno - Groovy

Web-based multiplayer **UNO** with host-configurable house rules — built with a
server-authoritative game engine so hands stay secret and dropped players can
rejoin their exact seat. Play 2–4 players per room over a shareable code.

> **v2.1 — Gameplay polish.** Catchable UNO, wild stacking, a smoother win
> handoff, lobby QR invites, and cold-start messaging when the free-tier server
> wakes up. Phones still get the v2 portrait experience — see
> [what's new](#whats-new).

## Features

- 📱 **Plays on a phone** — a dedicated portrait game table (not a squeezed
  desktop one), a swipeable card hand with momentum, and a portrait landing
  hero. Rotate to landscape and it asks for portrait back.
- 🎴 **2–4 player rooms** with a shareable 6-letter code, invite link, and
  lobby QR for phone joins.
- 🔒 **Server-authoritative** — the deck and every hand live on the server; the
  client only ever sees its own cards. No cheating, and reconnects restore state.
- ⚙️ **Configurable house rules** — UNO-call penalty, +2/+4 stacking, same-rank
  stacking, draw-until-playable, force-play, deal size, and single-round vs
  target-score scoring.
- 🔁 **Resilient** — rejoin-first connection with a join watchdog, a 30s turn
  clock with auto-pass, live reconnect banners, cold-start messaging when the
  game server is waking, and abandoned rooms swept from memory.
- ✨ A hand-drawn "groovy" art style, a first-visit loading intro, playful table
  motion, and a confetti win screen.

## What's new

### v2.1

- **Catch UNO is actually playable.** A large catch action sits beside your own
  UNO button (desktop bottom-left, phone above the tray); seat pills remain as
  markers.
- **Wild and +4 multi-card play.** The "Play multiple cards" rule and the +2/+4
  chain toggles each allow several of their rank in one turn; a stack of wilds
  asks for color once.
- **Win screen handoff.** The final board holds ~1.1s, fades out, then the win
  screen arrives in two acts — name first, then crown, card, and scoreboard.
  Confetti fires on the name.
- **Lobby invite QR** — scan to join; tap the code/QR block to copy the link.
- **Cold-start UX** when the Render free tier is waking: after 3.5s the room
  screen explains the wait and shows elapsed time (`GET /health` probe).
- **Join watchdog** — rejoin failures fall back to a fresh join, retried every
  2.5s until state arrives; host rule config survives a stuck reload.
- **Custom 404** — three UNO cards spell 404 on the landing hero art.

### v2

- **Mobile responsive throughout.** Phones (≤500px) get `MobileGameTable`, a
  portrait landing composition, and the same end screens reflowed — the desktop
  experience is untouched.
- **Redesigned win screen.** The landing hero art as a backdrop, the winner's
  name as the headline, a staged entrance, and confetti.
- **Room codes are letters-only.** The display font has no digit or punctuation
  glyphs, so codes are now 6 letters (A–Z minus I/L/O).
- **Server room lifecycle.** Rooms are created on join rather than on socket
  connect, the turn clock parks while a room is empty, and abandoned rooms are
  swept after 10 minutes.
- **Fixes:** `/create` could not scroll on a first visit (the loading splash
  never cleared its scroll lock), and its rule settings are now remembered
  across a refresh.

## Game Stills

<img width="3132" height="1762" alt="Frame" src="https://github.com/user-attachments/assets/87c4dff0-cfca-4150-9899-42bc89ae6099" />

<img width="3517" height="1770" alt="image 3" src="https://github.com/user-attachments/assets/b17c28a6-fec6-4b28-be4b-ac4c8e08fb04" />

<img width="3511" height="1771" alt="image 5" src="https://github.com/user-attachments/assets/f9433c4b-565a-40e3-bc0f-514ac8b86a8d" />

<img width="3511" height="1777" alt="image 8" src="https://github.com/user-attachments/assets/395ddec5-215e-47ca-8ab8-caf85c5e8327" />

## Tech stack

| Layer | Choice |
|---|---|
| UI + lobby | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (CSS-first) |
| Realtime game server | Standalone Node WebSocket server (`server/`), reusing the shared engine |
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
| **[SETUP.md](SETUP.md)** | Install, run locally, and host a game for friends (deploy / LAN / tunnel). |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Deploy to production (game server on Render + web app on Vercel), env-var reference, verification checklist. |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Architecture, project layout, and PR guidelines. |
| **[.env.example](.env.example)** | The environment variables and what they do. |

## Project structure

```
server/index.ts        Game server (deployed): Node ws server — identity, validation, broadcast, auto-pass
party/server.ts        Legacy PartyKit variant of the same server (unused; kept for reference)
src/engine/            Pure, unit-tested game engine (types, deck, rules, engine) — shared by both
src/shared/protocol.ts Zod message schemas + client/server message types
src/store/ src/hooks/  Zustand view store + PartySocket connection + useIsPhone (the ≤500px seam)
src/lib/               identity, avatars, asset preloading, env flags
src/app/               Routes: landing, /create, /room/[code], /demo (dev-only)
src/components/        Lobby, GameTable + MobileGameTable, HeroScene, RoundEnd, CatchCall, RoomQr, Confetti, ...
public/                Served card art, fonts, avatars, backgrounds
```

Desktop and phone deliberately keep **separate component trees** — `GameTable`
vs `MobileGameTable` — so a mobile CSS change can't reach the finished desktop
table. The flip side: genuine *game-logic* fixes must be applied to both. See
[`CLAUDE.md`](CLAUDE.md) for the full rules.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Web app + game server together (webpack). |
| `npm run dev:lan` | Same, but web app bound to `0.0.0.0` for LAN play. |
| `npm run dev:next` / `dev:server` | Run either process alone. |
| `npm run start:server` | Run the game server (production start command). |
| `npm test` | Engine unit tests (Vitest). |
| `npm run build` / `start` | Production build / serve of the web app. |
| `npm run clean` | Delete the `.next` cache. |

## House rules (set by the host at room creation)

| Rule | Default | Effect |
|---|---|---|
| `unoCall` / `unoPenalty` | on / 2 | Player at 1 card must call UNO; catchable until the next player acts. |
| `stackDraw2OnDraw2` | off | Chain +2 on +2 (also lets you play several +2s at once). |
| `stackDraw4OnDraw2Or4` | off | Chain +4 on +2 or +4. **+2 onto +4 is never allowed.** Also lets you play several +4s at once. |
| `stacking` | off | Play multiple cards — several same-rank cards in one turn (two 5s, two Wilds, two +4s, etc.). |
| `drawPenaltyBehavior` | drawOneAndPass | Draw one then pass, or keep drawing until playable. |
| `forcePlay` | off | Must immediately play a drawn card if it's playable. |
| `dealSize` | 7 | Starting hand size. |
| `scoringMode` / `targetScore` | singleRound / 500 | First to empty hand wins, or accumulate points to a target. |

## Notes / scope

- Room state lives in **server memory**: a *player* dropping is covered by
  rejoin; a rare *server* restart drops an in-progress game (no database by
  design). Rooms with no live connections are swept after 10 minutes.
- **Phone support is portrait-only.** A phone in landscape gets a "rotate to
  portrait" prompt rather than a squashed table.
- **Still out of scope:** spectators, jump-in / 7-0, accounts, chat, and
  cross-session persistence.

Built per [`UNO_PRD.md`](UNO_PRD.md). Design system in [`design.md`](design.md).
Working rules for changing the UI — especially mobile — are in
[`CLAUDE.md`](CLAUDE.md).

## License

This project is released under the [MIT License](LICENSE).

## Trademark & fair use

**UNO** is a registered trademark of Mattel, Inc. This repository is an
independent, non-commercial hobby project — built so a few friends could play
together online. It is not affiliated with, endorsed by, or sponsored by Mattel.

The name and card game concept are used here only to describe what the app does.
All original artwork, code, and assets in this repo are my own work.

If Mattel (or its representatives) believe this project infringes their rights,
please reach out or file a DMCA notice — I will comply promptly and take the
site down. No lawyers required on my end; a straightforward takedown request is
enough.

## Analytics

The deployed web app uses [Vercel Web Analytics](https://vercel.com/docs/analytics)
for anonymous, privacy-friendly page-view metrics. Analytics runs in the browser
only; no game data or player identities are sent to Vercel.
