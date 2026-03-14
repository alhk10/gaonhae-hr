

## Fix: Allow backspace to clear price inputs in Create Invoice

### Problem
Price inputs use `parseFloat(e.target.value) || 0` which immediately snaps empty input back to `0`, preventing backspace from clearing the field. This is the same issue that was previously fixed for quantity inputs.

### Affected Fields (all in `CreateInvoiceDialog.tsx`)
- **Existing item price** — mobile card layout (line 1533)
- **Existing item price** — desktop table layout (line 1646)
- **New item price** — mobile card layout (line 1576)
- **New item price** — desktop table layout (line 1679)

No other numeric fields are affected:
- Quantity inputs already use the blur-finalize pattern
- Discount popover already uses string state (`localValue`)
- GST/tax uses a select dropdown

### Changes

**`src/components/sales/CreateInvoiceDialog.tsx`**

1. **Refactor `updateItemPrice`** to accept a string value (like `updateItemQuantity`):
   - Parse the string; allow empty/zero intermediate states
   - Recalculate line total using the parsed value

2. **Add `finalizeItemPrice`** blur handler:
   - Ensure price is not negative on blur (clamp to 0)

3. **Update all 4 price `<Input>` elements**:
   - Change `value={item.unit_price}` → `value={item.unit_price || ''}`
   - Change `onChange` to pass raw `e.target.value` string
   - Add `onBlur={() => finalizeItemPrice(index)}`

4. **Update `handleNewItemChange` for price**:
   - Change `value={newItem.unit_price}` → `value={newItem.unit_price || ''}`
   - Allow empty string → 0 intermediate state
   - Add blur handler to finalize

### Scope
- **Modified**: `src/components/sales/CreateInvoiceDialog.tsx` only

