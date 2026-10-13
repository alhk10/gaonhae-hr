# Remove grading card requirement for competition verification

## Current behaviour

On the /access Competitions tab, clicking **Verify** on a submission is blocked when all of these are true (`handleVerify` in `src/pages/public/PublicGradingList.tsx`):

- the event has "require grading card" switched on,
- the student's belt is Foundation through Black Tip,
- no grading card has been uploaded.

Instead of verifying, a dialog opens demanding the grading card first.

## Change

- Remove the `gradingCardRequiredAndMissing` gate from `handleVerify` so **Verify always proceeds** directly to verification (and the usual auto-import as invoice), regardless of the event's grading card setting or whether a card was uploaded.
- Delete the now-unused `gradingCardRequiredAndMissing` helper.

## What stays the same

- The grading card upload/manage buttons on each row remain — staff can still attach or replace cards voluntarily.
- The per-event "require grading card" switch in competition event settings remains (it no longer blocks verification); the public `/comps` form is unchanged.

## Verification

- Typecheck + build.
- Confirm a submission for an event with the setting on and no card uploaded verifies successfully.
