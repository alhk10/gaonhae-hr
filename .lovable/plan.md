## Color-code BMI value on the scorecard page (athletic thresholds)

For a fit young adult — who typically carries more muscle mass — standard WHO BMI categories under-state healthy weight. Use stricter, athlete-aware thresholds:

- `< 25` — black (lean / healthy)
- `25 – 27.9` — yellow (slightly overweight)
- `28 – 31.9` — orange (overweight)
- `≥ 32` — red (seriously overweight)

In `src/utils/gradingCertificatePDFGenerator.ts`, inside the `allRows.forEach(...)` loop in `drawScorecardPage` (around line 275), add a BMI-color branch before the existing PASS/default coloring:

```ts
const isBmiRow = row.label.toLowerCase() === 'bmi';
const bmiNum = isBmiRow ? parseFloat(row.value) : NaN;
if (isBmiRow && !isNaN(bmiNum) && bmiNum >= 25) {
  doc.setFont('helvetica', 'bold');
  if (bmiNum >= 32) doc.setTextColor(220, 38, 38);        // red
  else if (bmiNum >= 28) doc.setTextColor(234, 88, 12);   // orange
  else doc.setTextColor(202, 138, 4);                     // yellow/amber
} else if (isPass) {
  // existing PASS coloring
} else {
  // existing default
}
```

Only the BMI value is colored; the label remains in its current style. Values below 25 stay default black.