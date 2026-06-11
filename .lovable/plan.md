## Problem
In `/grading-list` → Competitions → Settings → Competition Events dialog, clicking the **+ New** button next to the Events list appears to do nothing. The form on the right is already empty by default, so resetting it produces no visible change. On mobile the form panel is below the list, so users don't even know a form exists.

## Fix
Update `src/components/grading-list/CompetitionEventsSettingsDialog.tsx`:

1. Add a `useRef` for the Name input and a `useRef` for the form panel container.
2. Extract the "+ New" handler into a function that:
   - Calls `setForm(emptyForm())`
   - Clears `productSearch`
   - Scrolls the form panel into view (`scrollIntoView({ behavior: 'smooth', block: 'start' })`)
   - Focuses the Name input
3. Wire that handler to the existing **+ New** button.
4. Attach the refs to the form `<div>` wrapper and to the Name `<Input>`.

No database, RPC, service, or schema changes. Pure UX fix scoped to one file.
