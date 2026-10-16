# Poom/Dan certificates: simpler look, higher ranks, Print all for every belt

## 1. Simpler design
- Remove the Korean and country flags from the top corners. The Gaonhae logo stays centred.
- Remove the faint vertical "태권도" lettering.
- Everything else stays the same: silhouette background, title, name, rank, date, signature and affiliation logos.

## 2. Ranks covered by the new design
| Grading | Printed rank |
|---|---|
| Black Tip to 1st | 1st Poom or 1st Dan |
| 1st to 2nd | 2nd Poom or 2nd Dan |
| 2nd to 3rd | 3rd Poom or 3rd Dan |
| 3rd to 4th | 4th Poom or 4th Dan |

- Every other belt keeps the current certificate.
- A Double pass prints two certificates, one for each rank reached.

## 3. Poom or Dan comes from the grading payment
- The certificate reads the grading fee the student paid for that grading (e.g. "Black Tip >> 1st Dan" or "1st Poom >> 2nd Poom").
  - If the fee names Dan, the certificate says Dan.
  - If it names Poom, the certificate says Poom.
- If there's no linked payment, or the fee doesn't say, it falls back to the student's current rank (Poom stays Poom, Dan stays Dan).
- A Black Tip with no payment information prints "1st Poom / 1st Dan", so staff can see something needs checking.

## 4. Print all includes every belt
- "Print all" on the staff grading lists now includes Poom/Dan students as well as Foundation to Black Tip.
- The single certificate button works for every belt too.
- The usual rules still apply: only passed or Double results with a grading date are printed.

## Check
- Tests:
  - Black Tip with a Dan fee prints 1st Dan.
  - 1st Poom with a Poom fee prints 2nd Poom.
  - 3rd Dan prints 4th Dan.
  - A Red belt still gets the current certificate.
- Make sample certificates and check them by eye.

## Technical details
- Add an optional `rankAchieved` to `GradingCertificateInput`. Callers compute it with a new `resolvePoomDanRank(currentBelt, gradingProductName, steps)` in `poomDanCertificate.ts`. The product name comes from the linked grading `invoice_item_id` description or product name, loaded with the grading list.
- The rule in the generator is `isPoomDanRank(beltAchieved)`: Black Tip, or 1st to 3rd Poom/Dan as the starting belt.
- Remove the `isFoundationToBlackTip` print filters in `GradingListTab.tsx` and `BranchGradingList.tsx`, and the matching public grading list check.
- Delete the flag and 태권도 images.
