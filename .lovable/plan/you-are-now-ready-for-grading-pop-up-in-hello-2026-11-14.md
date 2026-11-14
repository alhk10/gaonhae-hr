# "You are now ready for grading" pop-up in /hello

## What changes
- When a recognised student logs in to /hello and staff have ticked Ready for grading, a pop-up appears:
  - **Title:** "Good work! You are now ready for Grading." (no other text)
  - **Register & pay for grading:** opens the existing grading registration and payment flow (slot choice, payment proof).
  - **Later:** closes the pop-up. It returns on the next login until grading is paid.
- **When it shows:** the pop-up follows the same rule as the grading button. It shows only when the student is ready, grading isn't paid yet, and term fees are paid (at least 50% of the term, any weeks for a late joiner, or a staff override). Once grading is paid it no longer shows.
- **Order with other pop-ups:** the outstanding-invoice pop-up comes first. The grading pop-up comes next, then the progress card pop-up.
- The "Gradings" option in the /hello menu stays as it is.

## Technical details
- `PublicHelloChat.tsx` gets a `showGradingReadyPopup` value:
  - It is true when `stage === 'matched'`, `showGradingOption` is true, the outstanding-invoice pop-up is not showing, and the pop-up hasn't been dismissed in this session (tracked per student id).
- A new Dialog sits next to the existing pop-ups. Its button calls the existing `startGradingFlow()`.
- `showCardPopup` also waits until the grading pop-up is closed.
