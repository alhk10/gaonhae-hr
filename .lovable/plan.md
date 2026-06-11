## Goal
Prefill the "Indemnity clause text" field with a default clause when creating a new competition event, so the user doesn't have to paste it each time.

## Change
In `src/components/grading-list/CompetitionEventsSettingsDialog.tsx`:

- Add a `DEFAULT_INDEMNITY_CLAUSE` constant containing the provided text (two paragraphs).
- Update `emptyForm()` so `indemnity_clause` is initialised to `DEFAULT_INDEMNITY_CLAUSE` instead of an empty string. This applies to:
  - Initial mount
  - "New" button click (`handleNewClick`)
  - Reset after save / Cancel
- `startEdit` keeps existing event's saved clause as-is (no overwrite).

Because the clause is non-empty by default, the form's `signatureRequired` flag will become true for new events (signature required on the public form). This matches the intent of having a default indemnity clause.

## Out of scope
- No DB backfill of existing events.
- No schema changes.
- No changes to the public form.
