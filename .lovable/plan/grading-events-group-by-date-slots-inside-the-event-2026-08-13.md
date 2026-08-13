# Grading Events: group by date, slots inside the event

Today the Grading Events dialog lists every grading slot as its own "event", so one grading day at Balmoral shows up as six or seven separate rows. This changes the dialog so a **date is the event**, and the individual times ("slots") live inside it.

## New structure

```text
Events (left)                     Event editor (right)
  28/06/2026 · Balmoral           Date, Host branch, Title, Location
    7 slots · 56 registered       ------------------------------------
  05/07/2026 · Morley             Slots
    1 slot                          10:00–10:30  Stage 1-3      [edit][dup][del]
                                    10:30–11:00  Stage 4-10     [edit][dup][del]
                                    + Add slot
```

- **Left list**: one row per grading date (grouped, newest first), showing the branch(es), number of slots and total registrations. Edit / duplicate / delete act on the whole event.
- **Right panel — Event details**: date, host branch, title, location. Saving these applies to every slot in the group.
- **Right panel — Slots**: inline editable rows within the event. Each slot keeps its own start/end time, title, belt levels, grading products, min/max age and "available to branches" list.
- **Add slot** creates a new slot pre-filled with the event's date, branch and location.
- **Duplicate event** clones all slots of that date into a new unsaved event (date cleared, as today).
- **Delete event** removes all its slots, and is blocked if any slot has registrations (with a message naming the count).
- Slots are sorted by start time; events sorted by date.

## Technical notes

- No schema change. `grading_slots` rows remain the unit of storage; grouping is done client-side in `GradingEventsSettingsDialog.tsx` by `grading_date` (+ `branch_id`), using the existing `admin_list_grading_slots` RPC.
- Saving an event issues one `admin_upsert_grading_slot` call per slot (shared event fields merged in); deleting an event issues `admin_delete_grading_slot` per slot after the registration check.
- The public grading list, eligibility filtering and registration flow read `grading_slots` directly and are unaffected.
