The data is no longer blank in the RPC: Charles, Dayen, Vihaan, Saisha, and Tien Yu Wong now return `amount` and `proof_url` on their `registration` rows.

The remaining issue is frontend-only: `/grading-list` currently displays amount/proof only when `row.source === 'submission'`, so imported `registration` rows still render `—` even though the data is present.

Plan:

- Update `src/pages/public/PublicGradingList.tsx` in the grading table.
- Change the Amount cell to show `$xx.xx` whenever `r.amount != null`, regardless of `source`.
- Change the Proof cell to show the proof image/lightbox whenever `r.proof_url` exists, regardless of `source`.
- Keep verify/reject buttons restricted to pending `submission` rows only, so imported registrations cannot be accidentally verified/rejected again.

Expected result:

- Charles, Dayen, Vihaan, Saisha, and Tien Yu Wong show their payment amount and proof on the remaining registration row.
- Duplicate imported submission rows stay hidden.
- Manual registrations without payment submissions continue to show `—`.