

# Show Manage Booking Dialog and First Name in Branch Casual Schedule

## Overview
Two changes to the Branch Dashboard's Casual Employee Schedule tab:
1. Replace the simple "Booking Details" dialog with the full "Manage Booking" dialog (identical to the one in the Slot Booking Management tab) when clicking a booking in the calendar
2. Display employee first names in calendar cards instead of last names

## Changes

### 1. Fetch `first_name` from employees table
- Update the booking query in `BranchCasualSchedule.tsx` to also join/fetch employee `first_name` from the `employees` table
- Since `slot_bookings_new` only stores `employee_name` (full name), fetch a lookup of casual employees with `first_name` and use it for calendar display
- The existing `casualEmployees` query already fetches employee data -- extend it to include `first_name`

### 2. Display first name in calendar cards
- Replace the current logic (`employee_name.split(' ').slice(-1)[0]`) with the employee's `first_name` from the lookup
- Update the legend at the bottom to also show first name or full name as appropriate

### 3. Replace Booking Details dialog with full Manage Booking dialog
Remove the current simple "Booking Details" dialog and the separate "Edit Request" dialog. Replace with a single "Manage Booking" dialog matching the Slot Booking Management tab, featuring:
- Booking info display (employee, branch, date, status)
- **Change Branch** section with branch selector dropdown
- **Swap Employee** section with casual employee dropdown
- Action buttons: Cancel, Swap, Update Branch
- Since this is the Branch Dashboard, these actions will submit edit requests for superadmin approval (using the existing `createEditRequest` service) rather than executing directly

### 4. Load supporting data
- Fetch branches list for the branch change dropdown
- The casual employees list is already fetched for the swap dropdown

## Technical Details

### Employee first name lookup
```typescript
// Existing query already fetches casual employees - add first_name
const { data: casualEmployees = [] } = useQuery({
  queryKey: ['casual-employees-with-firstname'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, display_name, first_name')
      .eq('type', 'Casual')
      .is('resign_date', null)
      .order('name');
    if (error) throw error;
    return data || [];
  },
});

// Build first name map
const firstNameMap = new Map(casualEmployees.map(e => [e.id, e.first_name || e.name]));
```

### Calendar card display change
```typescript
// Before: shows last name
{booking.employee_name?.split(' ').slice(-1)[0] || 'Unknown'}

// After: shows first name from lookup
{firstNameMap.get(booking.employee_id) || booking.employee_name?.split(' ')[0] || 'Unknown'}
```

### Manage Booking dialog structure (mirroring SlotBookingManagementContent)
The dialog will include:
- Booking info section (employee, branch, date, status)
- Change Branch section with dropdown + "Update Branch" button (submits edit request)
- Swap Employee section with dropdown + "Swap" button (submits edit request)  
- Cancel button (submits cancellation edit request)
- All actions route through `createEditRequest` for superadmin approval

### Files to Modify
- `src/components/dashboard/BranchCasualSchedule.tsx` -- all changes in this single file

