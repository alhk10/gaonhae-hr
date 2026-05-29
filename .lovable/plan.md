Restructure the **Guards** tab to match the Grading list pattern, and surface the existing belt field.

## File: `src/pages/public/PublicGuardsPurchaseList.tsx`

### 1. Reorder columns
New order: **Branch | Student | Belt | Package | Status | Amount | Proof | Variants | Collected | Actions | (Delete)**

- **Belt** (new column): render `r.current_belt || '—'` with `text-muted-foreground whitespace-nowrap` styling (mirrors Grading list line 1362).
- **Package**: rename the existing "Items" column header to "Package" (cell content unchanged).
- Order swap: Status now comes before Amount, matching Grading.

### 2. Move Accept/Reject inline buttons
- Remove the `<div>` with `CheckCircle`/`XCircle` from the Status cell.
- Add a new **Actions** column (just before the optional Delete column) that renders the same two buttons when `r.sale_status === 'pending_verification'`. Style matches existing (`h-6 w-6 p-0`, green Check / red X).

### 3. Hide Details button, make row clickable
- Remove the "Details" `<Button>` and its `<TableCell>` entirely.
- Add `onClick={() => setDetailsRow(r)}` and `className="cursor-pointer hover:bg-muted/40"` to `<TableRow>`.
- Stop propagation (`e.stopPropagation()`) inside interactive cells: the Proof thumbnail button, Variants `<Select>` triggers, the Collected checkbox row, the Accept/Reject buttons, and the Delete button — so clicking these does not also open the details dialog.

### 4. Proof thumbnail style
Keep existing 40×40 thumbnail (already a thumbnail; matches request).

## Out of scope
- No changes to `/guards` public submission form — belt is already collected there.
- No service/RPC changes; `current_belt` already exists on `GuardsPurchaseRow`.
- No changes to the details dialog itself.