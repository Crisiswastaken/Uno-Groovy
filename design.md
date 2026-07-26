# Design System — Custom UNO

Style: **Groovy** (retro, rounded, hand-drawn energy — matches the card set)
Mode: **Light-first.** White (`#f1e7dc`) is the primary background; black (`#2b2a27`) is the primary text/ink color.

---

## Typography

| Role | Font | Weight |
|---|---|---|
| Primary / Display | **Vodka Sans** | Regular only (one weight) |
| Secondary / UI & Body | **Switzer** | Any weight, as needed |

- Vodka Sans → titles, logo, UNO callouts, big banners.
- Switzer → everything else: buttons, labels, player names, body copy, lobby/game UI text.

> ### ⚠️ Vodka Sans is letters-only
>
> The face ships **A–Z and nothing else** — no digits, no punctuation, no
> symbols. Anything set in it that isn't a letter renders as tofu.
>
> Consequences already baked into the app:
> - **Room codes are 6 letters** (A–Z minus the I/L/O lookalikes). They're shown
>   in Vodka Sans in the lobby, so digits were unreadable.
> - The win screen reads **`WINS`**, not `WINS!`.
> - Player names appear in Vodka Sans on the win screen — a name with a hyphen
>   or an apostrophe will show tofu there.
>
> If a string can contain a number or a symbol, set it in **Switzer**.

---

## Colors

### Core palette (fixed — do not introduce other hues)

| Name | Hex |
|---|---|
| Red | `#ea6833` |
| Yellow | `#f8c368` |
| Green | `#97b16c` |
| Blue | `#3595c6` |
| White | `#f1e7dc` |
| Black | `#2b2a27` |

**Usage rule:** White and Black are the workhorses — background, surfaces, text, borders. Red/Yellow/Green/Blue are **accents only** (color indicators, action highlights, per-color UI states) — not required to all appear on a given screen. No other RGBY hues, tints, or shades are allowed, anywhere.

### Derived neutrals (optional, depth only)

Two optional derived shades each of White and Black, for subtle layering (card surfaces, hover states, dividers). These are **not brand colors** — use only when depth/hierarchy is needed, never as a substitute for the core White/Black.

| Name | Hex | Use for |
|---|---|---|
| White — shade 1 | `#e8dccc` | Sunken surfaces, subtle dividers |
| White — shade 2 | `#ddccb6` | Deeper recess / pressed states |
| Black — tint 1 | `#454340` | Secondary text, icons |
| Black — tint 2 | `#5e5b56` | Tertiary text, disabled states |

*(Exact values above are a starting derivation — nudge them if they don't sit right next to the core palette; the constraint is "max 2 per neutral," not these specific hex codes.)*

---

## Shape

- **Corner radius matches the card asset's corner radius** — the rounded-rect language of the cards is the single shape reference for the whole UI (buttons, modals, panels, inputs).
- Keep radius consistent across all surfaces rather than introducing a separate UI radius scale.

---

## Principles

1. Two colors carry the whole interface: White surfaces, Black ink. Reach for Red/Yellow/Green/Blue only to accent or indicate (turn color, card color, active states).
2. Everything rounded, nothing sharp — echo the card corners everywhere.
3. Vodka Sans speaks once per screen (a title, a callout) — never for dense text.
4. Derived neutrals are seasoning, not structure.
