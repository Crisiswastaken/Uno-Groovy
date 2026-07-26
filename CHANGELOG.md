# Changelog

## v2.0.0 — Mobile responsive

Phones get a real experience instead of a "Desktop only" notice. Every screen
now has a portrait layout, and the finished desktop experience is untouched.

### Added

- **Mobile game table** (`MobileGameTable.tsx`) — a portrait board with its own
  seat layout, centre piles and hand tray, selected by `useIsPhone()` (≤500px).
- **Portrait landing hero** — a separate composition transcribed from the Figma
  frame *iPhone 17 - 2* (`1:153`), reusing the existing `/home-new` art. The
  desktop 16:9 scene is unchanged.
- **Shared hero backdrop** (`HeroScene.tsx`) — one `<HeroBackdrop />` carrying
  both compositions, now behind the landing page *and* the end screens.
- **Redesigned end screens** for all three states (single round, target score,
  match over): the hero art as backdrop, a crowned panel with the winner's name
  as the headline, a staged entrance, and a scoreboard for target-score games.
- **Confetti** on the win screen (`canvas-confetti`, on its own click-through
  canvas).
- **Inertial hand scrolling** — a rAF momentum layer so the card carousel
  decelerates instead of stopping dead.
- **Rule settings persist** on `/create` across a refresh.

### Changed

- **Room codes are letters-only**, 6 characters (A–Z minus I/L/O). The display
  font has no digit or punctuation glyphs, so digits rendered as tofu. Codes are
  stripped on input and validated at the WebSocket upgrade.
- **Mobile discard fans the last four cards** like desktop, instead of stacking
  them dead on top of each other; the draw pile moved left to make room.
- **Direction arcs** moved to the top and bottom of the pile and shortened —
  flanking it left/right crowded the board on a phone.
- **The mobile glass slab** is now a short bottom-anchored backdrop the cards
  rise out of, matching desktop, rather than the hand's full-height wrapper.
- **`/create` actions** are one aligned row (Back + Create) instead of a chunky
  button above a stray text link.
- **Empty-room TTL** cut from 30 to 10 minutes, swept every 30s.
- **The game-table background** now renders only during `in_round`; the end
  screens bring the hero art instead of stacking two full-bleed backgrounds.
- The loading splash now preloads the current `/home-new` landing art — it was
  still warming the previous hero's assets, so the hero popped in after the
  intro finished.

### Fixed

- **`/create` could not be scrolled on a first visit**, stranding the Create and
  Back buttons below the fold. `Splash` scheduled `setStatus("done")` inside the
  same effect that set `"exiting"`, with `status` in its deps — so the state
  change tore the effect down and its cleanup cleared that timer. The splash
  stayed `"exiting"` for the whole session, holding `<html style="overflow:
  hidden">`. A refresh took the "already seen" fast path, which is why it
  appeared to fix itself. This also left a permanent `transform` on the content
  wrapper, breaking `position: fixed` for the game table and flight overlay.
- **Raised cards were sheared** by the hand tray's clip: the lift headroom was
  too small, and card reserve heights used `W * 1.5` where the art is 1.559.
- **The "You" avatar was buried** under the card fan on mobile.
- **Orphaned room objects on the server.** Sockets captured the `Room` object,
  so the sweeper could delete a room a socket still pointed at; joining then
  mutated an orphan and leaked its turn timer. Rooms are now resolved by code
  per message.
- **The turn clock no longer runs into an empty room** — it auto-passed a turn
  every 30s to nobody until the room was swept, so a table everyone briefly
  dropped from came back several turns further along.
- **Rooms are allocated on `joinRoom`, not on socket connect**, so opening
  sockets can no longer mint unbounded rooms. Rejoining a swept room now returns
  an explicit error instead of silently dropping the player into a blank lobby.
- Removed the `!` from the win screen — the display font has no punctuation.

### Notes

- Phone support is **portrait-only**; landscape shows a rotate prompt.
- Existing invite links containing digits will no longer resolve, since the
  server now rejects non-letter room codes. Rooms are ephemeral, so this only
  affects links shared in the minutes around the upgrade.

---

## v1.0.0

Initial release: server-authoritative 2–4 player UNO with host-configurable
house rules, rejoin support, and a desktop-only table.
