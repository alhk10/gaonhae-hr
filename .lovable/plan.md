Update three students' belt levels in the database:

- **Rory McIntosh**: Foundation 1 → **Foundation 2**
- **Henry Morgan**: Foundation 1 → **Foundation 2**
- **Senan Rice**: Foundation → **Foundation 1**

## Changes

1. **`students` table** — set `current_belt`:
   - Rory & Henry → `Foundation 2`
   - Senan → `Foundation 1`

2. **`grading_registrations` table** (Term 2 2026 registrations) — update `current_belt` / `target_belt` so the grading tab reflects the new progression:
   - Rory & Henry: `current_belt = Foundation 2`, `target_belt = Foundation 3`
   - Senan: `current_belt = Foundation 1`, `target_belt = Foundation 2` (only if he has an active registration; otherwise skip)

No code changes.