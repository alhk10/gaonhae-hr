

## Plan: Fix Dialog Placement and Scrolling Globally

### Problem
The base `DialogContent` in `src/components/ui/dialog.tsx` uses `top-[50%] translate-y-[-50%]` centering, which causes tall dialogs to overflow past the bottom of the viewport with no scrollbar.

### Solution
Update the base `DialogContent` component to use a **top-anchored flex layout** with max-height and overflow-y-auto, ensuring all dialogs across the app automatically get proper placement and scrolling.

### Changes

**`src/components/ui/dialog.tsx`** — Update `DialogContent` className:

- Remove: `top-[50%] translate-y-[-50%]` (vertical centering that causes bottom overflow)
- Add: `top-[5%] max-h-[90vh] overflow-y-auto` (anchor near top, constrain height, enable scroll)
- Keep: `left-[50%] translate-x-[-50%]` (horizontal centering stays)

This single change fixes all dialogs app-wide — PaySchoolFees, ProfileCompletion, EditStudent, etc. — without needing per-dialog overrides.

