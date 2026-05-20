## Problem

A student born in 2008 (age 17–18) selecting `Black Tip` is being offered the grading slot **"Balmoral - 28/06/2026 - 14:30 - Black Tip >> 1st Poom"** on the public grading payment page (`/pay`).

`1st Poom` is a junior grade (under 15). An 18-year-old should never see a Poom slot — they should be offered the equivalent `Black Tip >> 1st Dan` slot, and nothing else.

## Root cause

`grading_slots` row `906c27da…` has:
- `belt_levels = {Black Tip}`
- `min_age = NULL`, `max_age = NULL`
- title `Black Tip >> 1st Poom`

`get_public_grading_slots` only enforces age via the slot's own `min_age` / `max_age`. The data-entry team did not cap this Poom slot at age 14, so it leaks to all ages. The same hole exists for any `Poom`-target or `Dan`-target slot whose age is left blank.

There is also a symmetrical bug: a 10-year-old `Black Tip` student would be offered a `Black Tip >> 1st Dan` slot if one existed without `min_age` set.

## Fix scope

Frontend filter only (no slot-data edits, no DB migration). Client already knows `age` and parses belt names elsewhere — extend `PublicGradingPayment.tsx` to drop slots whose target belt is age-incompatible.

### Rules

Given `age` and a slot, derive the slot's **target belt(s)**:

1. If `slot.stage_product_name` matches `Stage 1`–`Stage 26` → it is a Stage slot. Stage slots are valid for **both** Poom and Dan students of the right age band, so apply the existing eligibility logic (no change). Skip the new filter.
2. Otherwise parse `slot.title` after the last `>>`. If it contains:
   - `Poom` → keep only when `age < 15`
   - `Dan` → keep only when `age >= 15`
   - neither → keep (coloured-belt transition, no age gate)

### Where to apply

In `src/pages/public/PublicGradingPayment.tsx`, wrap the existing `slotList` in a `useMemo` that filters by the rule above using `age`. Feed the filtered list to the `Select` and to `selectedSlot` lookup. If the currently selected slot is filtered out, reset `selectedSlotId`.

### Out of scope

- No changes to `get_public_grading_slots` (DB function stays as-is — the cross-branch fix from the previous loop is preserved).
- No changes to `PublicHelloChat.tsx` (it does not pick grading slots).
- No edits to existing slot rows. Admins can still tighten `max_age`/`min_age` later; this client filter is the safety net.
- No change to `resolveAgeGating` / product lookup — that part already chooses `1st Dan` for an 18-year-old Black Tip; only the slot dropdown was leaking.

## Verification

- 18 y/o, Black Tip, Balmoral, 28/06/2026 → `Black Tip >> 1st Poom` slot hidden. Only `Black Tip >> 1st Dan` slot (if present) and any Stage slots whose belt+age matches are shown.
- 10 y/o, Black Tip → reverse: `Black Tip >> 1st Dan` hidden, Poom kept.
- Coloured-belt transitions (e.g. `Yellow >> Green Tip`) unaffected.
