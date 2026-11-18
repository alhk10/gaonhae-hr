# Registered Competitors PDF: new title, address, start time

Only the Registered Competitors PDF (from your screenshot) changes. The /perthcomp page and the other PDFs stay as they are.

1. Change the title to **2026 Gaonhae & Friends Competition**.
2. Add the address under the title: **Scarborough Community Centre 2, Function Room, 173 Gildercliffe Street, Scarborough**.
3. Add **Competition starts 9:00AM**.
4. Keep the "Registered Competitors — by Event & Age Category" line and the counts, moved down to make room.

I'll use the standard spellings "Gildercliffe" and "Scarborough" (your message had "Gidercliffe" and "Scaborough").

## Technical
- `src/pages/public/PublicPerthComp.tsx` `downloadCompetitorsPdf` (~line 161): new header lines, shift start `y`.
