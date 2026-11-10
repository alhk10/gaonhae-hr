# Progress report PDF polish and /hello menu hiding

## 1. Logo
- Add the Gaonhae Taekwondo logo to the top left of every Progress Report Card page and of the Progress Report Summary page (same logo already used in invoice/certificate PDFs).

## 2. Summary footer
- Every summary page footer shows "Report generated DD/MM/YYYY HH:mm" plus page number.

## 3. Columns and wrapping
- Summary table: fixed, well-spaced columns (#, Name, Birth Date, Ready for Grading Test, Paid Date) with every cell wrapping inside its column, row heights measured from the tallest cell, header repeated on new pages.
- Card page: rating labels and item names wrap within their columns; info box values (name, belt, report date/term) wrap instead of overflowing.

## 4. /hello menu
- Hide "Order Uniforms and Apparel" when the branch has no active uniform/apparel items for the student.
- Hide "Order Protection Guards and Accessories" when no guard/accessory items (including packages) are active for the branch.
- Uses the same product list /hello shows at checkout, so the buttons only show when there's something to buy.

## Technical details
- `src/utils/progressCardPdf.ts`: load `src/assets/gaonhae-logo.png` as data URL (pattern from `invoicePDFGenerator.ts`), `addImage` top-left; table drawn with splitTextToSize per cell; footer via loop over pages for summary.
- `PublicHelloChat.tsx`: query active product counts per category for the branch (existing `getChatProducts` / guard catalog function) and filter the menu list at line ~1690.
- Visually check the generated PDF via pdftoppm before finishing.
