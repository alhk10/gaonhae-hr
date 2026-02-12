

# Make SuperAdmin Dashboard Mobile Friendly

## Overview
The SuperAdmin Dashboard (including the DashboardSwitcher wrapper) has several mobile layout issues visible in the screenshot: tabs are truncated, stats cards don't fit well, and spacing is too generous for small screens. This plan addresses all of these across both `DashboardSwitcher.tsx` and `SuperadminDashboard.tsx`.

## Changes

### 1. DashboardSwitcher.tsx - Mobile Tab Layout
- Make the `TabsList` horizontally scrollable on mobile (overflow-x-auto) to prevent tab label truncation ("Emp..." issue)
- Hide tab icons on mobile to save space, show text only
- Stack the tab bar and contextual selectors (branch/employee/student dropdowns) vertically on mobile instead of inline
- Make selectors full-width on mobile (`w-full` vs fixed `w-[200px]`)
- Move "Viewing as Superadmin" badge below tabs on mobile

### 2. SuperadminDashboard.tsx - Header and Stats
- Stack the header title and TabsList vertically on mobile
- Reduce title size on mobile (`text-xl` instead of `text-2xl`)
- Change stats grid from `lg:grid-cols-5` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` so cards display in a 2-column grid on phones
- Reduce card padding on mobile (`p-4` instead of `p-6`)
- Reduce stat value font size on mobile (`text-xl` instead of `text-2xl`)
- Reduce icon container size on mobile (`p-2` instead of `p-3`)

### 3. SuperadminDashboard.tsx - Content Sections
- Change the Recent Claims / System Status grid from `lg:grid-cols-2` to stack on mobile (already `grid-cols-1` but ensure card padding is compact)
- Reduce `CardHeader` and `CardContent` padding on mobile
- Ensure approval sections (Claims, Leave, Slot Booking, etc.) remain readable with smaller text and compact layouts

## Technical Details

### DashboardSwitcher mobile layout
```tsx
<div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
  <Tabs ...>
    <TabsList className="w-full sm:w-auto overflow-x-auto">
      <TabsTrigger value="overview">
        <Eye className="w-4 h-4 hidden sm:block" />
        Overview
      </TabsTrigger>
      ...
    </TabsList>
  </Tabs>
  {/* Selectors become full-width on mobile */}
  <Select ...>
    <SelectTrigger className="w-full sm:w-[200px]">...</SelectTrigger>
  </Select>
</div>
```

### Stats grid responsive sizing
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
  <Card>
    <CardContent className="p-3 md:p-6">
      <p className="text-xs md:text-sm ...">{stat.title}</p>
      <p className="text-lg md:text-2xl ...">{stat.value}</p>
      <div className="p-2 md:p-3 rounded-lg">
        <stat.icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
      </div>
    </CardContent>
  </Card>
</div>
```

### Files to Modify
- `src/components/dashboard/DashboardSwitcher.tsx`
- `src/components/dashboard/SuperadminDashboard.tsx`

