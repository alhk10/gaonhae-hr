## Plan — Grading list table refinements

Scope: `BranchGradingList.tsx` and `GradingListTab.tsx`. No DB changes.

### 1. Rotate scorecard column headers 90°
- Apply `[writing-mode:vertical-rl] rotate-180` to scorecard `<TableHead>` labels so text reads bottom-to-top.
- Increase header row height (e.g. `h-28`) to fit the rotated labels cleanly.
- Keep header text small (`text-xs`) and centered.

### 2. Tighten scorecard column widths
- Reduce each scorecard column from `w-[88px]` to `w-[34px]` — just enough for 4 digits + a comma (e.g. `10,75`).
- Body cells: `text-center tabular-nums text-xs` for clean numeric alignment.

### 3. Remove dedicated Cert / Cert II columns
- Delete the standalone "Cert" and "Cert II" `<TableHead>` and `<TableCell>` blocks.
- Remove their sticky right-offset styles (`right-[154px]`, `right-[110px]`).
- Remove `-` placeholders entirely — no column, no placeholder.

### 4. Move certificate buttons into the Actions column
- Inside the sticky `right-0` Actions cell, render the `FileText` Cert I and Cert II buttons.
- **Conditional rendering**:
  - Cert I button: only when `canViewCertificate` is true (result is `pass` or `double`).
  - Cert II button: only when `canViewCertificateII` is true (result is `double`).
- Keep existing tooltips ("View Certificate" / "View Certificate II") to distinguish them.

### 5. Remove View (eye) and Delete (trash) icons from Actions
- Remove the `Eye` view button and the `Trash2` delete button from the Actions cell entirely.
- Actions column will now contain **only** the conditional Cert I / Cert II buttons (and will appear empty for rows that haven't passed).
- Shrink the Actions column width accordingly (e.g. `w-[90px]`) since it now holds at most 2 small icon buttons.

### Out of scope
- No changes to data, eligibility logic, or PDF generation.
- No changes to mobile card layout — desktop table only.

👉 Approve to switch to default mode and implement.