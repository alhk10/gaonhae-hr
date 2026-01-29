

## Miscellaneous Page - Verification Letters Generator

### Overview
Create a new "Miscellaneous" page accessible to Senior Partners and Superadmins that allows generating Student Verification Letters and Employment Verification Letters as PDFs.

### Implementation Architecture

```text
src/
├── pages/
│   └── Miscellaneous.tsx                    # Main page with tabs
├── utils/
│   └── verificationLetterPDFGenerator.ts    # PDF generation utilities
```

### Data Requirements

**Student Verification Letter Fields:**
- First Name + Last Name (from `students.first_name`, `students.last_name`)
- Date of Birth (from `students.date_of_birth`)
- NRIC/Passport (from `students.nric_passport`)
- Current Belt (from `students.current_belt`)
- Enrollment Date (from `students.enrollment_date`)

**Employment Verification Letter Fields:**
- Employee Name (from `employees.name`)
- Date of Birth (from `employees.date_of_birth`)
- NRIC (from `employees.nric`)
- Position (from `employees.position`)
- Base Salary (from `employees.base_salary`)
- Join Date (from `employees.join_date`)

### Technical Details

#### 1. New Page: `src/pages/Miscellaneous.tsx`
- Two tabs: "Student Letters" and "Employee Letters"
- Searchable dropdown to select student/employee
- Preview of selected person's details
- "Generate PDF" and "Print" buttons
- Uses existing patterns from `BranchProfitLoss.tsx` for PDF generation

#### 2. PDF Generator: `src/utils/verificationLetterPDFGenerator.ts`
- Uses `jsPDF` library (already installed)
- Implements Gaonhae Taekwondo letterhead with logo (following existing patterns from `payslipPDFGenerator.ts`)
- A4 format with proper margins
- Professional letter layout with date, "To Whom It May Concern" heading

**Student Letter Template:**
```text
[Company Letterhead with Logo]
Gaonhae Taekwondo LLP | T18LL1687K
271 Bukit Timah Road #02-08 Singapore 259708

[Current Date]

TO WHOM IT MAY CONCERN

STUDENT VERIFICATION LETTER

This is to certify that [First Name Last Name] is a student currently registered at Gaonhae Taekwondo.

Student Details:
- Full Name: [First Name Last Name]
- Date of Birth: [DD/MM/YYYY]
- NRIC/Passport: [Number]
- Current Belt: [Belt Level]
- Member Since: [Enrollment Date]

This letter is issued upon request for [student's] reference.

Yours faithfully,
Gaonhae Taekwondo LLP
```

**Employment Letter Template:**
```text
[Company Letterhead with Logo]
Gaonhae Taekwondo LLP | T18LL1687K
271 Bukit Timah Road #02-08 Singapore 259708

[Current Date]

TO WHOM IT MAY CONCERN

EMPLOYMENT VERIFICATION LETTER

This is to certify that [Employee Name] is employed at 
Gaonhae Taekwondo LLP.

Employment Details:
- Full Name: [Employee Name]
- Date of Birth: [DD/MM/YYYY]
- NRIC: [Number]
- Position: [Position]
- Monthly Salary: S$[Amount]
- Employment Start Date: [Join Date]

This letter is issued upon request for [employee's] reference.

Yours faithfully,
Gaonhae Taekwondo LLP
```

#### 3. Route & Sidebar Integration
- Add route `/miscellaneous` in `App.tsx` with PositionAccessGuard for `['Partner', 'Senior Partner']` or Superadmin access
- Add sidebar menu item with `FileCheck` icon

#### 4. UI Components
- SearchableSelect for student/employee selection (using existing component)
- Preview card showing selected person's details
- Action buttons for PDF download and print

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Miscellaneous.tsx` | Create | Main page with Student/Employee tabs |
| `src/utils/verificationLetterPDFGenerator.ts` | Create | PDF generation functions for both letter types |
| `src/App.tsx` | Modify | Add route for `/miscellaneous` |
| `src/components/layout/Sidebar.tsx` | Modify | Add menu item for Miscellaneous page |

### Access Control
- Restricted to Senior Partners and Superadmins (using existing `PositionAccessGuard` pattern)
- Uses existing RLS policies for student and employee data access

### Dependencies
- `jsPDF` - Already installed for PDF generation
- Existing `searchable-select.tsx` component for dropdown selection
- Existing company logo at `/images/company-logo.jpg`

