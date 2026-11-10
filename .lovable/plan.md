# Mute unpaid-term warnings per branch

## What changes
- Attendance **Settings** gets a new on/off switch: **Mute unpaid warnings** (for branches invoiced as a school, e.g. Carpe Diem Stradia).
- When on, for that branch only:
  - No "Term not paid" pop-up when marking Present or adding a student to a slot.
  - The "Unpaid" / "No invoice" badges are hidden on attendance rows.
- Turned on for Carpe Diem Stradia straight away; all other branches stay as they are.
- Lessons are still counted the same way; only the warnings go.

## Technical details
- Add a per-branch `mute_unpaid_warnings` boolean next to the existing progress-card branch setting, with password-gated get/set functions in the same style.
- `AttendanceTab.tsx` reads the flag and skips `isUnpaidTerm` prompts and badges when set; settings dialog shows the switch.
- Migration sets the flag true for Carpe Diem Stradia.
