# Hide "Register for Competition" when no event is open

On the /hello menu after a student is recognised, the **Register for Competition** button only appears when at least one competition is open: active, and its registration deadline has not passed. This uses the same rule the competition form uses to list events.

## Technical details
- In `src/pages/public/PublicHelloChat.tsx`, fetch the open events with `useQuery(['public-competition-events'], getPublicCompetitionEvents)`, the same query key the form uses, so the cache is shared.
- Compute `hasOpenCompetition = events.some(e => e.is_active && !isPastDeadline(e.registration_deadline))`.
- Render the button only when `hasOpenCompetition` is true, so it stays hidden while events load or when none are open.
