# Attendance tab: today only + class colours

## What changes
1. **Today's timetable only**
   - The tab opens on today and shows only today's timeslots (no week grid).
   - Small "Previous day / Today / Next day" buttons stay, so staff can still check another day if needed; header shows the date as DD/MM/YYYY and weekday.
   - If today has no lessons (no slots, public holiday or term break), show a clear "No lessons today" message instead of hiding everything.
   - Pending /hello requests bar stays at the top (all pending requests, not just today's).

2. **Colour code per class**
   - Each class (e.g. Kids, Juniors, Adults, Kang's class) gets its own colour: a coloured left edge and tinted header on its timeslot card, plus a small coloured legend above the list.
   - Colours are picked automatically from a fixed palette so every class has one immediately.
   - In Settings > Classes, staff can change a class's colour from a short list of swatches.

## Technical details
- Migration: add `color text` (nullable) to `lesson_class_types`; include it in the settings RPC output and in the class-type save RPC.
- `AttendanceTab.tsx`: replace `monday`/week state with a single `day` state (default today); still fetch via `getAttendanceWeek(branchId, mondayOf(day))` and filter slots to `day`'s weekday, so no new backend query is needed.
- Colour resolution helper in `src/utils/attendanceWeek.ts`: saved colour, else stable palette pick by class name hash; palette defined as semantic tokens in `index.css`. Add unit test that the same class name always gets the same colour.
- `AttendanceSettingsDialog.tsx`: swatch picker in the class row.
