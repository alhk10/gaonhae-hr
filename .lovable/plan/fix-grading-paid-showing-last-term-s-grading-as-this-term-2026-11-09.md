# Fix "Grading paid" showing last term's grading as this term

## What we found
- The "Grading paid" badges in Attendance are for the grading held on 08/10/2026.
- That grading is tagged as **2026 Term 3**. But its 10 registrations (Aalia, Arrissa, Ethan Oh, Freya, George, Isla, Gemma and others) were saved under **2026 Term 4**. They were entered on 29/10 and 09/11, so the term was taken from the date they were entered.
- The badge looks only at the term saved on the registration, so these students show "Grading paid" for Term 4 even though they haven't registered for Term 4 grading.

## Fix
1. **Correct the 10 records:** move each of those registrations to the 2026 Term 3 calendar for the student's branch. Invoices and payments stay as they are.
2. **Badge rule:** a registration counts toward a term only if its grading event's year and term match that term. If an event has no tag, its grading date decides.
3. **Going forward:** when a registration is created or moved to another slot, its term comes from the grading event's Year/Term tag, not from the day it was entered. This applies to staff, /hello and invoice paths.
4. **Re-check:** confirm those students now show "Ready for grading" (unticked) in today's Attendance, and that the Term 3 grading list still shows them as paid.

## Technical details
- Data fix: update `grading_registrations.term_id` where the slot's `grading_year`/`grading_term` doesn't match `term_calendars` (`2026 Term 4`), and map it to the branch's `2026 Term 3` calendar.
- Update `_grading_ready_state` to join `grading_slots` and match on the slot's year/term. Add a BEFORE INSERT/UPDATE trigger on `grading_registrations` that sets `term_id` from the slot tag.
