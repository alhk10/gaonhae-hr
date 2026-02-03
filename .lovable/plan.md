

# Plan: Add Lesson Configuration Fields to Product Management

## Overview

Add lesson-specific configuration fields to the Edit Product and Add Product dialogs, enabling products to be marked as "lesson" types with configurable lessons per week and scheduled days.

---

## Database Changes

### New Columns for `products` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_lesson` | boolean | false | Marks product as a lesson/class type |
| `lessons_per_week` | integer | null | Number of lessons per week (1-7) |
| `lesson_days` | text[] | null | Days of the week (e.g., ['Monday', 'Wednesday']) |

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_lesson boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lessons_per_week integer,
  ADD COLUMN IF NOT EXISTS lesson_days text[];
```

---

## UI Changes

### New Section in Product Forms

Add a new "Lesson Configuration" section (with Calendar icon) in both `EditProductDialog.tsx` and `AddProductDialog.tsx`:

```text
+------------------------------------------+
| 📅 Lesson Configuration                  |
+------------------------------------------+
| [Toggle] This is a lesson product        |
|                                          |
| (When enabled:)                          |
| Lessons per Week:  [1] [2] [3] [4] [5+]  |
|                     ↑ Radio/Select       |
|                                          |
| Which Days:                              |
| [x] Monday  [ ] Tuesday  [x] Wednesday   |
| [ ] Thursday [x] Friday  [ ] Saturday    |
| [ ] Sunday                               |
+------------------------------------------+
```

### Conditional Display
- "Lessons per Week" and "Which Days" fields only appear when `is_lesson` toggle is ON
- Days should be multi-select checkboxes for clear UX

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `is_lesson`, `lessons_per_week`, `lesson_days` columns |
| `src/components/sales/EditProductDialog.tsx` | Add Lesson Configuration section with toggle, quantity, and day selectors |
| `src/components/sales/AddProductDialog.tsx` | Add matching Lesson Configuration section |
| `src/services/productService.ts` | Update `Product` interface and transform functions to include new fields |

---

## Technical Details

### Form State Structure

```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  is_lesson: false,
  lessons_per_week: 1,
  lesson_days: [] as string[],
});
```

### Day Options

```typescript
const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday', 'Sunday'
];
```

### UI Component

The lesson days selector will use a grid of checkboxes for intuitive multi-select:

```typescript
<div className="grid grid-cols-4 gap-2">
  {WEEKDAYS.map(day => (
    <label key={day} className="flex items-center gap-2">
      <Checkbox 
        checked={formData.lesson_days.includes(day)}
        onCheckedChange={(checked) => toggleDay(day, checked)}
      />
      <span className="text-sm">{day}</span>
    </label>
  ))}
</div>
```

---

## Validation Rules

| Rule | Implementation |
|------|----------------|
| Lessons per week valid range | 1-7 (or null if not a lesson) |
| Days consistency | Number of selected days should ideally match `lessons_per_week` |
| Clear on toggle off | When `is_lesson` is toggled off, clear `lessons_per_week` and `lesson_days` |

---

## Integration Points

Once configured, these fields can be used by:
- **Invoice Creation**: Pre-populate enrolled days from product configuration
- **Class Enrollment**: Default lesson count from product settings
- **Student Dashboard**: Show scheduled days in enrollment summary

