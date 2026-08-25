# Duplicate button for Competition Events

Add a Duplicate action to each event row in the Competition Events settings dialog, mirroring the one already in the Seminar Events dialog.

## Behaviour

- A copy icon sits between Edit (pencil) and Delete (trash) on each event row.
- Clicking it loads the event's full settings into the right-hand form as a **new, unsaved** event:
  - Name becomes "<original name> (Copy)"
  - Active is off by default, so the copy never goes live until reviewed
  - Coaching line, all extra lines (categories and other), indemnity clause and template, and the passport / photo / grading card requirements are copied
- Nothing is written to the database until the user presses Save, so they can adjust the name and details first.
- The form panel scrolls into view after clicking, same as Edit.

## Technical

- `src/components/grading-list/CompetitionEventsSettingsDialog.tsx`: add a `duplicateEvent(e)` helper that calls `setForm({...})` with `id: null`, `is_active: false`, `name: \`${e.name} (Copy)\`` and deep-copied `extra_lines`; add a `Copy` icon button in the event row next to the pencil, and scroll `formPanelRef` into view.
- No database or service changes; the existing save path already inserts when `form.id` is null.
