# Duplicate event button in Seminar Events dialog

Add a "Duplicate" action to each event row in the Seminar Events settings dialog (opened from the Events button on the Seminars tab of `/access`).

## What changes

- Each event row gets a copy icon between the edit (pencil) and delete (trash) icons.
- Clicking it loads the event into the right-hand form as a **new** event: same packages, descriptions, session dates, indemnity clause and template, required uploads and multi-package discount setting.
- Name is prefilled as `<Original name> (Copy)` and the event is set inactive by default so it isn't bookable on `/seminars` until reviewed.
- Nothing is saved until the user presses "Create event", so the copy can be edited first.

## Technical detail

- `src/components/grading-list/SeminarEventsSettingsDialog.tsx` only. No backend or schema change — duplication reuses the existing `adminUpsertSeminarEvent` create path.
- Add a `duplicateEvent(e: SeminarEvent)` handler that mirrors `startEdit` but sets `id: null`, `name: \`${e.name} (Copy)\``, `is_active: false`, then scrolls/focuses the form.
- Import `Copy` from lucide-react for the new icon button.
