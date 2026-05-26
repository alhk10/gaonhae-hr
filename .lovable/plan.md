## Hide Coaching Fee & Event Categories until DOB + Belt entered

In `src/pages/public/PublicCompetitionPayment.tsx`, gate the Coaching Fee block (line 402), Event Categories block (line 422), and the Subtotal/GST/Total summary (line 446) on `dob && currentBelt` being truthy.

Implementation: change the existing render conditions to also require `dob && currentBelt`:
- `{dob && currentBelt && coachingProduct && (...)}`
- `{dob && currentBelt && categoryProducts.length > 0 && (...)}`
- `{dob && currentBelt && (coachingProduct || selectedCategoryIds.length > 0) && (...)}`

No state, validation, or backend changes — purely conditional rendering.
