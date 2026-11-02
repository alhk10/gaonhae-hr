# Merge Geup 10 & 9 and Geup 8 & 7 events (/perthcomp)

## What changes
- Competition events list becomes:
  - **Geup 10 & 9 – Taegeuk 1 Jang** (replaces separate Geup 10 and Geup 9)
  - **Geup 8 & 7 – Taegeuk 2 Jang** (replaces separate Geup 8 and Geup 7)
  - Geup 6 to 1 and Poom/Dan events unchanged.
- Applies to the public registration form, staff Add/Edit entry window, Registration log, public "Registered Competitors" PDF and staff Competition Log PDF.
- Eligibility: 10 or 9 Geup can enter the 10 & 9 event; 10 to 7 Geup can enter the 8 & 7 event (own grade or higher, as today).

## Existing entries
- Entries currently in Geup 10 or Geup 9 move into the merged 10 & 9 event; Geup 8 or 7 into the merged 8 & 7 event.
- If someone was in both halves (e.g. Geup 8 and Geup 7), they keep one merged entry, so their event count drops by one (fee is unchanged since pricing is per participant/event — will confirm the stored amount and adjust nothing on paid entries).

## Technical details
- `src/utils/perthCompRules.ts`: replace codes `g10,g9` with `g10_9` and `g8,g7` with `g8_7`; `eventIneligibility` uses the lower geup of the merged pair.
- Migration: update the server-side event-code validation in `submit_perth_event_registration` and the admin upsert function to accept the new codes; data update rewrites `perth_event_registrations.comp_events`, de-duplicating.
- PDFs iterate `COMP_EVENTS`, so ordering/headings follow automatically.
