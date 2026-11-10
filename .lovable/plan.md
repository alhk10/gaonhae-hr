# Show Xinyi's grading lines as "From >> To" (like Red >> Red Tip)

## What I found
- Xinyi's saved records are already correct: three Pass lines on 08/10/2026:
  - Foundation 1 >> Foundation 2
  - Foundation 2 >> Foundation 3
  - Foundation 3 >> White
- The student profile in the preview already shows each line as "From >> To", the same way it shows Blue >> Red Tip.
- Your screenshot shows only "White / Foundation 3 / Foundation 2". That is the older display, which the live site still uses because the latest version has not been published.

## Steps
1. Open Xinyi's profile in the preview and confirm the three lines read "Foundation 1 >> Foundation 2", "Foundation 2 >> Foundation 3" and "Foundation 3 >> White", each with its own certificate icon.
2. If any line still shows only one belt, adjust the profile's Grading list so it always shows the "From >> To" label, using the same rule as Red >> Red Tip.
3. Publish so the live site shows the new labels.

## Technical details
- The `_grading_records` data already returns `belt_from` and `belt_to`, and `GradingRecordsSection.tsx` already shows `${belt_from} >> ${belt_to}`. No data changes are expected.
