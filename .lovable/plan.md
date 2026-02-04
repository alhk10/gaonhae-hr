

# Plan: Add Color Coding for Class Types

## Overview
Create a centralized utility for class type color mapping and apply consistent color coding across all timetable and class schedule components throughout the application.

## Color Mapping

| Class Type | Color Scheme |
|------------|--------------|
| Private Lesson | Pale Blue (`bg-blue-100 border-blue-300 text-blue-800`) |
| Kids | Green (`bg-green-100 border-green-300 text-green-800`) |
| Teens & Adults | Violet (`bg-violet-100 border-violet-300 text-violet-800`) |
| Little Gaonhae | Yellow (`bg-yellow-100 border-yellow-300 text-yellow-800`) |
| Team Gaonhae Poomsae | Sky Blue (`bg-sky-100 border-sky-300 text-sky-800`) |
| Team Gaonhae Kyorugi | Orange (`bg-orange-100 border-orange-300 text-orange-800`) |
| Combat/Self-Defense | Dull Green (`bg-emerald-100 border-emerald-300 text-emerald-800`) |
| Kang Klass | Dull Orange (`bg-amber-100 border-amber-300 text-amber-800`) |
| Junior | Pink (`bg-pink-100 border-pink-300 text-pink-800`) |
| Competition | Lime (`bg-lime-100 border-lime-300 text-lime-800`) |

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/classTypeColors.ts` | **Create** - Centralized color utility with all 10 class types |
| `src/components/dashboard/BranchWeeklyTimetable.tsx` | Apply colors to class badges |
| `src/components/dashboard/ClassWeeklyPlanner.tsx` | Apply colors to class cards |
| `src/components/dashboard/StudentClassSchedule.tsx` | Apply colors to class displays |
| `src/components/settings/BranchClassScheduleManagement.tsx` | Apply colors to class badges |

## Implementation Details

### 1. Create Color Utility File

Create `src/utils/classTypeColors.ts`:

```typescript
export const CLASS_TYPE_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  badge: string;
}> = {
  'Private Lesson': {
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200',
  },
  'Kids': {
    bg: 'bg-green-100 dark:bg-green-950/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200',
    badge: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200',
  },
  'Teens & Adults': {
    bg: 'bg-violet-100 dark:bg-violet-950/30',
    border: 'border-violet-300 dark:border-violet-700',
    text: 'text-violet-800 dark:text-violet-200',
    badge: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/50 dark:text-violet-200',
  },
  'Little Gaonhae': {
    bg: 'bg-yellow-100 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-200',
  },
  'Team Gaonhae Poomsae': {
    bg: 'bg-sky-100 dark:bg-sky-950/30',
    border: 'border-sky-300 dark:border-sky-700',
    text: 'text-sky-800 dark:text-sky-200',
    badge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/50 dark:text-sky-200',
  },
  'Team Gaonhae Kyorugi': {
    bg: 'bg-orange-100 dark:bg-orange-950/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-200',
    badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-200',
  },
  'Combat/Self-Defense': {
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
  'Kang Klass': {
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200',
  },
  'Junior': {
    bg: 'bg-pink-100 dark:bg-pink-950/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-800 dark:text-pink-200',
    badge: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/50 dark:text-pink-200',
  },
  'Competition': {
    bg: 'bg-lime-100 dark:bg-lime-950/30',
    border: 'border-lime-300 dark:border-lime-700',
    text: 'text-lime-800 dark:text-lime-200',
    badge: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/50 dark:text-lime-200',
  },
};

const DEFAULT_COLORS = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  border: 'border-gray-300 dark:border-gray-600',
  text: 'text-gray-800 dark:text-gray-200',
  badge: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200',
};

export function getClassTypeColors(classType: string) {
  return CLASS_TYPE_COLORS[classType] || DEFAULT_COLORS;
}

export function getClassTypeBadgeClasses(classType: string): string {
  return getClassTypeColors(classType).badge;
}

export function getClassTypeCardClasses(classType: string): string {
  const colors = getClassTypeColors(classType);
  return `${colors.bg} ${colors.border}`;
}
```

### 2. Update BranchWeeklyTimetable.tsx

Import the utility and apply colors to class type badges:

```tsx
import { getClassTypeBadgeClasses } from '@/utils/classTypeColors';

// Update Badge component
<Badge 
  variant="outline" 
  className={`text-xs w-full justify-center ${getClassTypeBadgeClasses(slot.classType)}`}
>
  {slot.classType}
</Badge>
```

### 3. Update ClassWeeklyPlanner.tsx

Apply colors to the class type display:

```tsx
import { getClassTypeColors } from '@/utils/classTypeColors';

<div className={`text-[10px] truncate font-medium ${getClassTypeColors(sc.class_type).text}`}>
  {sc.class_type}
</div>
```

### 4. Update StudentClassSchedule.tsx

Apply colors to class cards and upcoming class displays:

```tsx
import { getClassTypeCardClasses, getClassTypeColors } from '@/utils/classTypeColors';

// Weekly timetable card
<div className={`p-3 border rounded-lg transition-colors ${getClassTypeCardClasses(cls.class_type)}`}>

// Upcoming classes text
<p className={`font-medium ${getClassTypeColors(cls.class_type).text}`}>
  {cls.class_type}
</p>
```

### 5. Update BranchClassScheduleManagement.tsx

Apply colors to class type badges:

```tsx
import { getClassTypeBadgeClasses } from '@/utils/classTypeColors';

<Badge 
  variant="outline" 
  className={getClassTypeBadgeClasses(classSchedule.class_type)}
>
  {classSchedule.class_type}
</Badge>
```

## Visual Preview

```text
+-------------------+-------------------+-------------------+
| 4:00 PM           | 5:00 PM           | 6:00 PM           |
| [Kids]  ← Green   | [Junior] ← Pink   | [Teens] ← Violet  |
| - Student 1       | - Student A       | - Student X       |
+-------------------+-------------------+-------------------+
| 7:00 PM           | 8:00 PM           |                   |
| [Kang]  ← Amber   | [Competition] ←   |                   |
| - Student B       |       Lime        |                   |
+-------------------+-------------------+-------------------+
```

## Complete Color Reference

| Class Type | Background | Border | Text |
|------------|------------|--------|------|
| Private Lesson | blue-100 | blue-300 | blue-800 |
| Kids | green-100 | green-300 | green-800 |
| Teens & Adults | violet-100 | violet-300 | violet-800 |
| Little Gaonhae | yellow-100 | yellow-300 | yellow-800 |
| Team Gaonhae Poomsae | sky-100 | sky-300 | sky-800 |
| Team Gaonhae Kyorugi | orange-100 | orange-300 | orange-800 |
| Combat/Self-Defense | emerald-100 | emerald-300 | emerald-800 |
| Kang Klass | amber-100 | amber-300 | amber-800 |
| Junior | pink-100 | pink-300 | pink-800 |
| Competition | lime-100 | lime-300 | lime-800 |
| Unknown/Default | gray-100 | gray-300 | gray-800 |

## Dark Mode Support

All colors include dark mode variants for proper visibility in both light and dark themes.

