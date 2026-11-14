# "Add location before title" tick box for grading slots

## What changes
- **New tick box per slot:** each slot in Grading Events gets "Add location before title", next to "Double promotion slot" and "Hidden from /hello".
- **What ticking does:** the slot is saved with the event's location in front of its title, for example "Balmoral Plaza · Stage 1-3".
- **Where the full title shows:** /hello, the grading lists and PDFs, the same as any title.
- **Unticking** saves the title without the location.
- **Reopening an event** shows the box already ticked for slots whose title starts with the location. The Title box keeps showing only "Stage 1-3", and a small preview line shows the full title.
- **Changing the location** updates all ticked slots when the event is saved.
- **Copying a slot** keeps the tick.
- **The box is greyed out** while the event has no location.

## Technical details
- Only `GradingEventsSettingsDialog.tsx` changes:
  - Slot form state gets `prefix_location: boolean`.
  - **On load:** if a title starts with `${location} · `, the prefix is stripped and the flag set.
  - **On save:** the title is written as `${location} · ${title}` when the flag is set and a location exists.
- No database change.
