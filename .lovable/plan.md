# /perthcomp — Blue & Red & Dark Grey on White

## Goal
Restyle the `/perthcomp` event page (public seminar/competition registration) to a Blue & Red & dark grey scheme on a white background, replacing the current navy/gold/red palette.

## Current state (verified)
- `src/index.css` defines `.perth-theme` (lines ~249–264): navy primary, gold secondary, red accent, off-white background.
- `src/pages/public/PublicPerthComp.tsx` uses only semantic tokens (`bg-background`, `text-foreground`, etc.) — no hardcoded gold/amber classes were found, so the whole page follows the theme variables automatically.

## Change
Update only the `.perth-theme` variables in `src/index.css`:

| Token | New value | Meaning |
|---|---|---|
| `--background` | `0 0% 100%` | white page background |
| `--foreground` | `215 15% 20%` | dark grey body text |
| `--card` / `--card-foreground` | white / dark grey | cards on white |
| `--primary` | `215 90% 42%` | blue (buttons, headings, primary actions) |
| `--primary-foreground` | `0 0% 100%` | white text on blue |
| `--secondary` | `215 12% 28%` | dark grey (secondary buttons/badges) |
| `--secondary-foreground` | `0 0% 100%` | white text on dark grey |
| `--accent` | `354 75% 46%` | red (highlights, alerts, accents) — kept |
| `--accent-foreground` | `0 0% 100%` | white on red |
| `--muted` / `--muted-foreground` | light grey / mid grey | subtext readable on white |
| `--border` | `215 15% 88%` | subtle grey borders on white |
| `--ring` | `215 90% 42%` | blue focus rings |

Also update the one-line comment above `.perth-theme` to describe the new palette (blue, red, dark grey on white).

## Scope guard
- No component markup changes needed; all `/perthcomp` content follows the tokens.
- Other pages (default theme, `/comps`, `/access`) are untouched — `.perth-theme` is scoped to the `/perthcomp` wrapper only.
- Business logic, pricing, forms, and PDFs are unchanged.

## Verification
- Typecheck + preview build pass.
- Playwright screenshot of `/perthcomp` (top section + form + staff login icon) to confirm white background, blue buttons/headers, red accents, dark grey secondary text, and that no gold remains.
