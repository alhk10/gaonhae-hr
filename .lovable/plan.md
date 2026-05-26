## Goal

Currently `/grading-list` is fully visible; the password only unlocks inline edit mode via a small lock icon. Move the password to gate the **entire page**, including all three tabs (Grading, Competitions, Guards), so nothing renders until the visitor authenticates.

## Behavior

- On first visit to `/grading-list` (or the `gradinglist.*` hostname root), show only a centered password card — no header, no tabs, no lists, no totals.
- Both existing passwords still valid with same tiering:
  - `Hp97533488` → standard access (view + edit, no delete)
  - `Hp84311884` → full access (view + edit + delete)
- Wrong password → toast "Incorrect password", stay on gate.
- On success, render the existing page including the full Tabs component (Grading, Competitions, Guards) with the matching `unlockLevel` already applied — so edit/delete controls within every tab respect the tier just like today.
- Persist unlock in `sessionStorage`: keep `guards_list_unlocked_v1` plus a new `guards_list_unlock_level_v1` ('standard' | 'full') so refresh restores the same tier.
- Remove the discrete lock icon trigger and the password `Dialog` — the page-level gate replaces them. The Competitions and Guards tabs gain protection automatically since they live inside this same page component.

## Files

- `src/pages/public/PublicGradingList.tsx`
  - At the very top of the render, if `unlockLevel === 'none'`, return only a centered Card with a password input + Unlock button (reuse existing `handleUnlock` logic). Nothing else renders — Tabs, Competitions tab, Guards tab are all behind the gate.
  - On mount, hydrate `unlockLevel` from `sessionStorage` (extend current boolean flag to also remember the tier).
  - Update `handleUnlock` to persist the tier alongside the existing flag.
  - Delete the lock-icon trigger and the `Dialog` (`unlockOpen`) block near line ~1343. Remove `unlockOpen` state.
  - Leave `editMode` / `canDelete` derivations untouched so all three tabs continue to honour the tier.

No backend / RLS changes. Passwords remain client-side (unchanged from today).