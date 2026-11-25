# Fix: Zaylee sees no grading product in /hello

## What's happening
- ZAYLEE TAN (Jurong West, 1st Poom) has already done Stage 1, so /hello looks for her next grading, Stage 2.
- The grading products are named as ranges: "Stage 1 - 3", "Stage 4 - 10" and "Stage 11-26".
- /hello only reads the first number of each name. So "Stage 1 - 3" counts as Stage 1 only, and nothing matches Stage 2. That's why it shows "No Stage 2 grading slot found" and has nothing to pick.
- This hits every Poom/Dan student who has finished their first stage in a range, at every branch.

## Fix
- Read product names as ranges, so "Stage 1 - 3" covers Stages 2 and 3 too ("Stage 11-26" covers 11 to 26, and so on). Single-stage names keep working.
- Keep the message as "Next grading: Stage 2 (2 of 3)", with the "Stage 1 - 3" product picked automatically and the grading-slot picker shown below it.
- Add tests: Stage 2 and 3 pick "Stage 1 - 3", Stage 5 picks "Stage 4 - 10", Stage 12 picks "Stage 11-26".
- Check Zaylee's /hello grading screen in the browser.

## Technical details
- `src/utils/nextGradingProduct.ts`: `parseStageNumber` becomes a range parser `/^stage\s+(\d+)(?:\s*-\s*(\d+))?/i`. `findStageProduct` matches when `from <= n <= to`.
- No database changes needed.
