
# Plan: Auto-Select Product and Term/Slot When Only 1 Option

## Overview
Implement automatic selection of product and term/slot dropdowns when filtering results in only a single option available. This improves user experience by reducing clicks for common cases.

## Current Behavior
- User must manually select a product from dropdown even if only one matches
- User must manually select term/slot even if only one is available
- Dropdowns remain empty requiring explicit selection

## Proposed Behavior
- When a category is selected and only 1 product matches the filter criteria (category + belt level) → automatically select that product
- For "Classes" category: When only 1 term is available → automatically select it
- For "Grading Fees" category: When only 1 grading slot matches (branch + belt) → automatically select it

## Technical Implementation

### File: `src/components/sales/CreateInvoiceDialog.tsx`

### Change 1: Add useEffect for Auto-Selecting Single Product (after line 595)

Add a useEffect that monitors `filteredProducts` and auto-selects if there's exactly 1 option:

```typescript
// Auto-select product if only 1 option available
useEffect(() => {
  if (newItem.category_id && filteredProducts.length === 1 && !newItem.product_id) {
    const singleProduct = filteredProducts[0];
    handleProductChange(singleProduct.id);
  }
}, [filteredProducts.length, newItem.category_id, newItem.product_id]);
```

### Change 2: Add useEffect for Auto-Selecting Single Term (after Change 1)

Add a useEffect that monitors `branchTerms` for "Classes" category:

```typescript
// Auto-select term if only 1 option available for Classes category
useEffect(() => {
  if (selectedCategory?.name === 'Classes' && branchTerms.length === 1 && !newItem.term_id) {
    handleNewItemChange('term_id', branchTerms[0].id);
  }
}, [branchTerms.length, selectedCategory?.name, newItem.term_id]);
```

### Change 3: Add useEffect for Auto-Selecting Single Grading Slot (after Change 2)

Add a useEffect that monitors filtered grading slots for "Grading Fees" category:

```typescript
// Auto-select grading slot if only 1 option available for Grading Fees category
useEffect(() => {
  const filteredSlots = getFilteredGradingSlots();
  if (selectedCategory?.name === 'Grading Fees' && filteredSlots.length === 1 && !newItem.grading_slot_id) {
    handleNewItemChange('grading_slot_id', filteredSlots[0].id);
  }
}, [gradingSlots, formData.branch_id, studentBelt, selectedCategory?.name, newItem.grading_slot_id]);
```

## Expected Result

Using the example from the image:
- Student: Mingyu (Green Tip belt)
- Category: "Grading Fees" selected
- Products filtered to belt level → if only "Green Tip >> Green" matches → **auto-selected**
- Grading slots filtered to Green Tip → if only "Morley - 11 Apr 2026 - 08:40 - Green Tip" matches → **auto-selected**

The form pre-fills with valid options, reducing clicks from 4 to 2 for single-option scenarios.

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Multiple products match | No auto-select, user picks |
| Multiple terms/slots available | No auto-select, user picks |
| Product already selected | No override, keeps user selection |
| Category changes | Resets product, then auto-selects if single match |
| No options available | Shows "No slots" or "No terms" text |
