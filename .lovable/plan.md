

## Add Preview Table for Student Import

Add a scrollable data table between the preview summary and the import button, showing all parsed student details so users can review before importing.

### Changes

**File: `src/components/sales/ImportStudentsDialog.tsx`**

1. Widen dialog to `sm:max-w-6xl` to fit the table
2. Import `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from UI
3. Add a scrollable preview table after the summary section (inside the preview block) showing key columns: `#`, `First Name`, `Last Name`, `DOB`, `Gender`, `Email`, `Phone`, `Belt`, `Branch`, `Status` (valid/error)
4. Table container: `max-h-64 overflow-auto` for scroll
5. Error rows highlighted with red background, valid rows normal
6. Show all `validRows` and `errorRows` in the table, sorted by row index

### Key columns displayed
- Row #, First Name, Last Name, Preferred Name, DOB, Gender, Email, Phone, Current Belt, Emergency Contact — enough to verify data at a glance without overwhelming the view

