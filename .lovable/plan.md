
## Revised Plan: Pay School Fees + Grading Together in One Submission

### Goal
Add a "Also register for grading" opt-in section directly inside the Pay School Fees form (the `select` step), so the student can choose to pay for both at the same time with a single "Create Invoice & Pay" button click. No extra steps, no post-success prompts.

---

### Proposed UX Flow

```text
Pay School Fees Dialog (step = 'select')
  ├── Term Selection
  ├── Package Selection
  ├── Class Schedule
  ├── Summary Card (school fees)
  │
  ├── [If grading eligible AND not already paid]
  │   ┌─────────────────────────────────────────────┐
  │   │  🎓 Also register for grading?              │
  │   │  Foundation 1 → Foundation 2               │
  │   │  [ ] Yes, include grading ($45)             │
  │   │  Select Session: [dropdown]                 │
  │   └─────────────────────────────────────────────┘
  │
  ├── Combined Summary (if grading opted in):
  │     School Fees:    $XXX.XX
  │     Grading Fee:    $ 45.00
  │     ─────────────────────────
  │     Total:          $XXX.XX
  │
  ├── Payment Section (single payment for both)
  │
  └── [Create Invoice & Pay]  ← creates TWO invoices + payments in one click
          ↓
      step = 'success'
      "Enrollment Confirmed! Grading registration also confirmed."
```

---

### Eligibility Check (when to show grading opt-in)

Show the grading section only when ALL of the following are true:
1. `gradingSlots.length > 0` — there is at least one active future grading slot accessible to the student
2. `gradingProduct` is not null — a belt-transition product exists (e.g., "Foundation 1 >> Foundation 2")
3. `existingGradingInvoice` is null — no grading invoice within the last 60 days

---

### Technical Changes

#### 1. `src/components/dashboard/PaySchoolFeesDialog.tsx`

**New props:**
```typescript
interface PaySchoolFeesDialogProps {
  // ... existing props
  gradingSlots: GradingSlot[];       // passed from StudentDashboard
  student: {
    // ... existing fields
    current_belt?: string;           // add this field
  };
}
```

**New state:**
```typescript
const [includeGrading, setIncludeGrading] = useState(false);
const [selectedGradingSlotId, setSelectedGradingSlotId] = useState('');
```

**New queries (mirrored from PayGradingDialog):**
- `gradingProduct` — belt transition product lookup using `"CurrentBelt >> NextBelt"` pattern with branch price override
- `existingGradingInvoice` — 60-day duplicate check
- `nextBelt` — computed via `getNextBelt(student.current_belt)`

**Computed flag:**
```typescript
const gradingEligible = gradingSlots.length > 0 && !!gradingProduct && !existingGradingInvoice;
```

**Auto-reset grading opt-in** when eligibility changes:
```typescript
useEffect(() => {
  if (!gradingEligible) setIncludeGrading(false);
}, [gradingEligible]);
```

**Auto-select first grading slot** when opting in:
```typescript
useEffect(() => {
  if (includeGrading && gradingSlots.length > 0 && !selectedGradingSlotId) {
    setSelectedGradingSlotId(gradingSlots[0].id);
  }
}, [includeGrading, gradingSlots]);
```

**Updated summary card** — when `includeGrading` is true, show a two-line combined total:
```
School Fees:   $XXX.XX
Grading Fee:   $ 45.00
──────────────────────
Total:         $XXX.XX
```

**Updated `createInvoiceAndPayMutation`** — when `includeGrading` is true, after creating the school fees invoice + payment, create a second grading invoice + payment using the same proof file:
```typescript
// After existing school fees invoice + payment creation...
if (includeGrading && selectedGradingSlot && gradingProduct) {
  const gradingInvoice = await createInvoice({
    student_id: studentId,
    branch_id: student.branch_id,
    items: [{
      product_id: gradingProduct.id,
      description: gradingProduct.name,
      quantity: 1,
      unit_price: gradingProduct.effective_price,
      metadata: {
        grading_slot_id: selectedGradingSlot.id,
        grading_date: selectedGradingSlot.grading_date,
        current_belt: student.current_belt,
        target_belt: nextBelt,
      },
    }],
  });

  await createPayment({
    invoice_id: gradingInvoice.id,
    amount: gradingInvoice.total_amount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: paymentMethod as any,
    reference_number: referenceNumber || undefined,
    proof_of_payment_url: proofUrl,   // same proof file reused
  });
}
```

**Updated success screen** — show appropriate message:
```tsx
{step === 'success' && (
  <div className="text-center py-4 space-y-4">
    <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
    <h3 className="font-semibold text-lg">Enrollment Confirmed!</h3>
    {wasGradingIncluded && (
      <p className="text-sm text-purple-700">
        Grading registration also confirmed.
      </p>
    )}
    <Button onClick={handleClose}>Done</Button>
  </div>
)}
```
(`wasGradingIncluded` is a `useState<boolean>` set to `true` on the mutation's `onSuccess` if `includeGrading` was true at submission time.)

**Updated `handleClose`** — reset new grading state too:
```typescript
setIncludeGrading(false);
setSelectedGradingSlotId('');
setWasGradingIncluded(false);
```

**New UI block** — inserted between the summary card and payment section in the form:
```tsx
{gradingEligible && selectedTerm && selectedProduct && (
  <Card className="border-purple-200 bg-purple-50">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id="include-grading"
          checked={includeGrading}
          onCheckedChange={(v) => setIncludeGrading(!!v)}
        />
        <div className="flex-1">
          <label htmlFor="include-grading" className="font-medium text-purple-900 cursor-pointer">
            Also register for grading
          </label>
          <p className="text-sm text-purple-700">
            {formatBeltLevel(student.current_belt)} → {formatBeltLevel(nextBelt)}
            {gradingProduct && ` — $${gradingProduct.effective_price.toFixed(2)}`}
          </p>
        </div>
      </div>

      {includeGrading && (
        <Select value={selectedGradingSlotId} onValueChange={setSelectedGradingSlotId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose grading session" />
          </SelectTrigger>
          <SelectContent>
            {gradingSlots.map(slot => (
              <SelectItem key={slot.id} value={slot.id}>
                {format(parseISO(slot.grading_date), 'EEEE, dd MMM yyyy')}
                {slot.start_time && ` at ${slot.start_time.slice(0,5)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </CardContent>
  </Card>
)}
```

**Updated submit button disabled logic** — add condition for when grading is opted in but no slot selected:
```typescript
disabled={
  !selectedTermId ||
  !selectedProductId ||
  !proofFile ||
  (includeGrading && !selectedGradingSlotId) ||   // new condition
  createInvoiceAndPayMutation.isPending ||
  isUploading ||
  unpaidTerms.length === 0
}
```

**New imports needed:**
- `GradingSlot` from `@/services/gradingService`
- `Checkbox` from `@/components/ui/checkbox`
- `formatBeltLevel` from `@/constants/beltLevels`
- `getNextBelt` from `./QuickActionsSection`
- `subDays` from `date-fns`
- `ArrowRight, GraduationCap` from `lucide-react`

#### 2. `src/components/dashboard/StudentDashboard.tsx`

Pass `gradingSlots` and `current_belt` to `PaySchoolFeesDialog`:

```tsx
<PaySchoolFeesDialog
  open={showSchoolFeesDialog}
  onOpenChange={setShowSchoolFeesDialog}
  studentId={studentId!}
  student={{
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    branch_id: student.branch_id,
    date_of_birth: student.date_of_birth,
    current_belt: student.current_belt,   // add this
  }}
  availableTerms={availableTerms}
  previousEnrollment={previousEnrollment}
  gradingSlots={gradingSlots}             // add this (already fetched)
/>
```

---

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | Add `gradingSlots` + `current_belt` props; add grading product query + duplicate check; add grading opt-in UI (checkbox + slot selector); update summary card to show combined totals; update mutation to create grading invoice+payment when opted in; update success screen |
| `src/components/dashboard/StudentDashboard.tsx` | Add `current_belt` and `gradingSlots` to the props passed into `PaySchoolFeesDialog` |

---

### Edge Cases

- **Already paid grading**: `existingGradingInvoice` is truthy → grading opt-in section is hidden entirely
- **No grading slots**: `gradingSlots.length === 0` → grading opt-in section is hidden
- **No grading product configured**: `gradingProduct` is null → grading opt-in section is hidden
- **Student unticks checkbox**: `includeGrading` resets to false → submit proceeds as school fees only
- **Grading slot required when opted in**: submit button stays disabled until a grading slot is selected
- **Same proof file for both payments**: the uploaded file URL is reused for both the school fees and grading payment records, keeping the UX simple (one upload covers both)
- **Partial failure**: if the grading invoice/payment creation fails after school fees succeed, a toast error is shown but the school fees remain recorded (not rolled back — acceptable given this is a student self-service flow)
