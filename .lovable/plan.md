# Fix "Approve / Reject" on detail changes in /access Summary

## Problem
Approving or rejecting a detail change in /access fails. Staff using /access sign in with a password, not an employee account. The approve and reject steps still try to save "access" as the reviewer, and that field only accepts a real employee.

## Fix
1. Approve and reject save the reviewer only when it is a real employee. Otherwise the reviewer is left blank and "/access (branch)" is added to the review notes, so the change history still shows who handled it.
2. Clean up the list shown in your screenshot:
   - Yueqi Belle Xiong and Calum Chong each appear twice. Keep one request per student and mark the extra copy as a duplicate.
   - Calum Chong's request changes 09/04/2016 to 09/04/2016, so nothing actually changes. Close requests like this automatically and stop new ones from being created when nothing is different.
3. Approve Javen Gan's request as a test, then check that his birth date updates and the request leaves the list.

## Technical details
- Migration: in `approve_public_student_update_request` and `reject_public_student_update_request`, set `reviewed_by = CASE WHEN p_actor ~ uuid regex AND EXISTS(employee) THEN p_actor::uuid ELSE NULL END`, and append the actor text to `review_notes`.
- One-time data fix: mark duplicate pending rows (same student_id + requested_changes) as `rejected` with note 'duplicate'. Mark rows whose requested values equal the current student values as `rejected` with note 'no change'.
- In `submit_public_student_update_request` (or whatever creates these /hello requests), skip unchanged fields and return the existing pending request if an identical one already exists.
