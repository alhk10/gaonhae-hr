# Remove "Mark ready, fees unpaid" option

When staff tick Ready for grading and term fees are under 50% paid, the warning box will show only two buttons:
- **Cancel**: leaves the student unticked.
- **Override and allow grading**: ticks the student and shows the grading button in /hello.

Staff can no longer tick a student as ready without also overriding the fee rule. Students with enough fees paid are unaffected (no warning appears).

## Technical
- `src/components/grading/useReadyForGradingToggle.tsx`: delete the "Mark ready, fees unpaid" button (line 39); leave the 'plain' path for paid students.
