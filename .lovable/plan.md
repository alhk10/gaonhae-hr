
# Plan: Fix Grading Fee Lookup & Add Single-Step Invoice + Payment Flow

## Problem Analysis

### Current Issues:
1. **Incorrect pricing**: The dialog uses a generic query that fetches any product with "grading" in the name, instead of the correct belt-specific grading product
2. **Two-step flow**: Currently, clicking "Create Invoice & Pay" creates the invoice, then takes you to a separate payment step
3. **Missing payment section on initial screen**: User wants to see payment method, reference, and proof upload on the same screen as grading slot selection

### What Should Happen:
- The grading fee should match the student's belt progression (e.g., "Foundation 1 >> Foundation 2" = $45)
- Payment section should appear on the selection screen, below the fee summary
- One click completes both invoice creation and payment recording

---

## Grading Products in Database

| Product Name | Base Price |
|--------------|------------|
| Foundation 1 >> Foundation 2 | $45.00 |
| Foundation 2 >> Foundation 3 | $45.00 |
| Foundation 3 >> White | $45.00 |
| White >> Yellow Tip | $50.00 |
| Yellow Tip >> Yellow | $60.00 |
| Yellow >> Green Tip | $65.00 |
| Green Tip >> Green | $70.00 |
| Green >> Blue Tip | $75.00 |
| Blue Tip >> Blue | $80.00 |
| Blue >> Red Tip | $85.00 |
| Red Tip >> Red | $90.00 |
| Red >> Black Tip | $100.00 |

---

## Solution

### File: `src/components/dashboard/PayGradingDialog.tsx`

**1. Fix Product Query**

Replace the generic grading product query with belt-specific matching:

```typescript
// Current (incorrect)
const { data: gradingProduct } = useQuery({
  queryKey: ['grading-product', student.branch_id],
  queryFn: async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or('name.ilike.%grading%,category_id.eq.xxxxx')
      .limit(1)
      .maybeSingle();
    return data;
  },
});

// New (correct)
const { data: gradingProduct } = useQuery({
  queryKey: ['grading-product', student.current_belt, nextBelt, student.branch_id],
  queryFn: async () => {
    // Build the expected product name pattern: "Foundation 1 >> Foundation 2"
    const productName = `${formatBeltLevel(student.current_belt)} >> ${formatBeltLevel(nextBelt)}`;
    
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('name', productName)
      .maybeSingle();
    
    if (!data) return null;
    
    // Check for branch-specific pricing override
    if (student.branch_id) {
      const { data: priceRule } = await supabase
        .from('price_rules')
        .select('price_override, is_active')
        .eq('product_id', data.id)
        .eq('branch_id', student.branch_id)
        .maybeSingle();
      
      // If rule exists and is hidden, return null
      if (priceRule?.is_active === false) return null;
      
      return {
        ...data,
        effective_price: priceRule?.price_override ?? data.base_price,
      };
    }
    
    return { ...data, effective_price: data.base_price };
  },
  enabled: !!student.current_belt && !!nextBelt,
});
```

**2. Merge Steps into Single Screen**

Current flow:
```
Step 1 (select): Choose slot → Click "Create Invoice & Pay" → Creates invoice
Step 2 (payment): Upload proof → Click "Submit Payment" → Records payment
Step 3 (success): Done
```

New flow:
```
Step 1 (select): Choose slot + Payment Method + Proof Upload → Click "Create Invoice & Pay"
  → Creates invoice AND records payment in one mutation
Step 2 (success): Done
```

**3. UI Layout Changes**

Add payment section below the grading fee summary on the initial "select" step:

```tsx
{/* Summary Section */}
{selectedSlot && gradingProduct && (
  <Card className="bg-primary/5 border-primary/20">
    <CardContent className="p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Date</span>
        <span className="font-medium">{format(...)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Time</span>
        <span className="font-medium">{...}</span>
      </div>
      <div className="border-t pt-2 flex justify-between">
        <span className="font-semibold">Grading Fee</span>
        <span className="font-bold text-lg">
          ${gradingProduct.effective_price?.toFixed(2)}
        </span>
      </div>
    </CardContent>
  </Card>
)}

{/* NEW: Payment Section - Shown on same screen */}
{selectedSlot && gradingProduct && (
  <div className="space-y-4 pt-2">
    <Label className="text-base font-semibold">Payment</Label>
    
    {/* Payment Method */}
    <div className="space-y-2">
      <Label>Payment Method *</Label>
      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getPaymentMethods().map((method) => (...))}
        </SelectContent>
      </Select>
    </div>

    {/* Reference Number */}
    <div className="space-y-2">
      <Label>Reference Number (Optional)</Label>
      <Input value={referenceNumber} onChange={...} placeholder="Transaction reference" />
    </div>

    {/* Proof of Payment */}
    <div className="space-y-2">
      <Label>Proof of Payment *</Label>
      <div className="border-2 border-dashed rounded-lg p-4 text-center">
        {/* File upload UI */}
      </div>
    </div>
  </div>
)}
```

**4. Combined Mutation**

Merge the separate invoice and payment mutations into one:

```typescript
const createInvoiceAndPayMutation = useMutation({
  mutationFn: async () => {
    if (!selectedSlot || !gradingProduct || !student.branch_id || !student.current_belt) {
      throw new Error('Missing required data');
    }
    if (!proofFile) {
      throw new Error('Proof of payment is required');
    }
    if (duplicateError) {
      throw new Error(duplicateError);
    }

    // Step 1: Create invoice
    const invoice = await createInvoice({
      student_id: studentId,
      branch_id: student.branch_id,
      payment_terms_days: 7,
      internal_notes: `Grading registration: ${formatBeltLevel(student.current_belt)} → ${formatBeltLevel(nextBelt)}...`,
      items: [{
        product_id: gradingProduct.id,
        description: gradingProduct.name,
        quantity: 1,
        unit_price: gradingProduct.effective_price || gradingProduct.base_price,
        metadata: {
          grading_slot_id: selectedSlot.id,
          grading_date: selectedSlot.grading_date,
          current_belt: student.current_belt,
          target_belt: nextBelt,
        },
      }],
    });

    // Step 2: Upload proof of payment
    setIsUploading(true);
    const proofUrl = await uploadProofOfPayment(proofFile);

    // Step 3: Create payment
    await createPayment({
      invoice_id: invoice.id,
      amount: invoice.total_amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      proof_of_payment_url: proofUrl,
    });

    return invoice;
  },
  onSuccess: () => {
    setStep('success');
    queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
    toast.success('Invoice created and payment recorded successfully!');
  },
  // ...
});
```

**5. Remove Two-Step Logic**

- Remove the separate `createInvoiceMutation` and `createPaymentMutation`
- Replace with single `createInvoiceAndPayMutation`
- Remove `step === 'payment'` conditional rendering block
- Keep only `step === 'select'` and `step === 'success'`

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/dashboard/PayGradingDialog.tsx` | - Fix grading product query to match belt transition (e.g., "Foundation 1 >> Foundation 2")<br>- Add branch-specific pricing lookup<br>- Move payment form fields to initial screen<br>- Combine invoice + payment into single mutation<br>- Remove separate "payment" step |

---

## Expected Result

After implementation:
- Student with "Foundation 1" belt sees **$45.00** grading fee (for Foundation 1 >> Foundation 2)
- Payment method, reference, and proof upload appear below the fee summary
- Single "Create Invoice & Pay" click creates invoice AND records payment
- Dialog shows success screen directly after submission
