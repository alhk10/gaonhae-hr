
# Mobile UI Adjustments for Student and Employee Portals

## Issues Identified

### Student Portal (StudentDashboard.tsx)
1. **Header not mobile-responsive**: Fixed `text-2xl`, `p-6` padding, and long title "Student Portal - FirstName LastName" will overflow on small screens
2. **Header buttons not stacked on mobile**: Logout button and "Viewing as Admin" badge crowd the title
3. **Stats cards use fixed `p-6` padding**: No mobile reduction
4. **TabsList with 5 tabs truncates on mobile**: "Overview", "My Profile", "Invoices (N)", "Class Schedule", "Chat (N)" -- too many tabs for 390px width, text will be cut off
5. **Profile edit buttons overflow on mobile**: "Cancel" and "Submit for Approval" buttons side-by-side will truncate on small screens
6. **CardHeader with `flex-row` profile section**: Title + buttons in a row causes cramping on mobile
7. **Invoice list items use fixed `p-4` and `gap-3`**: Pay button, PDF button, and amount/badge crowd together
8. **QuickActionsSection cards use fixed `p-6` padding**: Cards with long text descriptions can overflow

### Employee Portal (EmployeeDashboard.tsx)
- Already has good mobile handling with `isMobile` checks throughout
- No major issues found -- it already adapts text sizes, padding, and grid layouts

### Dialog Components
- Most dialogs already use `max-h-[85vh]` with overflow handling -- these are fine
- `PaySchoolFeesDialog` uses `max-w-3xl` which is fine since dialogs auto-constrain on mobile
- `PayGradingDialog` lacks `max-h` and `overflow-y-auto` -- could overflow on long content

### Global Dialog Component
- The base `DialogContent` lacks mobile-specific padding -- uses `p-6` always, which wastes space on mobile

## Plan

### 1. Student Portal Header -- Make Mobile-Responsive
- Use `useIsMobile` to conditionally reduce padding from `p-6` to `p-3` on the outer container
- Shorten title on mobile: show just "Student Portal" instead of "Student Portal - Full Name"
- Reduce subtitle text size on mobile
- Stack header layout vertically on mobile (title above, buttons below)

### 2. Student Portal Tabs -- Scrollable on Mobile
- Wrap `TabsList` with `overflow-x-auto` and allow horizontal scrolling so all 5 tabs are accessible without truncation
- Add `flex-nowrap` and `w-full` to prevent wrapping/squishing
- Reduce tab text size slightly on mobile

### 3. Student Portal Stats Cards -- Reduce Mobile Padding
- Change from fixed `p-6` to responsive `p-3 md:p-6`
- Reduce text sizes for stats on mobile

### 4. Student Portal Profile Tab -- Stack Buttons on Mobile
- Make the CardHeader stack vertically on mobile instead of `flex-row`
- Stack "Cancel" and "Submit for Approval" buttons vertically on mobile
- Reduce button text: show just "Submit" instead of "Submit for Approval" on mobile

### 5. Student Portal Invoice Items -- Compact on Mobile
- Reduce padding from `p-4` to `p-2 md:p-4`
- Reduce gap between action buttons

### 6. QuickActionsSection -- Mobile Padding and Layout
- Reduce card padding from `p-6` to `p-4 md:p-6` on mobile
- Reduce heading size on mobile
- Ensure description text doesn't truncate

### 7. PayGradingDialog -- Add Scroll Overflow
- Add `max-h-[85vh] overflow-y-auto` to prevent content overflow on mobile

### 8. Base Dialog Component -- Mobile Padding
- Add responsive padding: `p-4 sm:p-6` instead of fixed `p-6`

## Technical Details

### Files to Modify
- `src/components/dashboard/StudentDashboard.tsx` -- Add `useIsMobile` hook, apply responsive classes to header, tabs, stats, profile, and invoices
- `src/components/dashboard/QuickActionsSection.tsx` -- Add `useIsMobile`, reduce padding and text sizes
- `src/components/dashboard/PayGradingDialog.tsx` -- Add overflow handling
- `src/components/ui/dialog.tsx` -- Change `p-6` to `p-4 sm:p-6` in DialogContent
- `src/components/ui/tabs.tsx` -- Add `overflow-x-auto` support to TabsList for mobile scrollability

### No Functionality Changes
All modifications are purely visual/layout adjustments. No data flow, state management, API calls, or business logic will be altered.
