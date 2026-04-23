

## Plan: Dynamic "commence" timing and remove brackets around branch name

### What changes

In `src/utils/invoicePDFGenerator.ts` → `buildTermReminderMessage` (used by both blue **SMS** and green **WhatsApp** buttons):

1. **Dynamic "commence" phrase**
   Replace the hard-coded `"will commence next week"` with a phrase derived from the number of days between **today (sender's local date)** and the **next term start date**:

   | Days until next term start | Phrase used |
   |---|---|
   | Already started (≤ 0 days) | `has commenced` |
   | 1 day | `will commence tomorrow` |
   | 2–6 days | `will commence in N days` |
   | 7–13 days | `will commence next week` |
   | 14+ days | `will commence in N days` |
   | Next term start unknown | `will commence soon` |

   Day count is calculated from midnight-to-midnight of the local clock so partial days don't skew the number.

2. **Remove brackets from branch name in signature**
   Change the closing line from:
   ```
   Gaonhae Taekwondo (Branch)
   ```
   to:
   ```
   Gaonhae Taekwondo Branch
   ```
   Fallback when no branch is set: `Gaonhae Taekwondo`.

### Resulting message template

```
Good Morning,

We have now reached the end of Term 1 2026. Term 2 2026 will commence in 5 days and will run from 28/04/2026 to 30/06/2026.

Kindly arrange payment before the start of the term as follows:

Items:
Term 2 2026 Lessons – $360.00
Uniform – $50.00

Total: $410.00

Payment can be made via bank transfer using the details below:
DBS 123-456-789-0
Gaonhae Taekwondo Pte Ltd

Thank you for your continued support.
Gaonhae Taekwondo Bukit Timah
```

### File affected

- `src/utils/invoicePDFGenerator.ts`
  - Update `buildTermReminderMessage` only (commence-phrase logic + signature line).
  - No changes to `shareInvoiceViaSMS`, `shareInvoiceViaWhatsApp`, or any caller.

### Files NOT changed

- `BranchDashboard.tsx`, `InvoiceManagementList.tsx` — they already pass `terms.next.start_date`; no caller updates needed.
- `shareInvoiceOverdueReminderViaSMS` — unrelated overdue template, untouched.

### Behavior after change

| Scenario | Output snippet |
|---|---|
| Next term starts in 12 days | `Term 2 2026 will commence next week and will run from …` |
| Next term starts in 3 days | `Term 2 2026 will commence in 3 days and will run from …` |
| Next term starts tomorrow | `Term 2 2026 will commence tomorrow and will run from …` |
| Next term already started | `Term 2 2026 has commenced and will run from …` |
| Next term date unknown | `Term 2 2026 will commence soon.` |
| Branch is "Bukit Timah" | Signature: `Gaonhae Taekwondo Bukit Timah` |
| Branch missing | Signature: `Gaonhae Taekwondo` |

### Verification

1. Open Branch Dashboard → click green WhatsApp button on an invoice whose term starts in 5 days → message reads `will commence in 5 days`, signature has no brackets.
2. Click blue SMS button on the same invoice → identical body.
3. Test with a term starting tomorrow → reads `will commence tomorrow`.
4. Test with a term already started → reads `has commenced`.
5. Test with branch "Bukit Timah" → ends with `Gaonhae Taekwondo Bukit Timah` (no parentheses).
6. Time-of-day greeting and all other content (items, total, bank info) unchanged.

### Out of scope

- Recipient-timezone awareness (uses sender's device clock — same as current greeting).
- Overdue SMS template.
- Number/currency formatting.

