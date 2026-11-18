# /perthcomp: new title, full address, start time

1. Rename the event to **2026 Gaonhae & Friends Competition** everywhere on /perthcomp: the page heading, browser tab, the Registered Competitors PDF (your screenshot), the registration confirmation PDF and the staff event lists.
2. Show the full address under the heading: **Scarborough Community Centre 2, Function Room, 173 Gildercliffe Street, Scarborough**. It also goes on the confirmation PDF.
3. Add **Competition starts 9:00AM** next to the date and address on the page and in the PDFs.

I'll use the standard spellings "Gildercliffe" and "Scarborough" (your message had "Gidercliffe" and "Scaborough").

## Technical
- `src/pages/public/PublicPerthComp.tsx`: header lines 275-278 (add Clock icon line), `document.title` line 67, PDFs at lines 161, 222-224, 526. Update the memory note for Perth Comp 2026.
