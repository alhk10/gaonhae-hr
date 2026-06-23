## Root cause
Abby Chan's row genuinely required a grading card (Green belt, event `2a908cde…` has `require_grading_card=true`, `grading_card_urls=[]`) but was verified at 2026-06-23 23:12:16 UTC. The client check was bypassed — most likely the browser had a stale `public-competition-list` cache from before the deploy, so `require_grading_card` was `undefined` on that row and the verify call went straight through. We need server-side enforcement, not just UI gating.

## Fix

1. **Reverse the bad verification** (data update): set submission `1d218f60-1159-429d-9a43-fa6e1ef93a22` (ABBY CHAN) back to `status='pending_verification'`, clear `reviewed_at` and `reviewed_by`, bump `updated_at`.

2. **Server-side guard** — replace `admin_verify_competition_submission(p_id uuid, p_verified_by text)`:
   - Load the submission joined with `competition_events`.
   - If `ev.require_grading_card = true` AND `cps.current_belt` ∈ {Foundation 1/2/3, Foundation, White, Yellow Tip, Yellow, Green Tip, Green, Blue Tip, Blue, Red Tip, Red, Black Tip} AND `COALESCE(array_length(cps.grading_card_urls,1),0) = 0` → `RAISE EXCEPTION 'Grading card required before verification'`.
   - Otherwise proceed with the existing `UPDATE … SET status='verified'`.

This guarantees verification can't succeed without the card, even from a stale client.

## Out of scope
No UI changes — the existing inline icon + verify-gate dialog already handles the happy path; the new server check just catches stale-cache/back-door attempts and the error surfaces via the existing `toast.error` in `handleVerify`.
