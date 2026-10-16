# New Poom/Dan grading certificate design

A slick, modern A4 portrait certificate. It is used for every grading that reaches Poom or Dan rank: Black Tip to 1st Poom or 1st Dan, and every rank above that (2nd Poom, 2nd Dan, 3rd Dan, and so on). All other belts keep the current certificate.

## Look
- Clean white page with a thin, light grey inner frame and generous margins.
- **Background:** soft, very faint grey martial-art silhouettes (kicks, poomsae stances, a jumping kick). They are spread across the page, sit behind all text, and stay light enough that names remain crisp.
- **Top:** the Gaonhae logo in the centre. Small, neat flags sit in the corners: the Korean flag on the left and the branch's country flag on the right (Singapore or Australia).
- **Title:** a large "CERTIFICATE" with a smaller, letter-spaced "OF ACHIEVEMENT" underneath and a short accent line in Gaonhae red and blue.
- **Body:**
  - "This certificate is awarded to"
  - the student's name, large, on up to two lines if it is long
  - "who has successfully achieved"
  - the rank, e.g. "1st Dan" or "2nd Poom", with a proper raised "st"
  - the grading date
- **Left side:** a tall, faint vertical "태권도" in grey, as in the current design but softer.
- **Footer:** the headmaster's signature with "Kang Hyeonman · Headmaster" and a signature line. The World Taekwondo and Kukkiwon logos sit side by side beneath it.

## Where it appears
- Rule: the new design prints when the rank achieved is any Poom or Dan, starting from Black Tip to 1st Poom/1st Dan. Gradings that end below 1st Poom/1st Dan, including reaching Black Tip, keep the current certificate.
- Single and "Print all" certificate downloads, wherever certificates are printed today.
- A Double pass still prints two certificates. If only the second of the two ranks is Poom/Dan, that certificate alone uses the new design.
- Scorecard pages are unchanged.

## Check
- Create sample certificates for a short name and a long two-line name, as 1st Dan and 2nd Poom, for both Singapore and Australia. Check them by eye for overlaps and contrast.
- Test the rule: 1st Poom, 1st Dan and 3rd Dan get the new design. Black Tip and Red get the current one.

## Technical details
- Generate the background silhouettes once as a light-grey image on white (AI image) at `src/assets/certificates/poom-dan-bg.jpg`, plus small Korean, Singapore and Australia flag images.
- Render the vertical 태권도 as an image, because the PDF fonts can't draw Korean characters.
- Add `isPoomDanRank(belt)` (it matches "Poom" or "Dan" in the rank achieved) and `drawPoomDanCertificatePage` in `gradingCertificatePDFGenerator.ts`. Each certificate page chooses its design with `isPoomDanRank`. Add a small test for the rule.
