# Let Foundation students pick Foundation 1, 2 and 3 gradings together in /hello

## What changes
In the /hello grading step, Singapore Foundation students see tick boxes for each Foundation grading from their current belt upward:
- Foundation 1 >> Foundation 2
- Foundation 2 >> Foundation 3
- Foundation 3 >> next belt

Their current-belt grading is ticked and locked (it is required). Higher levels can be ticked as extras, but only in order: ticking Foundation 3 also ticks Foundation 2, and unticking Foundation 2 unticks Foundation 3. Levels below their current belt are not shown. The total updates with each tick, and the slot list refreshes to slots that accept the chosen gradings.

Each ticked grading becomes its own line on one invoice. On payment, each step gets its own grading record and certificate, using the existing combined-Foundation handling.

## Technical details
- `src/pages/public/PublicHelloChat.tsx`, around line 2528: replace the read-only preview with checkbox rows driven by `selectedFoundationLevels`. Show only levels at or above `matched.current_belt` whose `findFoundationProduct` exists. Keep the current belt checked and disabled, and enforce contiguous selection.
- No database changes. `_grading_steps` already writes one history row per Foundation step on a combined invoice.
