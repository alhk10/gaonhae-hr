# Progress Cards in Attendance

## What staff will see
- **Settings switch**: "Progress cards" on/off in the Attendance Settings dialog, saved per branch.
- **Badge on each student row** (only when switched on), beside "Ready for grading":
  - grey "Progress card" = not filled in for the current term
  - green "Progress card ✓" = done for the current term
  Clicking the badge opens the progress card window.
- **Report button** to the left of Settings (only when switched on). It downloads a PDF for the selected branch and term.

## Progress card window (based on the uploaded form)
- Filled in automatically and locked: Name, Age, Current Belt, Report Date (today, DD/MM/YYYY), Term (for example "2026 Term 4").
- Instructor, Class and Instructor Signature fields are left out.
- Four sections, each item rated Exceptional / Acceptable / Needs Guidance:
  - Physical Development: Gross Motor Coordination, Fine Motor Coordination, Hand-Eye Coordination, Balance & Stability, Flexibility
  - Learning Skills: Ability to Follow Instructions, Listening Skills, Focus & Concentration, Confidence, Independence
  - Taekwondo Skills: Basic Stances, Kicking Technique, Blocking Technique, Poomsae Memory, Etiquette & Respect
  - Character Development: Respect, Discipline, Perseverance, Teamwork, Positive Attitude
- Ready for Grading Test: Yes / Nearly Ready / No. There is also an optional comments box.
- Each student gets one card per term. Opening it again lets staff edit it.

## Report PDF
- **Page 1: Summary table** for every student with a card this term. Columns: Name, Birth Date, Ready for Grading Test, Paid date. Paid date is the date the term's grading payment was paid or verified. If there's no payment, it shows "—".
- **Then one page per student**: a branded version of the uploaded card, filled in with that student's details and ratings. Instructor, Class and Signature are left off.

## Technical details
- New table `student_progress_cards` with these fields:
  - student_id, branch_id, term_calendar_id, term_label, report_date, belt_snapshot, age_snapshot
  - ratings (jsonb), grading_readiness ('yes' | 'nearly' | 'no'), comments, timestamps
  - one card per student per term (unique on student and term)
- New column `progress_cards_enabled` on attendance settings.
- All data goes through password-gated SECURITY DEFINER functions that check branch scope, matching the existing Attendance functions. They are `access_progress_card_get/upsert/list` and `access_progress_report`. `access_progress_report` returns the cards plus DOB and the grading payment paid date for that term.
- Grants follow the project rules. RLS is on with no direct client access.
- Frontend changes:
  - new `ProgressCardDialog.tsx` and `progressCardPdf.ts` (jsPDF with the brand colours and logo)
  - edits to `AttendanceTab.tsx` for the badge, the report button and the settings switch
- A small test for age calculation and the term label format.
