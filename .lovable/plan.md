

## Plan: Add time-of-day greeting to invoice SMS & WhatsApp messages

### What changes

Prepend a salutation line to the shared term-reminder message (used by both blue SMS and green WhatsApp buttons):

```text
Good Morning,

We have now reached the end of Term 1 2026. Term 2 2026 will commence next week and will run from 28/04/2026 to ...
```

The greeting is determined by the recipient's local time at the moment the message is opened:

- **Morning** — 05:00–11:59
- **Afternoon** — 12:00–17:59
- **Evening** — 18:00–04:59

(Computed from the sender's device clock, since SMS/WhatsApp open in the browser of the staff sending the message — no recipient timezone lookup required.)

### File to update

**`src/utils/invoicePDFGenerator.ts` — `buildTermReminderMessage`**

- Add a small helper `getTimeOfDayGreeting()` that returns `'Morning' | 'Afternoon' | 'Evening'` based on `new Date().getHours()`.
- Prepend `Good ${greeting},\n\n` to the existing message body.
- Everything else (term opening, items, total, bank transfer info, signature) stays exactly as today.

No other files need changes — both `shareInvoiceViaSMS` and `shareInvoiceViaWhatsApp` already call `buildTermReminderMessage`, so both channels pick up the new greeting automatically.

### Final message format

```text
Good {Morning|Afternoon|Evening},

We have now reached the end of {ending term name}. {upcoming term name} will commence next week and will run from {start} to {end}.

Kindly arrange payment before the start of the term as follows:

Items:
{Product 1} – {amount 1}
{Product 2} – {amount 2}

Total: {total_amount}

Payment can be made via bank transfer using the details below:
{bank transfer info}

Thank you for your continued support.
Gaonhae Taekwondo ({branch name})
```

### Verification

1. At 09:30 local — click blue SMS on Hannah's Term 2 2026 invoice → message starts with `Good Morning,` followed by the existing term opening.
2. At 14:00 local — click green WhatsApp on the same invoice → message starts with `Good Afternoon,`.
3. At 20:00 local — either button → message starts with `Good Evening,`.
4. At 02:00 local — either button → still `Good Evening,` (treats early morning as evening per the band above).
5. Items, totals, bank transfer info, and Gaonhae signature are unchanged.

### Out of scope

- Per-recipient timezone resolution (uses the sender's device clock).
- Personalising with the recipient's name (not requested).
- Overdue SMS template (separate function, unchanged).

