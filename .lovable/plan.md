

# Equalize Day Column Widths + Vertical Week Text + Fit to Screen

## Changes to `src/components/dashboard/ClassScheduleSelector.tsx`

### 1. Table Layout: `table-fixed`
Add `table-fixed` to the `<table>` element so all columns get equal width distribution instead of sizing based on content.

### 2. Vertical Week Label (First Column)
- Narrow first column from `w-24` to `w-10`
- Use CSS `[writing-mode:vertical-lr] rotate-180` to render "Wk {n}" and "(dd MMM)" vertically
- This saves significant horizontal space, leaving more room for the day columns

### 3. Equal Day Columns
- Remove `min-w-[100px]` from day headers
- With `table-fixed` and a narrow first column, all remaining day columns will automatically share equal width

### 4. Compact Padding and Text
- Reduce cell padding from `p-2` to `px-1 py-1.5` throughout
- Reduce slot button padding from `px-2 py-2` to `px-1 py-1`
- Reduce gap between multiple class buttons from `space-y-2` to `space-y-1`
- Day headers: `text-xs`

### 5. Remove Horizontal ScrollArea
Since the table now fits within the viewport, remove the `ScrollArea` wrapper (or keep it as a safety net but it should no longer scroll).

## Technical Detail

Key table structure:
```tsx
<table className="w-full table-fixed">
  <thead>
    <tr>
      <th className="w-10 ...">Term</th>
      {/* Each day column gets equal remaining width automatically */}
      <th className="px-1 py-1.5 text-center text-xs ...">Mon</th>
      ...
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="w-10 px-1 py-1.5">
        <div className="flex items-center justify-center [writing-mode:vertical-lr] rotate-180">
          <span className="text-xs font-semibold">Wk {n}</span>
          <span className="text-[10px] text-muted-foreground">({dd MMM})</span>
        </div>
      </td>
      <td className="px-1 py-1.5 ...">...</td>
      ...
    </tr>
  </tbody>
</table>
```

All changes are CSS/className adjustments within `ClassScheduleSelector.tsx`. No logic changes.
