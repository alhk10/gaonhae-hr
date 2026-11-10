# Plan

## 1. Attendance page of the progress report: remove the total column and tidy the legend

In the Term Attendance Record page of the progress report summary:
- Remove the final "P" column and each student's present count.
- Give the freed space to the date columns.
- Change the legend to read only: "P = Present · A = Absent". Both the "blank" entry and the "P column = total present" entry go.

## 2. Copy Stradia students into every Term 4 lesson

Carpe Diem Stradia has two Wednesday classes in 2026 Term 4 (30/09 to 16/12, 12 dates):
- 12:00–12:30 Little Gaonhae: 10 students
- 12:30–13:15 Little Gaonhae: 16 students

Both classes have the same students booked on 28/10, 04/11 and 11/11. The other 9 dates have no bookings: 30/09, 07/10, 15/10, 21/10, 18/11, 25/11, 02/12, 09/12 and 16/12.

- Copy each class's 11/11 student list into those 9 dates as "booked", tagged to 2026 Term 4.
- Skip any student who is already booked on a date, so nothing gets duplicated.
- Leave the bookings unmarked, including on past dates, so no lessons come off anyone's balance. Staff can mark Attended or Absent later.
- Afterwards, check that each class shows 10 or 16 students on all 12 dates.

## Technical details
- `src/utils/progressCardPdf.ts`: set `totW = 0`, remove the "P" header, the per-row count and its `p` counter, and update the legend string.
- The data change is a single insert into `lesson_bookings`. It selects the 11/11 rows for timetable IDs `3422f572…` and `1ae0d6b9…`, cross-joins them with the 9 missing dates, sets status `booked`, source `staff`, and term `2bc2b021…`, and skips rows where the student already has a booking for that timetable and date. Booking validation triggers still run.
