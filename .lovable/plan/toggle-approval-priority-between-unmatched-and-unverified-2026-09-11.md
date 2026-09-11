# Toggle approval priority between unmatched and unverified

Replace **Action first** with one control that switches the sorting priority between **Unmatched first** and **Unverified first** across Grading, Competitions, Seminars/Events, and Uniforms & Guards.

## Changes

1. Keep every outstanding submission visible; the new control changes ordering rather than filtering rows.
2. Default to **Unmatched first**. Each click switches between:
   - **Unmatched first** — submissions without a linked student appear first.
   - **Unverified first** — submissions whose payment is not verified or paid appear first.
3. Use the other action state as the secondary sort key, followed by the existing **Newest first / Oldest first** date order.
4. Expand Competition and Seminar/Event approval loading to include verified submissions that have not yet been imported, so both priority modes operate on all outstanding submissions.
5. Expand the Uniforms & Guards approval section to include matched orders that are still outstanding, while excluding rejected, cancelled, and already-invoiced orders. Keep invoice creation gated by verified payment.
6. Update headings, counts, button labels, tooltips, and empty handling where needed so they no longer describe the Guards list as unmatched-only.

## Technical details

- Replace the boolean `actionFirst` state with a shared priority mode such as `'unmatched' | 'unverified'`.
- Update the shared sorting helper to accept separate `isUnmatched` and `isUnverified` checks and sort by selected priority, secondary priority, then `created_at`.
- Treat Guards `verified` and `paid` as verified; use `status === 'verified'` for the other three approval types.
- Preserve automatic matching, automatic import, manual actions, and the independent date-order toggle.
- Verify all four approval lists in both priority modes and both date directions, including matched-but-unverified and verified-but-unmatched rows.
