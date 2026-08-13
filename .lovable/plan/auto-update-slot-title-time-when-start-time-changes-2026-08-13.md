# Auto-update slot title time when start time changes

## Goal
In the `/access` Grading Events settings dialog, changing a slot's **Start time** should automatically rewrite the time portion of that slot's **Title**, matching the behaviour already implemented for event dates.

## Current state
- `src/components/grading-list/GradingEventsSettingsDialog.tsx` already has `retitleWithDate(title, isoDate)` and `setEventDate(isoDate)` to rewrite dates in every slot title when the event date changes.
- The `Start time` input uses a plain `updateSlot(idx, { start_time: e.target.value })` call and does not touch the title.
- Slot titles are auto-generated in the bulk-add dialog with a format like `Branch - DD/MM/YYYY - HH:mm - Belt info`, so the time is embedded in the title string.

## Changes

1. **Add a time rewrite helper**
   - Create `retitleWithTime(title: string, time: string): string` that replaces any `HH:mm` occurrence in the title with the new start time.
   - Only rewrite when `title` is non-empty and `time` is non-empty; return the original title otherwise.

2. **Wire the start-time input to rewrite the title**
   - In the Start time `onChange`, call `updateSlot(idx, { start_time: newTime, title: retitleWithTime(s.title, newTime) })`.
   - This mirrors the existing date rewrite pattern and keeps the title in sync without overwriting any custom suffix text after the time.

3. **Handle empty start time**
   - If the user clears the start time, leave the title unchanged (do not inject an empty string).

4. **No schema or API changes**
   - This is a client-side title convenience only; the saved `title` field continues to be sent as-is to `admin_upsert_grading_slot`.

## Verification
- Open `/access` → Grading tab → Events (unlocked).
- Edit an existing event slot whose title contains a time, e.g. `Balmoral - 27/09/2026 - 10:40 - Yellow Tip >> Yellow`.
- Change the Start time from `10:40` to `11:00`.
- Confirm the Title updates to `Balmoral - 27/09/2026 - 11:00 - Yellow Tip >> Yellow`.
- Confirm saving persists the updated title.
