

## Add Import Student Button with CSV Upload Dialog

### Overview
Add an "Import Students" button to the Party Management page (Students tab). Clicking it opens a dialog with two features:
1. **Download CSV Template** -- downloads a pre-formatted CSV with the correct column headers
2. **Upload CSV** -- upload a CSV file, parse it client-side, validate rows, and bulk-insert students into Supabase

### Changes

**New File: `src/components/sales/ImportStudentsDialog.tsx`**

A new dialog component with:
- A "Download Template" button that generates and downloads a CSV file with columns: `first_name, last_name, certificate_name, display_name, date_of_birth, gender, email, phone, address, postal_code, nric_passport, branch_id, current_belt, referral_source, parent_guardian_name, parent_guardian_phone, parent_guardian_email, medical_conditions, notes`
- A file upload area (drag-and-drop or click) accepting `.csv` files
- Client-side CSV parsing (no external library needed -- use native `FileReader` + split logic)
- Row validation: checks required field `first_name`, skips empty rows, normalizes text to uppercase (following existing convention)
- Displays a preview summary (total rows found, valid rows, errors) before importing
- An "Import" button that calls `createStudent` from `studentService.ts` for each valid row (or a batch insert function)
- Progress indicator during import
- Success/error toast notifications with counts

**Modified File: `src/pages/PartyManagement.tsx`**

- Import `ImportStudentsDialog`
- Add state `showImportStudentsDialog`
- Add an "Import Students" menu item in the "Add Party" dropdown (with an Upload icon), or a separate button next to "Add Party" when the Students tab is active
- Render `<ImportStudentsDialog>` with open/close handlers and a callback to refresh the students query

### CSV Template Columns
The template will include these columns matching the `CreateStudentData` interface:
- `first_name` (required)
- `last_name`
- `certificate_name`
- `display_name`
- `date_of_birth` (YYYY-MM-DD format)
- `gender`
- `email`
- `phone`
- `address`
- `postal_code`
- `nric_passport`
- `branch_id`
- `current_belt`
- `referral_source`
- `medical_conditions`
- `notes`

### Technical Details

- CSV parsing done client-side with `FileReader` API and basic comma/newline splitting (handles quoted values)
- Each row is mapped to `CreateStudentData` and passed through `createStudent()` which handles student number generation, uppercase normalization, and emergency contact creation
- Errors per row are collected and displayed after import completes
- The dialog resets state on close
- No new dependencies required
- No database migration needed

### UI Flow
1. User navigates to Party Management, Students tab
2. Clicks "Import Students" button (in Add Party dropdown or as separate button)
3. Dialog opens with two sections: Download Template and Upload CSV
4. User downloads template, fills in student data in Excel/Sheets
5. User uploads the filled CSV
6. Dialog shows preview: "Found X rows, Y valid, Z errors"
7. User clicks "Import" to proceed
8. Progress bar shows during import
9. Toast shows results: "Imported X students successfully, Y failed"
10. Student list refreshes automatically

