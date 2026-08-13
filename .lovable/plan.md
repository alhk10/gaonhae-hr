# Slot dates follow the event date

When duplicating or editing a grading event, changing the event **Date** field should make every slot inside that event adopt the new date — including the date printed inside slot titles.

## Current behaviour

- On save, each slot is already written with the event-level date, so the stored dates are correct.
- The slot rows still *display* and carry the original date inside their title text (e.g. `Balmoral - 28/06/2026 - 10:00 - Stage 1 - 3`), so a duplicated event on 27/09/2026 keeps showing 28/06/2026 in every slot label.

## Change

In the grading events settings dialog:

1. When the event Date field changes, rewrite each slot in the form:
   - the slot's own date reference becomes the new event date;
   - any `DD/MM/YYYY` (or `YYYY-MM-DD`) date found in the slot title is replaced with the new event date in the same format.
2. Slot summary rows render the event date rather than the stale one, so the list reflects the change immediately.
3. Newly added slots inherit the current event date automatically.

No database or RPC changes needed — save already stamps the event date on every slot.

## Technical note

Edit `src/components/grading-list/GradingEventsSettingsDialog.tsx` only: replace the inline `setForm` in the Date input's `onChange` with a handler that maps over `form.slots` applying the title date substitution, and use `form.grading_date` when composing slot summary labels.
