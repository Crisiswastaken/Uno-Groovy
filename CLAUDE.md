# CLAUDE.md — Custom UNO

Next.js 16 (App Router) + React 19 + Tailwind **v4** + Zustand, with a Node `ws`
game server (`server/index.ts`). This file exists to make **mobile** changes fast
and safe. The desktop game is finished and polished — treat it as frozen.

Read this before touching any layout/CSS.

---

## 1. Breakpoint system (ONE definition)

There is **no `tailwind.config.*`** — Tailwind v4 is configured in CSS at
`src/app/globals.css` (`@theme` block). Historically three different "phone"
numbers were in play (500 / 640 / 950px); that fragmentation is the #1 cause of
mobile changes cascading unpredictably. Use these canonical values:

| Token            | Value        | Where it lives                          | Meaning                                    |
| ---------------- | ------------ | --------------------------------------- | ------------------------------------------ |
| **phone**        | `≤ 500px`    | `src/hooks/useIsPhone.ts` (`PHONE_QUERY`) | The switch that matters: renders `MobileGameTable` instead of `GameTable`. |
| **phone-landscape** | `landscape and max-height:500px and max-width:950px` | `.rotate-prompt` @media, `globals.css` | Shows the "rotate to portrait" overlay.    |

**Rules:**
- **≤ 500px is the definition of "phone."** Any new phone-vs-desktop decision
  keys off `useIsPhone()`, not an ad-hoc media query or Tailwind prefix.
- **Do not add new numeric breakpoints.** If you think you need one, you almost
  certainly want a component-local `clamp()` or a `useIsPhone()` branch instead.
- **Known mismatch (leave unless asked):** `Lobby` and `NameGate` still use
  Tailwind's default `sm:` (= **640px**), which never fires on a real phone
  (≤500px). It's harmless today because those screens degrade gracefully. When
  reworking one of them, migrate its `sm:` usage toward the 500px phone model
  rather than adding more `sm:` utilities. Do **not** globally redefine `sm:`.
  (`RoundEnd` was rewritten in v2 and is now fully fluid — `clamp()` and
  `min()` throughout, no breakpoints at all. Use it as the model.)
- Do **not** raise `useIsPhone` to 640px — that would reclassify small tablets as
  phones and hand them the portrait-only mobile board.

---

## 2. No fixed pixel widths on containers

Containers, positioners, and layout wrappers use **relative units only**:
`%`, `rem`, `clamp()`, `vw`/`vh`, `min()/max()`. No magic-number pixel widths on
anything that holds layout.

**Explicit, deliberate exception — individual card sizes.** Cards (`CardFace`/
`CardBack`, and the `W = …` widths in `MobileGameTable.tsx`) are sized in fixed
px **on purpose**: the mobile hand is a fixed-card-size fan that turns into a
horizontal **swipe carousel** when it overflows (`MobileHand`), so cards stay
readable instead of crushing to slivers. Keep card widths fixed; keep their
*containers* relative. The rule targets containers, not the cards.

When you do touch card sizing, prefer `clamp(min, vw-expr, max)` (as `MobileHand`
already does: `Math.max(54, Math.min(72, vw * 0.19))`) over a bare constant.

---

## 3. Desktop-critical — do NOT alter visually without explicit approval

The desktop experience is done. These are off-limits for mobile work; a mobile
tweak must never change how any of them render:

- `src/components/GameTable.tsx` — the desktop table.
- `src/components/OpponentSeat.tsx` — desktop opponent seats.
- The desktop branch of `src/components/RoomClient.tsx` (the `!isPhone` path).
- Shared visual primitives in `src/app/globals.css`: `.card-shadow*`, the
  `@keyframes` (card-drop, wild-pop, uno-wiggle, seat-bob, arrow-*, draw-hint-*,
  focal-*), and the color/radius `@theme` tokens. These are used by desktop too.

**Where mobile work belongs:** `src/components/MobileGameTable.tsx` and
`src/hooks/useIsPhone.ts`. Mobile and desktop tables **duplicate game logic
verbatim** — this is intentional isolation, so a mobile CSS change cannot reach
desktop. The flip side: real *game-logic* fixes must be applied to **both**
`GameTable.tsx` and `MobileGameTable.tsx`.

**The exception — shared, on purpose:** `src/components/HeroScene.tsx` carries
*both* the desktop and phone hero compositions behind one `<HeroBackdrop />`,
and it backs the landing page **and** `RoundEnd`. It's shared because it has no
game logic — only art placement. Changing a layer there changes both screens, so
check both. Each composition is transcribed from its own design canvas
(desktop 3132×1762; phone 806×1752, from the Figma frame "iPhone 17 - 2",
node `1:153`) — keep layer coordinates in those canvas units so the code stays
diffable against the design.

If a change genuinely needs to alter a desktop-critical file, stop and get
explicit approval first.

---

## 4. Card rendering & scaling (PNG, not SVG)

Cards are **PNG raster** images (`/public/cards/*.png`), not SVG. Art is
**660×1029** — ratio ≈ **1.559**, *taller* than a flat 2:3.

- **Cards are width-driven:** pass a `width`, let `height` be `auto`
  (`CardFace`/`CardBack` in `src/components/Card.tsx`, via `ui/Card.tsx`).
- **NEVER force `aspect-ratio: 2/3` or `overflow: hidden` on a card.** It was
  tried and sheared ~6% off the bottom of every card (the ratio is 1.559, not
  1.5). This scar is documented at `globals.css:270` — don't reintroduce it.
- Corner radius scales with width (~10% of width) in `ui/Card.tsx` — don't
  hardcode a fixed radius on cards.

**Inline SVG** (decorative only): direction arcs + pointer chevron in
`MobileGameTable.tsx`, and `CountdownRing` in `TurnTimer.tsx`. These already use
`viewBox` + a sized container and scale correctly. Keep that pattern for any new
inline SVG: define a `viewBox`, size the wrapping element, never hardcode
`width`/`height` in px on the `<svg>` without a `viewBox`.

---

## 5. Prefer component-by-component fixes over global media-query sweeps

Because the mobile UI is an **isolated component tree** (`MobileGameTable` and its
sub-components), a mobile fix belongs in the specific sub-component
(`MobileSeat`, `MobileHand`, `MobileDrawPile`, `MobileDiscard`, `MobileArrows`),
**not** in a global `@media` block in `globals.css`. Global sweeps are what
caused the blind trial-and-error breakage: they touch desktop and every screen
at once. Scope changes as tightly as possible.

**Animation:** the app uses CSS `@keyframes` (in `globals.css`) + `tw-animate-css`
+ a **custom JS flight layer** (`src/components/cardFlight.tsx`, `useFlights`).
There is **no framer-motion / GSAP** — do not add one. Extend the existing
keyframes or the flight layer instead of introducing a new animation system.

The one dependency exception is `canvas-confetti` (`src/components/Confetti.tsx`,
the win burst). It's single-purpose particles on its own canvas, not a general
animation system, and it sits alongside the hand-written `ClickSpark` /
`CursorTrail` canvases. Note it runs with `useWorker: false` **deliberately** —
the worker path calls `transferControlToOffscreen()`, which is one-way, and
`reactStrictMode` double-invokes effects in dev.

**Adding keyframes:** new names are fine and additive. The `win-*` set
(`globals.css`) drives the end-screen entrance and is a good model — note that
`.win-crown` and `.win-card` use `animation-fill-mode: both` because their
*resting* transforms (a `-50%` centering and a 12° tilt) are the final keyframe;
with `backwards` they'd jump on completion. Anything whose final state is
identity should use `backwards` so hover/active transforms still work after.

---

## 6. Known-good state (don't regress these)

As of **v2**, the mobile portrait experience works end to end. Preserve:

- **Phone detection is width-only (≤500px)** — correctly keeps tall phones
  (e.g. 412×915) on the mobile layout. The old `max-height` clause wrongly
  bounced them to desktop; don't reintroduce a height clause.
- **Hand = fixed-size fan → swipe carousel on overflow** (`MobileHand`). Cards
  never crush; the tray scrolls horizontally. Keep card width fixed and let the
  container scroll.
- **The hand scroller uses `touch-action: pan-y`, not `pan-x`** — `useHandInertia`
  drives the horizontal axis itself (rAF momentum with velocity decay). Setting
  `pan-x` would put the browser's native pan back in the fight. A gesture only
  counts as a drag past `DRAG_SLOP` (6px), so taps still play the card.
- **`LIFT_UP` (70px) is a clip budget, not decoration.** The scroller must clip
  on Y (CSS can't pair `overflow-x: auto` with `overflow-y: visible`), so the box
  has to be tall enough for the max card lift + fan rotation + shadow. Shrink it
  and raised cards get sheared.
- **Card reserve heights go through `cardH()` (ratio 1.559), never `W * 1.5`.**
  See §4 — the art is 660×1029.
- **The glass slab is a bottom-anchored backdrop, not the hand's wrapper.** As
  the wrapper it inherited the full lift headroom and read as a tall empty pane.
- **Action bar / UNO button anchor to the tray's top edge via `bottom-full`**
  (not a guessed `vh` offset), so they sit correctly on any screen height.
- **The pile pair is centred as a GROUP**, with the draw pile left of the discard
  so the discard has room to fan `view.recentDiscard`. Mirroring desktop exactly
  (discard dead-centre) does *not* fit — at 360px the draw pile collides with the
  side opponent seats.
- **Landscape shows the rotate-to-portrait prompt** (`.rotate-prompt`).

### Known fragile spots (fix candidates, not yet done)
- **Side-seat anchors use `top-[33vh]`** (`MobileGameTable.tsx`) while the centre
  pile is `top-1/2` — on short phones these can still collide, and the pile group
  clears the seats by only ~9px at 360px wide. Prefer anchoring seats relative to
  the pile or using `clamp()` bounds.
- **`useState(390)` SSR viewport guess** in `MobileGameTable` — first paint
  assumes a 390px phone, then corrects on mount. Fine today; don't copy the
  pattern elsewhere.
- **z-index has no scale** (`z-30`, `z-40`, `2147483647`). If you add layered
  overlays, reuse existing values rather than inventing new ones. Within the
  mobile tray the order is: slab `z-0` → hand `z-10` → "You" avatar `z-20` →
  action bar / UNO `z-30`.
- **`party/server.ts` has diverged.** It's the legacy PartyKit transport, not
  deployed, and it did **not** get v2's room-lifecycle fixes. Treat it as stale
  reference only — or delete it.

---

## 7. Scars — things already tried that broke

Documented so they aren't re-attempted:

- **`aspect-ratio: 2/3` + `overflow: hidden` on cards** sheared ~6% off every
  card (§4). Note at `globals.css:270`.
- **Scheduling a `setState` and its follow-up timer in the same effect** whose
  deps include that state: the state change tears the effect down and the
  cleanup kills the timer. This left `Splash` stuck in `"exiting"` for a whole
  session, holding `<html style="overflow:hidden">` — which is why `/create`
  couldn't scroll on a first visit. Give a timer its own status-scoped effect.
- **Global `@media` sweeps in `globals.css`** to fix mobile — they touch desktop
  and every screen at once (§5). Scope to the component.
- **A full-width PLAY pill low on the phone landing** read as a detached bar
  stranded in whitespace. It's ~55% wide at 64% height now.
