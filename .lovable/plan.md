## Fix: "Failed to update grading slot"

### Root cause
Postgres log: `invalid input syntax for type time: ""`. The edit dialog submits `start_time: ''` (empty string) for the `time` column, which Postgres rejects. Same risk for `end_time`.

### Fix

**File:** `src/components/sales/AddGradingSlotDialog.tsx` — `handleSubmit` (around line 128)

Before calling `createGradingSlot` / `updateGradingSlot`, normalize the payload:
- `start_time`: `''` → `null`
- `end_time`: `''` → `null`
- (Optional, defensive) `location`, `examiner_name`, `notes`, `title`: `''` → `null`

Pass the sanitized object instead of the raw `formData`.

No DB migration, no service or RPC changes.