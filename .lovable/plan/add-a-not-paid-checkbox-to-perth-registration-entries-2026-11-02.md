# Add a "Not paid" checkbox to Perth registration entries

## What changes
- **Add / Edit entry dialog:** a new **Not paid** checkbox below Payment proof.
  - When ticked, the entry saves without payment proof and is marked unpaid. This suits club collation entries billed later.
  - When unticked, the current behaviour stays: proof is uploaded or kept.
- **Registration log rows:** unpaid entries show a red **Not paid** badge in place of the proof status.
- **Staff Competition and Seminar Log PDFs:** a Paid column shows Yes or No.
- Uploading proof later automatically clears **Not paid**.

## Technical details
- Migration: add `is_unpaid boolean not null default false` to `perth_event_registrations`.
- Update the password-checked `admin_perth_upsert_registration` to accept `p_is_unpaid`. Skip the proof requirement when it is true.
- Update `admin_perth_set_proof` to set `is_unpaid = false`.
- UI changes in `PublicPerthComp.tsx`: checkbox state, badge, and PDF column.
