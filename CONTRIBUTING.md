# Contributing to Custom UNO

Thanks for your interest in improving Custom UNO! This guide covers how to get
set up, how the project is organized, and what we expect in a pull request.

## Getting started

1. Fork and clone the repo.
2. Follow **[SETUP.md](SETUP.md)** to install and run locally (`npm run dev`).
3. Create a branch off `main`:
   ```bash
   git checkout -b feat/short-description
   ```

## Project layout

```
server/index.ts        Game server (deployed): standalone Node ws server — identity, validation, broadcast, 30s auto-pass
party/server.ts        Legacy PartyKit variant of the same server (unused; kept for reference)
src/engine/            Pure, unit-tested game engine (no networking, no React) — shared by both servers
  types.ts  deck.ts  rules.ts  engine.ts  engine.test.ts
src/shared/protocol.ts Zod message schemas + client/server message types
src/store/gameStore.ts Zustand store (personalized view + toasts)
src/hooks/useRoom.ts   PartySocket connection: rejoin-first-then-join
src/lib/               identity (localStorage), avatars, assets/preload, env flags
src/app/               Routes: landing, /create, /room/[code], /demo (dev-only)
src/components/        Lobby, GameTable, Card/Hand, ColorPicker, RoundEnd, Toasts, ...
public/                Served assets (card art, fonts, avatars, backgrounds)
```

### Architecture in one paragraph

The game is **server-authoritative**: `server/index.ts` owns the full
`RoomState`, applies every action through the pure functions in `src/engine/`,
and broadcasts a **personalized, public-safe** `ClientView` to each player (your
hand is yours; others only send counts). The client is a thin renderer of that
view plus the action messages defined in `src/shared/protocol.ts`. Keep game
rules in the engine, not in components — both `server/index.ts` (the deployed
Node server) and `party/server.ts` (the legacy PartyKit variant) are thin
transports over the same engine, so a rule change is made once and both get it.

## Making changes

- **Game logic** lives in `src/engine/`. It's pure and covered by
  `engine.test.ts` — add/adjust tests for any rule change.
- **New client→server actions** must be added to the Zod schema in
  `src/shared/protocol.ts` **and** handled in `party/server.ts`. Never trust the
  client — validate on the server.
- **Images** render through the shared `<Card>` component (`src/components/ui/Card.tsx`),
  not raw `next/image`. Card faces/backs go through `CardFace` / `CardBack`.
- **Styling** is Tailwind v4 (CSS-first, configured in `src/app/globals.css`).
  Use the `uno-*` design tokens and existing shadow/elevation utilities — don't
  introduce new hues. The palette is fixed (see `design.md`).
- **Dev-only scratch routes** (`/demo*`) are gated by `src/lib/env.ts` and 404 in
  production. Keep experimental UI there.

## Before you open a PR

Run the full check suite and make sure it's green:

```bash
npm test              # engine unit tests
npx tsc --noEmit      # typecheck (no errors)
npx next build        # production build succeeds
```

If your change is visual or gameplay-facing, verify it end-to-end by running the
app and playing through the affected flow (two browser windows for multiplayer).

## Pull request guidelines

- Keep PRs focused — one logical change per PR.
- Write a clear title and describe **what** changed and **why**.
- Match the surrounding code style (naming, comment density, idioms). The code
  favors small, well-commented functions and explains *why*, not *what*.
- Note any new environment variables (and add them to `.env.example`).
- Call out anything that changes the client/server protocol or persisted
  `localStorage`/state shape.

## Commit messages

Write imperative, descriptive messages, e.g. `Add draw-until-playable option to
create form`. Group related work into logical commits rather than one giant blob.

## Scope reminder (v1 non-goals)

Per `UNO_PRD.md`, these are intentionally out of scope for now: spectators,
jump-in / 7-0 rules, accounts, chat, cross-session persistence, and mobile
responsiveness. If you want to tackle one, open an issue to discuss first.
