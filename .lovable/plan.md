# Parent/Student "/hello" Guide PDF + FAQ download button

## What you'll get
- A one-page A4 PDF, Gaonhae-branded, titled "How to use gaonhae.app/hello", with four short numbered sections:
  1. **Make a payment** - open /hello, enter your name and date of birth, choose "Pay Fees" or the outstanding-invoice popup, credits are used first, pay by PayNow/bank transfer, upload a screenshot of the proof, keep the confirmation code.
  2. **Register for grading** - only shows once your instructor marks you "Ready for grading"; pick the slot, pay, upload proof.
  3. **Order guards** - choose "Order Guards", pick items and sizes, pay and upload proof; collect from your branch.
  4. **Update details** - choose "Update personal information", edit contacts/photo, submit (staff review changes).
- Footer tips: screenshots only (no PDFs), one submission per payment, contact your branch if stuck. A QR code linking to gaonhae.app/hello.
- A **Download parent guide (PDF)** button at the top right of the FAQ tab in /access, for all branches, so staff can print or WhatsApp it.

## Steps
1. Read the /hello menu wording so the guide matches the button labels exactly.
2. Generate the PDF, check the page renders cleanly (no clipped text, fits on one page).
3. Store the PDF with the app's file hosting and add the download button to the FAQ tab header (right-aligned beside the search box).
4. Also save a copy in Files.
5. Open the FAQ tab to confirm the button downloads the PDF.

## Technical notes
- PDF built with reportlab in /tmp, uploaded via lovable-assets; FaqTab imports the `.asset.json` pointer and renders an `<a download>` button.
- Text only (no app screenshots) to stay on one page; instructions written by me and can be reworded.
