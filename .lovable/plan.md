## Goal
Make uploaded documents viewable directly on student-facing pages (no need to open the Document Library separately).

## Where documents will appear

1. **Branch Dashboard → Student Details Dialog** (`src/components/dashboard/StudentDetailsDialog.tsx`)
   - Add a new "Documents" section/tab listing all documents linked to that student.

2. **Sales → Student Profile page** (`src/pages/sales/StudentProfile.tsx`, route `/sales/student/:studentId`)
   - Add a new "Documents" tab alongside Overview / Attendance / Entitlements / Invoices.
   - Update `TabsList` from `grid-cols-4` to `grid-cols-5`.

3. **Parties → Student Details page** (`src/pages/parties/StudentDetails.tsx`)
   - Section 6 already exists as "Qualifications, Certifications & Documents" — wire `PersonDocumentsTab` into it (currently a placeholder).

## Implementation

Reuse the existing `src/components/documents/PersonDocumentsTab.tsx` component (already built during the Document Library work). It accepts `personType="student"` and `personId={studentId}` and renders the matched documents list with view/download via signed URLs.

For each location:
- Import `PersonDocumentsTab`
- Render `<PersonDocumentsTab personType="student" personId={student.id} />`
- Allow uploading new documents inline (the component already supports this — on upload it calls the same AI match flow and pre-fills the linked student).

## Access rules (unchanged)
- Superadmin: sees all student documents.
- Branch staff: sees documents for students in their own branch (enforced by existing RLS on `documents` table).
- Identity documents (NRIC/FIN, EP/SP/WP, Passport) remain accessible only via signed URLs.

## Files to edit
- `src/components/dashboard/StudentDetailsDialog.tsx` — add Documents section
- `src/pages/sales/StudentProfile.tsx` — add Documents tab (5th tab)
- `src/pages/parties/StudentDetails.tsx` — wire Documents into Section 6

## Out of scope
- No schema changes.
- No changes to the Document Library page itself.
- Employee-side document viewing (already handled separately if needed — confirm if you want the same on `/employees/:id`).

## Question before building
The project doesn't appear to have a separate **student-facing portal** (where a student logs in and views their own profile). The closest "student profile" is the staff-facing `/sales/student/:studentId` page. If you meant a true student-login portal, please confirm — that would be a larger separate build.
