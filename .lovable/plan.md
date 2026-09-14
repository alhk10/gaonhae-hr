# Fix branch not saving, and tighten the submission-to-invoice flow

## What's wrong with this row

1. **The branch never saves.** For grading registrations, saving only tries to move the person to a slot at that branch on the same date. There is no Kembangan slot on 27/09/2026, so nothing changed.
2. **Even if it saved, the list would still show Yishun.** The grading list shows the *student's* home branch first. This registration sits on CHAN JIA LOK's account (Yishun), so Yishun is always shown.
3. **Wrong person.** JORDAN CHAN JIA LE is a different child with no student record yet; the entry was auto-matched onto CHAN JIA LOK and only the displayed name was edited.

## Part 1 — Branch on a grading registration

- Store a branch on each grading registration.
- Saving stores the chosen branch and also moves the person to a slot at that branch on the same date when one exists. If none exists, the branch is still saved, the existing slot is kept, and a note says no slot was found at that branch on that date.
- The grading list, print-outs and branch filter use the registration's saved branch first, then the student's home branch.

## Part 2 — Put this entry right

- Add "Change student" to the edit dialog: search, pick the correct person, or create a new student on the spot (name, branch, belt, date of birth).
- For this row: create JORDAN CHAN JIA LE under Kembangan and move the 27/09/2026 Red Tip >> Red registration onto him, leaving CHAN JIA LOK's own two registrations untouched.

## Part 3 — Recommended flow, end to end

The same three-stage flow for grading, competitions, events, school fees and uniforms & guards:

```text
Payment form  ->  Identify person  ->  Verify payment  ->  Invoice
(public)          (match / create)     (staff decision)   (created once)
```

**Stage 1 — the form collects enough to identify someone.** Full name, date of birth and at least one of email or mobile become required on every public payment form, with a live "is this you?" lookup: as details are typed, the form offers the matching account so the person confirms rather than the system guessing later. Someone with no account is marked "new student" at source instead of being matched afterwards.

**Stage 2 — matching is a suggestion, never a silent fact.** Automatic matching only links when the score clears the threshold *and* nothing contradicts it. A contradiction blocks the automatic link and sends the row to staff:
- different date of birth,
- a name that differs beyond a nickname/spelling difference (the Jordan Chan / Chan Jia Lok case),
- an email or mobile already belonging to a different account.
Family accounts sharing one email no longer auto-match on email alone; the date of birth or name must agree too.

**Stage 3 — invoices only after verification.** Invoice creation stays gated on payment status verified/paid plus a confirmed student, as it already is for guards purchases; the same gate is applied everywhere.

**Learning from past and present data.** Confirmed corrections feed back in: when staff re-match a row, the rejected pairing is remembered and never auto-suggested for that person again, and the corrected person's alternate email/phone/spelling is remembered for next time (extending the existing alternate-email memory). A one-off pass over existing data flags submissions whose matched student disagrees on date of birth or name so the same errors already in the system can be cleaned up.

## Part 4 — No double invoices or duplicate records

- One invoice per submission, enforced in the database (a unique constraint on the matched invoice per submission row), so a repeated import cannot create a second invoice.
- Before creating a student, check for an existing account with the same name + date of birth, or same email/mobile, and show it rather than creating a near-duplicate.
- Duplicate submissions (same person, same event, same amount, within a short window) are flagged in the approvals list so staff can reject the copy.

## Part 5 — Match history with overrides the system remembers

- Every match — automatic or manual — is recorded: who or what matched it, the confidence, the date, and the person matched to.
- The approvals list shows a small history icon per row; opening it lists the attempts and lets staff override to the right student.
- An override is stored as a rule: that submission's details are never auto-matched to the rejected account again, and the same details arriving in future map to the corrected account.
- A "Match history" view under the grading/approvals settings lists recent automatic matches with a filter for "auto-matched, unreviewed", so mistakes are findable rather than discovered by accident.

## Technical notes

- Migration: `grading_registrations.branch_id text` (nullable, FK `branches`); rewrite `admin_update_grading_registration_branch` to persist it and only move the slot when a same-date slot exists at the target branch, returning whether a slot was found.
- `get_public_grading_list`: registration branch becomes `COALESCE(gr.branch_id, s.branch_id, gs.branch_id)`, joining branches on that value; column order unchanged.
- New RPC `admin_update_grading_registration_student(p_registration_id, p_student_id)` and a student picker/creator in the grading edit dialog reusing the existing match search.
- New table `submission_match_events` (scope, submission_id, student_id, method auto/manual, confidence, actor, created_at) plus `submission_match_overrides` (scope, identity key = normalised name + DOB + contact, blocked_student_id, preferred_student_id). `submissionAutoMatch.ts` consults the overrides before linking and writes an event for every link.
- Contradiction guard added to `submissionMatchConfidence.ts`: veto when DOB differs, or name similarity is below a floor, regardless of total score.
- Unique index on the matched-invoice column per submission table; import RPCs already refuse to re-run, the constraint makes it structural.
- Audit query over existing matched submissions for DOB/name disagreement, exported for staff review.
