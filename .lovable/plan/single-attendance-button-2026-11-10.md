# Single attendance button

Replace the separate "Attended" and "Absent" buttons on each student row in the Attendance tab with one button.

## How it works
- A student on the slot (booked, not yet marked) shows a red **Absent** button.
- Tapping it marks the student **Present** and turns it green.
- Tapping a green **Present** button sets it back to red **Absent**.
- Students already marked Absent in older records also show red **Absent**. Tapping marks them Present.
- The unpaid-term warning still pops up before marking Present. The remove (X) and Approve buttons stay as they are.

## Lessons and reports
- A red default Absent is only what the button shows. It does not use up a lesson. Only Present uses up a lesson, and tapping back to Absent gives the lesson back.
- On the progress report, unmarked students will show as blank, not "A". Records that were already saved as absent still show "A".

## Technical details
- Only the row action buttons in `src/components/attendance/AttendanceTab.tsx` change (lines ~432–446).
- Button style: green when status is `attended`, red (destructive) otherwise. The toggle sets the status to `attended` or `booked`, using the existing `markBooking`.
- Add semantic success tokens in `src/index.css` if no green token exists yet.
