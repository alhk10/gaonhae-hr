## Update Rory and Henry to Foundation 1 → Foundation 2

Both students currently have `current_belt = 'White'` on their student record, and the visible grading registration is set as White → Yellow Tip. You want them shown as Foundation 1 → Foundation 2.

### Data changes (no code changes)

1. **`students` table** — set `current_belt = 'Foundation 1'` for:
   - RORY MCINTOSH
   - HENRY MORGAN

2. **`grading_registrations` table** — for each of their visible registrations (the ones currently showing White → Yellow Tip in the grading list):
   - `current_belt = 'Foundation 1'`
   - `target_belt = 'Foundation 2'`

Registration IDs affected:
- Rory: `7421a197-e454-405c-982c-de205df5edb9`
- Henry: `e117bd46-4198-4508-96a6-2e365fc9de2d`

### Left untouched
- The second, older registration each student has (`current_belt = 'Foundation'`, `target_belt = 'White'`) is not modified.
- No invoice / product / slot changes — only the belt fields shown in the grading list.

Confirm and I'll run the two updates.