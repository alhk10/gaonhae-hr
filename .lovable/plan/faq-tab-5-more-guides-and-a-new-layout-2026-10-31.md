# FAQ tab: 5 more guides and a new layout

## New guides (each with numbered steps and screenshots, red boxes on buttons)
1. **Add a student via /register**: share the /register link, the family fills the form and signs, and the entry then shows under Summary > Approvals for staff to approve.
2. **Add a timetable slot**: Attendance > Settings > Timetable > Add (Weekly or Specific date) > day/time, class, capacity, age/belt > Save.
3. **Add a term**: Attendance > Settings > Terms > Add > name, start/end dates > Save.
4. **Record a payment**: open the invoice > Record Payment > amount, date, method, proof (upload or paste with Ctrl/Cmd+V) > save. Cash is verified straight away. PayNow and bank transfers wait for verification.
5. **Change pricing**: School Fees tab > Settings (fee products) > edit the price > Save. The guide will also note which prices only a superadmin can change.

## New layout
- Guides grouped under headings:
  - **Students**: add manually, add via /register
  - **Classes and attendance**: add a timetable slot, add a term, add attendance
  - **Invoices and payments**: add an invoice, record a payment, refund as credit, delete a draft invoice
  - **Settings**: change pricing
- A search box at the top filters guides by title.
- Numbering restarts within each group. Pictures can still be enlarged.

## How screenshots are made
I'll take them the same way as before: sign in with a branch password and blank out names, emails and phone numbers. I'll stop before any final Save, so no real data changes. The /register pictures will use the public form with nothing filled in.

## Technical details
- `FaqTab.tsx`: change `GUIDES` to `{ section, guides[] }[]`, add a filter Input, and use one Accordion per section.
- New images go in `src/assets/faq/` (register-*, timetable-*, term-*, payment-*, pricing-*).
- If the pricing settings button is hidden for branch passwords, the guide will say "superadmin only" and show the screen as the all-branch password sees it.
