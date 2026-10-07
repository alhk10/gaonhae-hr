# Responsive two-line rows for `/access` transaction lists

## Outcome
School Fees, Grading, Competitions, Seminars/Events, and Uniforms & Guards will use the available width first. When all fields no longer fit clearly, each record will flow into a structured second line instead of squeezing text, clipping controls, or requiring staff to chase information horizontally.

## Changes
1. **Use one responsive row pattern across all five tabs.** Wide views remain compact tables. At constrained widths, each record becomes a two-line layout with stable groups rather than waiting until phone width.
2. **Keep priority information on line one.** Student, branch, key item/event/grading detail, status, and amount stay immediately visible.
3. **Move supporting information to line two when needed.** Dates, proof, invoice, result/remarks, variants, collection state, documents, and row actions flow below in a labelled, readable order appropriate to each tab.
4. **Preserve every existing control.** Editing, verification/rejection, proof preview, invoice opening, refunds, certificates, registration/collection controls, and deletion requests remain available and keep their existing permissions.
5. **Handle the competition list's extra density.** Replace its fixed desktop/mobile split with the same width-aware presentation, while preserving competition/reporting dates, court, category, Poomsae, certificates, grading cards, photos, proof and documents.
6. **Keep specialised grading content attached.** Morley score entry remains directly below its student and participates cleanly in the responsive row grouping.

## Technical approach
- Extend the shared `.access-list-table` presentation with a container-aware compact/two-line mode so behavior follows the list's actual available width, not only the device width.
- Add consistent field/group markers to the five list renderers and set sensible minimum widths for controls that must not collapse.
- Remove unnecessary horizontal-scroll dependence at constrained widths, while retaining a conventional aligned table where the full row genuinely fits.
- Treat “Events” as the existing Seminars tab and its event bookings; no tab names or data behavior will change.

## Verification
- Check all five tabs at wide desktop, the current preview width, tablet, and phone sizes.
- Test long student names, long event/item descriptions, status badges, proof thumbnails, invoice links, and full action sets.
- Confirm no text or controls overlap, each row stays associated with its second line, and all existing dialogs/actions still open correctly.
- Run the project type check and confirm the latest preview build has no errors.
