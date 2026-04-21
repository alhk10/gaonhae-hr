

## Plan: Add "Branch Setup" button to Branch Dashboard header (superadmin only)

Mirror the same multi-tab Branch Setup hub from **Settings → Branches → Branch Setup** so superadmins can manage branch configuration without navigating away from the Branch Dashboard.

### Changes

**File: `src/components/dashboard/BranchDashboard.tsx`**

1. **Import the existing dialog** (no duplication):
   ```ts
   import { BranchSetupDialog } from '@/components/settings/BranchSetupDialog';
   ```

2. **Add state** near other dialog state:
   ```ts
   const [branchSetupOpen, setBranchSetupOpen] = useState(false);
   ```

3. **Update header (lines 907–911)** to add a superadmin-only button beside the title:
   ```tsx
   <div className="flex items-center justify-between">
     <h2 className="text-lg sm:text-2xl font-bold text-foreground">
       {branch?.name || 'Loading...'} Dashboard
     </h2>
     {userrole === 'superadmin' && branch && (
       <Button
         variant="outline"
         size="sm"
         onClick={() => setBranchSetupOpen(true)}
         className="gap-1.5"
       >
         <Settings className="w-4 h-4" />
         <span className="hidden sm:inline">Branch Setup</span>
       </Button>
     )}
   </div>
   ```
   `Settings` icon is already imported (line 25); `Button` is already imported.

4. **Render the dialog** at the bottom of the component (next to other dialogs):
   ```tsx
   <BranchSetupDialog
     branch={branch as any}
     open={branchSetupOpen}
     onOpenChange={setBranchSetupOpen}
     onSaved={() => {
       queryClient.invalidateQueries({ queryKey: ['branch', branchId] });
     }}
   />
   ```
   The `branch` from `useQuery` is `select('*')` from `branches` and matches the `Branch` interface used by `BranchSetupDialog` (id, name, country, currency, etc.). On save, we invalidate the branch query so updated name/country/currency reflects in the header immediately.

### What the button opens

The exact same `BranchSetupDialog` shown in **Settings → Branches**, with all 7 tabs:
- General, Operating Hours, Class Timetable, Products & Pricing, Inventory, Employee Access, CCTV Cameras

No changes to the dialog itself — single source of truth.

### Access control

- Button only renders when `userrole === 'superadmin'`. Non-superadmin staff (managers, partners, employees) will not see it.
- Matches existing superadmin-only patterns (e.g., delete-without-approval, mass edit).

### Verification

- Login as **superadmin**, open any branch dashboard → "Branch Setup" button appears top-right of header → clicking opens the same multi-tab dialog as Settings → Branches → Branch Setup (gear icon).
- Login as **manager / partner / employee** with branch access → no button visible.
- Edit branch name in the General tab → save → header title updates after dialog closes (via `onSaved` invalidation).
- Mobile (<640px) → button shows icon only (label hidden) to fit the header.

### Out of scope

- Changing the dialog's content, tabs, or per-tab logic.
- Adding the button to non-superadmin roles (can be revisited if needed).

