

# Add Student Profile Completion Dialog on Portal Login

## Overview
Add a dialog that automatically appears after the student dismisses/closes the Unpaid Invoice Reminder (or immediately on login if no unpaid invoices) prompting the student to fill in any missing profile information.

## Flow

The login sequence will be:
1. Student logs in to portal
2. Unpaid Invoice Reminder dialog appears (if unpaid invoices exist)
3. After closing the unpaid reminder (or immediately if none), the **Profile Completion Dialog** appears if key fields are missing
4. Student can fill in missing fields and submit, or dismiss

## Key Profile Fields Checked
The dialog will check these fields and only show inputs for the ones that are empty/null:
- Phone
- Email
- Date of Birth
- Address
- Postal Code
- Emergency Contact Name
- Emergency Contact Phone
- Emergency Contact Relationship
- Medical Conditions

If all fields are filled, the dialog will not appear.

## What Changes

### New Component: `src/components/dashboard/StudentProfileCompletionDialog.tsx`
- A dialog component that receives the student data and checks for missing fields
- Renders input fields only for missing information
- On submit, updates the student record directly in Supabase (or submits via the existing update request flow if admin approval is required)
- Shows a friendly message like "Please complete your profile" with a progress indicator of how many fields are filled

### Modified: `src/components/dashboard/StudentDashboard.tsx`
- Add `showProfileCompletion` state
- Update the existing `useEffect` logic so:
  - If unpaid invoices exist: show unpaid reminder first; when it closes (`onOpenChange(false)`), check for missing profile fields and show the profile completion dialog
  - If no unpaid invoices: check for missing profile fields on load and show the dialog directly
- Import and render the new `StudentProfileCompletionDialog`

## Technical Details

### Missing Field Detection Logic
```
const requiredFields = ['phone', 'email', 'date_of_birth', 'address', 'postal_code',
  'emergency_contact_name', 'emergency_contact_phone'];
const missingFields = requiredFields.filter(f => !student[f]);
```

### Dialog Behavior
- Uses the existing `createUpdateRequest` service to submit changes (keeping the approval workflow)
- After successful submission, invalidates the `student` query to refresh data
- Dialog includes a "Skip for now" option so students are not blocked
- Only triggers once per session (tracked via state, not localStorage)

### No Database Changes Required
The student table already has all necessary columns.

