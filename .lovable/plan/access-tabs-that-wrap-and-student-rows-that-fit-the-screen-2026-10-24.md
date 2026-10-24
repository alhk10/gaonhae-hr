# /access: tabs that wrap and student rows that fit the screen

## What you'll see
- **Tabs:** the 10 tabs (Summary … AI Poster Maker) no longer squash or overlap ("Uniforms & GuardsStudio Rental"). They flow onto as many lines as needed. Each tab sizes to its own label, and long labels like "Uniforms & Guards" can wrap inside the tab.
- **Students list:** fits the available width with no side-scrolling and no hidden Credit column.
  - On a wide screen, it stays a single-row table.
  - When space runs out, each student shows as two lines:
    - **Line 1:** Name (with student no. and DOB), Belt, Branch, Status, and the Add invoice / Edit buttons on the right.
    - **Line 2:** Email / phone, Enrolment, Term payment, Credit — each with a small label.
- Emails no longer break letter by letter. They stay on one line and are cut short with "…" if needed; the full email shows on hover and in the student details.
- Phones keep the existing small layout.

## Technical details
- `PublicGradingList.tsx`: replace `grid grid-cols-3 sm:grid-cols-10` on `TabsList` with `flex flex-wrap h-auto justify-start gap-1`. Triggers get `whitespace-normal text-center leading-tight` with a sensible min-width.
- `StudentsTab.tsx`: wrap the table in the shared `.access-list-shell` / `.access-list-table` container-query pattern, with `data-field` / `data-label` on each cell. This replaces the fixed `lg` breakpoint, so the two-line layout depends on the list's actual width.
  - Add Students-specific field placements (`contact`, `enrolment`, `credit`) to the shared grid rules in `index.css`. Line 1 is spans for student/belt/branch/status/actions; line 2 is contact/enrolment/term payment/credit.
  - Email cell uses `truncate` plus a `title` attribute instead of `break-all`.
- Keep the existing card layout for narrow phones. No changes to the data, filters or actions.
