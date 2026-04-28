## Goal

Add an inline "Confirm receipt of belt & certificate" action button to each row of the Branch Dashboard Grading list and the Sales Grading list. When clicked it:

1. Updates `students.current_belt` to the next belt (`getNextBeltLevel`) for a **pass** result, or skips a belt (`getDoubleBeltLevel`) for a **double** promotion.
2. Marks `grading_registrations.certificate_issued = true` (and `certificate_ii_issued = true` for doubles) so the action can't accidentally be repeated.
3. Refreshes the list so the new belt and disabled state are visible immediately.

## UX

In the Actions column (right-most, sticky on desktop) add a third icon-button next to the existing "View Certificate" / "View Certificate II" buttons:

- **Icon**: `Award` from `lucide-react` (already imported), green tint.
- **Visibility**: Only when result is `pass` or `double`, current belt is in the Foundation→Black Tip range, and a `current_belt` is recorded.
- **Disabled state**: When `certificate_issued` is already true (or for doubles, `certificate_ii_issued` is also true) — show as filled / muted with tooltip "Belt and certificate already confirmed".
- **Confirm dialog** (using existing `AlertDialog` pattern): "Confirm that {STUDENT NAME} has received their belt and certificate. Their current belt will be updated from {Current} to {NewBelt}. This cannot be undone from this screen."
- **Toast** on success: "Belt updated to {NewBelt} for {STUDENT NAME}".

Mirror in the mobile card view (small green Award icon-button on the bottom row).

## Technical implementation

### 1. New service helper — `src/services/gradingService.ts`
Add `confirmBeltAndCertificate({ registrationId, studentId, currentBelt, isDouble, country })`:
- Compute `newBelt = isDouble ? getDoubleBeltLevel(currentBelt, country) : getNextBeltLevel(currentBelt, country)`.
- If `newBelt` is null → throw "No higher belt available for {currentBelt}".
- `update students set current_belt = newBelt where id = studentId`.
- `update grading_registrations set certificate_issued = true, certificate_ii_issued = isDouble where id = registrationId`.
- Return `{ newBelt }`.

(Country is hard-coded to `'AU'` from the caller for now since Phase 1 = Morley only — same convention used by certificate generation.)

### 2. `src/components/dashboard/BranchGradingList.tsx`
- Import `Award` (already imported), `confirmBeltAndCertificate`, `getDoubleBeltLevel`.
- Add `useMutation` `confirmBeltMutation` calling the new service helper, invalidating both `rowsKey` and the student query, with success/error toasts.
- Add local state `confirmBeltTarget: GradingListStudent | null` and an `AlertDialog` rendered once at the bottom of the component.
- In the Actions cell, after the existing certificate buttons, render the new button with the same eligibility conditions used for the cert button (pass/double + belt-in-range + isMorley + has current_belt). When `student.certificate_issued` (and `student.certificate_ii_issued` for doubles) is true, render the icon disabled with the "already confirmed" title.
- Mirror the same button in the mobile card actions row.

### 3. `src/components/sales/GradingListTab.tsx`
Apply identical changes (import, mutation, dialog, desktop button, mobile button).

### 4. Wiring & guards
- Disable the button while the mutation is pending (`isPending` → spinner Loader2).
- Don't trigger if `registration_id`, `current_belt`, or `student_id` is missing.
- After success, the React Query invalidation re-fetches and the row will show the new belt + disabled icon automatically.

## Notes / non-goals
- No DB schema changes required — `certificate_issued` and `certificate_ii_issued` columns already exist.
- No email/notification side-effects.
- Double promotion: a single click confirms both belt jumps and both certificate flags. We don't add a separate "confirm Cert II only" path — the button represents "physically handed over belt + cert(s) for this grading event".
- Action is irreversible from the UI; superadmin can still edit the student's belt manually elsewhere if needed.

## Affected files
- `src/services/gradingService.ts`
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`
