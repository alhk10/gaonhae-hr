

## Plan: Per-Branch Setup Hub under Settings → Branches

Today, branch-related configuration is scattered:
- **Branches** tab — only basic fields (name, address, country, currency, color, Stripe).
- **Timetable** tab — operating hours + class schedule, branch-by-branch.
- **Branch Access** tab — employee access mapping.
- **Sales module** (separate page) — Products (with branch-specific price overrides via `BranchPricingManager`), Inventory (with branch quantity columns via `InventoryListTab`).

We'll add a unified **Branch Setup** flow under the existing **Branches** tab that lets a superadmin click into a single branch and manage everything for it in one place — without removing the existing global pages.

### New UX

In `src/components/settings/BranchManagement.tsx`:

1. Each row in the **Branch Directory** table gets a new action button: **`Setup`** (gear icon) next to Edit / Delete.
2. Clicking **Setup** opens a large dialog `BranchSetupDialog` (full-screen on mobile, `max-w-[1400px]` on desktop, same shell pattern we standardised in `InvoiceDialog`).
3. The dialog contains a `Tabs` component scoped to that one branch:

```text
[General] [Operating Hours] [Class Timetable] [Products & Pricing] [Inventory] [Employee Access]
```

### Tab contents (each pre-filtered to the selected branch)

- **General** — re-uses the existing edit form fields (name, address, country, currency, colour, Stripe ID). Save reuses `updateBranch`.
- **Operating Hours** — extracts the per-branch editor already used in `BranchTimetableManagement` into a small `<BranchOperatingHoursEditor branchId>` component (weekday open/close/notes, save via `saveBranchOperatingSchedule`). Existing Timetable tab keeps its multi-branch view; the new component is a reuse, not a rewrite.
- **Class Timetable** — extracts the per-branch class schedule editor (currently inside `BranchClassScheduleManagement`'s accordion) into `<BranchClassScheduleEditor branchId>`. Add / edit / delete recurring classes for this branch only, reusing `getClassSchedules` / `createClassSchedule` / `updateClassSchedule` / `deleteClassSchedule` filtered by `branchId`.
- **Products & Pricing** — table of all `products` (excluding inactive), with two per-branch controls per row:
  - **Visible at this branch** toggle (writes to `price_rules` with `is_active=false` to hide, removes the row to show — matches the corrected availability semantics from the previous fix).
  - **Branch price override** input (writes `price_rules.price_override` for `branch_id = current`; blank = use product base price). Reuses `priceRulesService` patterns already used by `BranchPricingManager`.
- **Inventory** — branch-scoped inventory editor: lists all inventory items at the branch's `inventory_locations` row, grouped by product → variant, with editable on-hand quantities (single-column instead of all-branch matrix). Save path reuses the same upsert into `inventory_items` used by `InventoryListTab`'s edit-mode logic.
- **Employee Access** — list of employees with `employee_branch_access` rows for this branch, with the same per-row toggles that `BranchAccessManagement` already exposes (view dashboard, manage students, etc.), filtered to this branch.

### What this avoids

- No schema changes — every tab uses existing tables (`branches`, `branch_operating_hours`, `class_schedules`, `products`, `price_rules`, `inventory_items`, `inventory_locations`, `employee_branch_access`).
- No duplicated logic — extract small per-branch sub-components from existing managers and embed in the new dialog. The existing global tabs (Timetable, Branch Access, Sales → Products / Inventory) remain unchanged.
- No new permissions — entire dialog gated by superadmin (same as the `Settings` page).

### File changes

- New: `src/components/settings/BranchSetupDialog.tsx` — tabbed dialog shell.
- New: `src/components/settings/branch-setup/GeneralTab.tsx` — reuses existing edit form.
- New: `src/components/settings/branch-setup/OperatingHoursTab.tsx` — extracted single-branch editor.
- New: `src/components/settings/branch-setup/ClassTimetableTab.tsx` — extracted single-branch class editor.
- New: `src/components/settings/branch-setup/ProductsPricingTab.tsx` — per-branch visibility + price overrides.
- New: `src/components/settings/branch-setup/InventoryTab.tsx` — per-branch on-hand quantity editor.
- New: `src/components/settings/branch-setup/EmployeeAccessTab.tsx` — per-branch access toggles.
- Modify: `src/components/settings/BranchManagement.tsx` — add `Setup` button in row actions, mount `BranchSetupDialog`.

### Verification

- Settings → Branches → click `Setup` on **Morley** → dialog opens with 6 tabs, all data pre-filtered to Morley.
- Operating Hours: edit Mon close time → save → reflected in main Timetable tab and on Branch Dashboard.
- Class Timetable: add a Tue 5pm class → save → appears on Morley weekly timetable.
- Products & Pricing: hide "1x Week" at Morley → returns to Create Invoice → Morley → "1x Week" no longer shown. Re-enable → reappears.
- Inventory: bump uniform L stock by 5 → matches in main Inventory list filtered to Morley.
- Employee Access: grant employee X dashboard access for Morley → reflected in main Branch Access tab.

### Out of scope

- Bulk copy/duplicate setup from one branch to another.
- Reorganising the existing global tabs (Timetable / Branch Access / Sales) — they stay as today.
- Auditing `price_rules` semantics beyond the visibility/override toggles already used.

