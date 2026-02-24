

## Add "Pay for Next Term" Opt-in Card in PayGradingDialog

### Overview
Add a card in the `PayGradingDialog` (between the grading summary card and the payment section) that asks: "Would you also like to make payment for the next term?" with a checkbox opt-in. When checked, it triggers the `PaySchoolFeesDialog` after the grading registration is complete.

### Changes

#### 1. `src/components/dashboard/PayGradingDialog.tsx`

**Props changes:**
- Add new optional props: `availableTerms`, `studentDateOfBirth`, and `onPaySchoolFees` callback

**New UI card (inserted between the summary card and payment section, around line 379):**
- A card with a school/calendar icon asking "Would you also like to make payment for the next term?"
- A checkbox to opt-in
- Subtle styling (blue/green tinted card) to differentiate from the grading summary

**State:**
- Add `alsoPayTermFees` boolean state (default false)

**Success step update:**
- On the success screen, if `alsoPayTermFees` is checked and `onPaySchoolFees` callback is provided, show a "Pay Term Fees" button (or auto-trigger the callback) after "Done"
- When user clicks "Done" and opt-in is checked, call `onPaySchoolFees()` which will open the `PaySchoolFeesDialog` from the parent

#### 2. `src/components/dashboard/StudentDashboard.tsx`

**Update all `PayGradingDialog` render instances (3 places):**
- Pass `availableTerms`, `studentDateOfBirth`, and an `onPaySchoolFees` callback that opens the `PaySchoolFeesDialog`
- The callback sets `showSchoolFeesDialog(true)` (for manual trigger) or `showAutoSchoolFees(true)` (for auto-trigger)

### UI Layout in PayGradingDialog

```
Belt Progression Card
Select Grading Session dropdown
Summary Card (date, time, fee)
--- NEW: "Also pay term fees?" card with checkbox ---
Payment Section (method, QR, reference, proof)
[Create Invoice & Pay] button
```

### Technical Details

**New card markup (in PayGradingDialog):**
```tsx
{selectedSlot && gradingProduct && !duplicateError && availableTerms.length > 0 && (
  <Card className="bg-blue-50 border-blue-200">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="also-pay-term"
          checked={alsoPayTermFees}
          onCheckedChange={(v) => setAlsoPayTermFees(!!v)}
        />
        <label htmlFor="also-pay-term" className="text-sm cursor-pointer">
          <span className="font-medium">Also pay for the next term?</span>
          <p className="text-muted-foreground text-xs mt-1">
            After completing grading registration, you'll be prompted to make term payment.
          </p>
        </label>
      </div>
    </CardContent>
  </Card>
)}
```

**Success step modification:**
- If `alsoPayTermFees` is true, the "Done" button text changes to "Continue to Term Payment"
- On click, it calls `handleClose()` then `onPaySchoolFees?.()`

**Props update for PayGradingDialog interface:**
```typescript
interface PayGradingDialogProps {
  // ... existing props
  availableTerms?: Term[];
  onPaySchoolFees?: () => void;
}
```

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/PayGradingDialog.tsx` | Add opt-in card, new props, updated success step |
| `src/components/dashboard/StudentDashboard.tsx` | Pass new props to all 3 PayGradingDialog instances |

