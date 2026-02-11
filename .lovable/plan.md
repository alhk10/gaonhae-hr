

# Student Profile Completion Dialog (Revised)

## Overview
Add a profile completion dialog in the Student Portal that triggers in **two scenarios**:
1. **Once per year** -- on the first login after January 1st, regardless of whether info is missing (to prompt the student to review/update their profile and photo)
2. **Anytime information is missing** -- if key profile fields or passport photo are absent, show the dialog on every login until the profile is complete

The dialog appears **after** the Unpaid Invoice Reminder is dismissed (or immediately if no unpaid invoices).

## Trigger Logic

```text
const currentYear = new Date().getFullYear();
const storageKey = `profile_completion_shown_${studentId}_${currentYear}`;
const alreadyShownThisYear = localStorage.getItem(storageKey) === 'true';

const missingFields = requiredFields.filter(f => !student[f.key]);
const missingPhoto = !student.passport_photo_url;
const hasMissingInfo = missingFields.length > 0 || missingPhoto;

// Show dialog if: yearly review not done yet OR information is missing
const shouldShow = !alreadyShownThisYear || hasMissingInfo;
```

- When dialog is shown and dismissed/submitted, set `localStorage` key for the current year
- If info is still missing after skip, dialog will re-appear next login (because `hasMissingInfo` is still true)
- If all info is filled, dialog won't appear again until next January 1st

## Key Profile Fields Checked
Only shows inputs for fields that are empty/null:
- Passport Photo (passport_photo_url)
- Phone
- Email
- Date of Birth
- Address
- Postal Code
- Emergency Contact Name
- Emergency Contact Phone
- Emergency Contact Relationship
- Medical Conditions

If all fields AND photo are filled, and the yearly review has been done, the dialog will not appear.

## What Changes

### New Component: `src/components/dashboard/StudentProfileCompletionDialog.tsx`
- Receives student data, open state, and onOpenChange handler as props
- Computes missing fields and shows a progress indicator (e.g., "7/10 fields completed")
- Renders input fields only for missing data, plus photo upload section if no photo
- Photo upload uses same logic as existing profile tab (upload to `student-photos` bucket, update `passport_photo_url`)
- Text field changes submitted via `createUpdateRequest` service (admin approval workflow)
- "Skip for now" button to dismiss
- On close (submit or skip), sets the `localStorage` yearly key

### Modified: `src/components/dashboard/StudentDashboard.tsx`
- Add `showProfileCompletion` state
- Update the unpaid reminder `onOpenChange` handler: when closed, evaluate trigger logic and conditionally show profile completion dialog
- Update the existing `useEffect` (lines 183-187): if no unpaid invoices, evaluate trigger logic on load
- Import and render the new `StudentProfileCompletionDialog`

## Technical Details

### Submission Flow
- Text fields: `createUpdateRequest(studentId, changedFields)` -- goes through admin approval
- Photo: direct upload to Supabase storage `student-photos/{studentId}/passport-photo.ext`, then update `passport_photo_url` column (no approval needed, same as existing logic)
- After submission, invalidate `student` and `student-update-requests` queries

### No Database Changes Required
All necessary columns already exist in the `students` table.

