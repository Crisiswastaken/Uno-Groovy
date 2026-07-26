# Custom UNO — Product Requirements Document (v1)

> **Status: historical.** This is the v1 spec as written before build, kept as a
> record of intent. It is *not* maintained against the current app. Two things
> have since changed: the UI is no longer "minimal, decorated later" (see
> [`design.md`](design.md)), and mobile responsiveness — a v1 non-goal — shipped
> in v2. For what the app does today, see [`README.md`](README.md) and
> [`CHANGELOG.md`](CHANGELOG.md).

**Owner:** Vince
**Status:** Draft for build
**Last updated:** 2026-07-07

---

## 1. Overview

A web-based multiplayer UNO game for playing with friends, with **configurable house rules** set per-room by the host. The differentiator vs. UNO online is that the ruleset is not fixed — the host toggles which rules are active before the game starts. v1 targets a small, private, friends-only experience: create a room, share a code, play.

### 1.1 Goals
- Real-time 4-player UNO that works smoothly with friends over the internet.
- Host-configurable house rules, chosen at room creation, active for the whole game.
- Rejoin support so a dropped player can get back into their exact game state.
- Minimal but functional UI — correctness and feel of gameplay over visual polish (design refined later).

### 1.2 Non-goals (v1)
- Spectators.
- Jump-in and 7-0 rules.
- Matchmaking / public lobbies / friend systems / accounts.
- Chat, emotes, stats, leaderboards, persistence across sessions beyond an active game.
- Mobile-native apps (responsive web is enough).

---

## 2. Tech Stack

The rejoin requirement + server-authoritative state is the deciding constraint. The game logic **must** live on the server (clients cannot be trusted with the deck, or a player could read opponents' hands from network traffic). That rules out purely client-side/P2P approaches.

| Layer | Choice | Why |
|---|---|---|
| **Framework** | **Next.js (App Router) + TypeScript** | Your existing stack; hosts both the UI and the room/lobby REST endpoints. |
| **Realtime + game server** | **PartyKit** | Purpose-built for exactly this: each room = one stateful server instance ("party") holding authoritative game state in memory, with a websocket per player. Rejoin, per-room isolation, and server-authority come essentially for free. Far less boilerplate than hand-rolling Socket.io + a room registry + sticky sessions. |
| **Client state** | **Zustand** | Lightweight; holds the *client's view* of game state (its own hand + public state) pushed from the server. |
| **Styling** | **Tailwind CSS** | Minimal utility styling for v1. |
| **Card assets** | Individual PNGs | Served statically; mapped by a card-id convention (below). |
| **Validation** | **Zod** | Validate room config + every inbound client action against a schema server-side. |
| **Hosting** | Vercel (Next.js) + PartyKit (Cloudflare-backed) | Both deploy trivially; PartyKit is built to pair with Next.js. |

### 2.1 Why PartyKit over the alternatives
- **Socket.io (raw):** you'd build your own room manager, in-memory state store, reconnection token logic, and worry about horizontal scaling / sticky sessions. More control, much more code.
- **Supabase Realtime:** great for broadcast/presence, but it's not a natural home for *authoritative turn-based game logic with a hidden deck*. You'd be fighting it to keep hands secret and enforce turn order.
- **Colyseus:** solid dedicated game-server framework and a legitimate alternative; heavier to set up/host than PartyKit for a 4-player card game, and its state-sync model is more than we need here.

**Trade-off to accept:** PartyKit keeps room state in memory. If a room's server instance restarts, an in-progress game is lost. For a friends' game this is acceptable; we mitigate the common case (a *player* dropping) via rejoin, not the rare case (server restart).

---

## 3. Card Model & Assets

### 3.1 Deck composition (standard 108)
- **Number cards:** colors ×4 (red/orange in your set, yellow, green, blue). Per color: one `0`, two each of `1–9` → 19 per color → **76**.
- **Action cards (per color):** two `skip`, two `reverse`, two `draw2` → 6 per color → **24**.
- **Wild cards:** four `wild`, four `wild_draw4` → **8**.
- **Total: 108.**

> Note: your reference sheet shows red/orange rather than the classic red — purely cosmetic, the engine treats it as one of four color identities. We'll name the four colors consistently in code (e.g. `red`, `yellow`, `green`, `blue`) regardless of the exact hue rendered.

### 3.2 Card ID convention
Each physical card instance needs a unique runtime id, but the *type* maps to one PNG:
- Type key: `{color}_{value}` for colored cards (`red_7`, `blue_skip`, `green_draw2`), and `wild`, `wild_draw4` for wilds.
- Asset path: `/cards/{typekey}.png`.
- Runtime instance: `{ uid: string (nanoid), color, value }`. Duplicates share a type key/PNG but have distinct `uid`s.
- Card back: single `/cards/back.png` for opponents' hands and the draw pile.

### 3.3 Values enum
`0–9 | skip | reverse | draw2 | wild | wild_draw4`. Color ∈ `red | yellow | green | blue | null` (null only for undeclared wilds; once a wild is played the chosen color is stored separately as `activeColor`).

---

## 4. Game Rules

### 4.1 Permanent rules (not configurable)
1. Standard turn order; reverse flips direction; with 2 players reverse acts as a skip.
2. A card is playable if it matches the discard pile's **active color**, its **number**, or its **symbol**; wilds are always playable.
3. **Draw-if-no-valid-card:** if you have no playable card you must draw. Even if you *do* hold a wild/wild_draw4, you may choose to draw instead of playing it (i.e. holding a wild never *forces* you to play).
4. Wild lets the player choose the new active color.
5. **Win:** first player to empty their hand ends the round.
6. **+2 may never be stacked onto a +4.** (Hard constraint regardless of stacking toggles.)
7. wild_draw4 makes the next player draw 4 and (unless stacking applies) lose their turn; wild sets color only.
8. skip skips the next player; draw2 makes next player draw 2 and lose their turn (unless stacking applies).

### 4.2 Configurable rules (host sets at room creation)

| Rule | Options | Default | Notes |
|---|---|---|---|
| `unoCall` | on / off | on | If on, a player reaching 1 card must "call UNO". |
| `unoPenalty` | integer (cards drawn) | 2 | Only relevant if `unoCall` is on. Applied if caught not calling before next player acts. |
| `stackDraw2OnDraw2` | allowed / not | not | +2 may be played onto a +2 to pass/accumulate the penalty. |
| `stackDraw4OnDraw2Or4` | allowed / not | not | +4 may be stacked onto a +2 or +4. **+2 onto +4 remains forbidden always.** |
| `drawPenaltyBehavior` | `drawOneAndPass` / `drawUntilPlayable` | `drawOneAndPass` | On a normal turn with no play: draw exactly one then pass, vs. keep drawing until a playable card appears. |
| `forcePlay` | on / off | off | If on and the card you drew is playable, you must play it immediately. |
| `dealSize` | integer | 7 | Starting hand size. |
| `scoringMode` | `singleRound` / `targetScore` | `singleRound` | Single round = first to empty hand wins. Target = accumulate points across rounds. |
| `targetScore` | integer | 500 | Only relevant if `scoringMode = targetScore`. |

### 4.3 Stacking resolution logic
- A "draw stack" accumulates the pending draw count while consecutive stackable draw cards are played.
- Legal stacking transitions (only when the corresponding toggle is on):
  - `draw2 → draw2` if `stackDraw2OnDraw2`.
  - `draw2 → draw4` if `stackDraw4OnDraw2Or4`.
  - `draw4 → draw4` if `stackDraw4OnDraw2Or4`.
  - **`draw4 → draw2` is never legal.**
- When a player in the stack chain cannot (or chooses not to) continue stacking, they draw the accumulated total and lose their turn; the stack resets to 0.
- If all stacking toggles are off, any draw card immediately resolves against the next player (no accumulation).

### 4.4 Scoring (only if `targetScore`)
Standard UNO card points, tallied to the round winner from opponents' remaining hands: number cards = face value; skip/reverse/draw2 = 20; wild/wild_draw4 = 50. First to reach `targetScore` wins the match.

---

## 5. Room / Lobby System

### 5.1 Lifecycle
1. **Create room:** host opens the app, sets house-rule config, gets a room code (e.g. 6-char). Host is seated as player 1.
2. **Join room:** friend enters code + display name. Rejects if room full (4) or game already started (unless they're rejoining — see 5.3).
3. **Lobby:** shows seated players, host-only "Start" button. Host can start with 2–4 players.
4. **In-game:** authoritative state on the room server; each client sees public state + own hand.
5. **Round/match end:** show result; host can start a new round (rematch) reusing the same config, or close the room.

### 5.2 Identity & rejoin
- On first join, the server issues a **session token** (`playerId` + secret) tied to `{roomCode, seat}`, stored in the client (localStorage).
- Reconnect flow: client reconnects with its token → server matches it to the existing seat → re-sends that player's full private view. Socket id is *not* identity; the token is.
- A disconnected player's seat is held; their hand persists in server memory. If it's their turn, the server holds for 30s then auto-draws one and passes (§9.1).

### 5.3 Edge cases to handle
- Host leaves: promote next-seated player to host, or if lobby is empty, tear down room.
- Player disconnects on their turn: hold 30s, then auto-draw one + pass (§9.1).
- Draw pile exhausted: reshuffle the discard pile (except the top card) into a new draw pile.
- Everyone leaves: destroy room + state.

---

## 6. Server-Authoritative State

### 6.1 Full server state (per room)
```
RoomState {
  roomCode
  hostPlayerId
  config: RuleConfig
  phase: 'lobby' | 'in_round' | 'round_end' | 'match_end'
  players: Player[]        // seat order, includes connection status
  drawPile: Card[]
  discardPile: Card[]
  activeColor: Color
  direction: 1 | -1
  currentSeat: number
  pendingDraw: number      // current draw-stack accumulation
  scores: Record<playerId, number>   // targetScore mode
  lastActionLog: ActionLogEntry[]     // for UI feedback
}

Player {
  playerId
  displayName
  seat
  hand: Card[]             // private — only sent to the owning client
  hasCalledUno: boolean
  connected: boolean
}
```

### 6.2 Client-visible state (what each player receives)
- Full public state: discard top, active color, direction, current seat, each opponent's **hand count** (not contents), scores, action log, phase.
- Private: **only the requesting player's own `hand`.**
- Rule: the server never sends another player's hand contents or the draw pile order to any client.

### 6.3 Client → server actions
`joinRoom`, `rejoin`, `setConfig` (host, lobby only), `startGame` (host), `playCard {uid, chosenColor?}`, `drawCard`, `callUno`, `catchMissedUno {targetPlayerId}`, `passAfterDraw`, `startNextRound` (host), `leaveRoom`.

### 6.4 Server → client events
`stateUpdate` (full personalized snapshot), `youWereDealt`, `turnChanged`, `invalidAction {reason}`, `roundEnded {winner, scores}`, `matchEnded {winner}`, `playerConnectionChanged`.

**Validation:** every inbound action is validated server-side — correct player, correct turn, legal card, config-compliant — before mutating state. Illegal actions return `invalidAction` and change nothing.

---

## 7. Minimal UI (v1)

Functional, not decorated. Screens:
1. **Landing:** Create Room / Join Room.
2. **Create config:** form of the toggles in §4.2, then Create.
3. **Lobby:** room code (copyable), player list, Start (host).
4. **Game table:**
   - Opponents around the top/sides showing name + card-count (card backs).
   - Discard pile (top card) + active color indicator + draw pile (clickable to draw).
   - Direction + whose-turn indicator.
   - Your hand along the bottom (clickable cards; illegal cards visually dimmed/disabled).
   - Wild → color picker modal.
   - "UNO" button when you hit 1 card; a way to catch an opponent who didn't call.
   - Action log / toast feedback ("Blue played +2", "You drew 2").
5. **Round/match end:** result + Rematch (host).

---

## 8. Build Phases

1. **Engine (pure, testable):** deck build/shuffle/deal, playability check, turn advance, stacking resolution, scoring — as pure TS functions with unit tests, no networking.
2. **PartyKit room server:** wrap the engine in a room instance; wire actions/events; personalized state snapshots; validation.
3. **Lobby + config:** create/join/room-code, config form, seating.
4. **Game UI:** table, hand, play/draw, wild picker, turn indicator.
5. **Rejoin:** session tokens, reconnect flow, connection status.
6. **House-rule wiring:** ensure each toggle actually alters engine behavior; test each combination.
7. **Polish pass (later):** your design refinement.

---

## 9. Resolved Decisions
1. **Disconnect handling:** a disconnected player's turn is held for **30 seconds**; if they haven't reconnected/acted by then, the server **auto-draws one card and passes** their turn, so a single dropout can't freeze the game. Their seat and hand persist for rejoin regardless.
2. **`drawUntilPlayable` + `forcePlay`:** when both are on and drawing yields a playable card, **playing it is mandatory** — the draw loop stops on the first playable card and the player must play it.
3. **UNO catch window:** an opponent can catch a missed UNO call **until the next player takes an action** (plays or draws). After that the window closes and no penalty applies.
4. **Room entry:** support **both** a shareable link (`/room/{code}`) and manual code entry. Opening the link prefills the code and prompts for a display name.
5. **Draw-pile exhaustion:** when the draw pile empties (including mid-stack), **preserve the top discard card** and reshuffle the rest of the discard pile into a new draw pile; resolution then continues normally.
