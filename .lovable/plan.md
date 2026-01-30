
# Plan: Exclude Partner Claims from Payroll Processing

## Problem
Currently, all approved claims (including partner claims like Transport, Office Stationeries, Training Equipment, and Other Business Expense) are being added to employees' payroll calculations. Partner claims should be excluded because they:
- Are business expenses that flow to Branch Profit & Loss
- Are not personal reimbursable claims meant to be included in employee net pay

## Solution Overview
Filter out partner claim types when calculating approved claims total in the payroll service.

---

## Implementation Steps

### Step 1: Update `src/services/payrollService.ts`

Add a filter to exclude partner claim types when summing approved claims for payroll.

**Changes:**
- Import or define the `PARTNER_CLAIM_TYPES` array (same as in `claimsService.ts`)
- Modify the `approvedClaimsTotal` calculation to exclude claims with types matching partner claim types

**Before:**
```typescript
const approvedClaimsTotal = claims
  .filter(claim => claim.status === 'Approved')
  .reduce((sum, claim) => sum + claim.amount, 0);
```

**After:**
```typescript
// Partner claim types that should NOT be included in payroll (they go to Branch P&L)
const PARTNER_CLAIM_TYPES = [
  'Transport',
  'Office Stationeries', 
  'Training Equipment',
  'Other Business Expense'
];

const approvedClaimsTotal = claims
  .filter(claim => 
    claim.status === 'Approved' && 
    !PARTNER_CLAIM_TYPES.includes(claim.type)
  )
  .reduce((sum, claim) => sum + claim.amount, 0);
```

---

## Technical Details

### Partner Claim Types to Exclude
Based on the `SubmitPartnersClaim.tsx` page, these are the types used:
- `Transport`
- `Office Stationeries`
- `Training Equipment`
- `Other Business Expense`

### Regular Employee Claim Types (Still Included)
These will continue to be included in payroll:
- Medical
- Transport (employee personal transport - if different naming)
- Training
- Entertainment
- Others

### Files Modified
1. **`src/services/payrollService.ts`** - Add partner claim type filter to `approvedClaimsTotal` calculation

---

## Testing Notes
After implementation:
1. Partner/Senior Partner employees with approved partner claims should see $0 in the Claims column for payroll
2. Regular employees with standard approved claims should still see their claims included
3. Verify the payroll net pay calculation excludes partner claim amounts
