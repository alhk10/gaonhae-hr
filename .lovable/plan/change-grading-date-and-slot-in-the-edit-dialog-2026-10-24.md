# Change grading date and slot in the edit dialog

Today the Slot dropdown in the `/access` grading edit dialog only lists slots on the entry's current date, so an entry can't be moved to another day.

## Change
- Add a **Grading date** picker (DD/MM/YYYY, shadcn calendar) above Slot, prefilled with the entry's current date.
- Picking a date reloads the Slot list with that day's slots; the slot resets until one is chosen.
- Save moves the entry using the existing slot-update action, so invoices, duplicate checks and branch rules stay the same.
- After saving, the list refreshes and the entry appears under its new date.

## Technical
- `PublicGradingList.tsx`: new `editDate` state initialised from `editRow.grading_date`; `editRowSlots` query keyed on `editDate`; date picker via Popover + Calendar with `pointer-events-auto`, displayed with `formatDate`.
- Save path unchanged (`admin_update_grading_registration_slot` / submission slot RPC), which takes the slot id; the date comes from the slot.
- Apply the same date picker to the slot-only edit dialog (`editableSlots`).
