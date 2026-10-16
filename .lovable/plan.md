# Registration deadline for competition events

## What changes
- **Competition Events editor** (/access): a new optional **Registration deadline** field next to Active, with a date (DD/MM/YYYY) and a time. Leaving it empty means no deadline.
- The events list shows the deadline under each event.
- **Switches to Inactive automatically**: once the deadline passes, the event's Active switch turns off by itself, within about 5 minutes. Staff can switch it back on, but it switches off again at the next check unless they clear or move the deadline.
- **Public /comps form and /hello competition step**: once its deadline passes, an event disappears from the choices straight away, even before the automatic switch-off. If no events are left, /hello hides the Register for Competition button, as it already does.
- **Server check**: a submission for an event after its deadline is refused with "Registration for this competition has closed". This stops anyone with the form already open from sending it late.
- Deadline time is read in the event branch's local time (Singapore UTC+8, Australia per branch). Staff can still import or edit submissions after the deadline.

## Technical details
- Migration: add the nullable `registration_deadline timestamptz` column to `competition_events`. Add a `p_registration_deadline` parameter to `admin_upsert_competition_event`. Filter out past deadlines in the public event list RPC, and check the deadline in the public submit RPC.
- Auto-inactive: a pg_cron job runs every 5 minutes: `update competition_events set is_active=false where is_active and registration_deadline <= now()`.
- `competitionPaymentSubmissionService.ts`: map the new field and pass it through.
- Event editor component: add date and time inputs using the project's date helpers, plus the list badge.
- `CompetitionRegistrationForm` / `PublicHelloChat`: also filter on the client, so an open page drops the event without needing a reload.
- Test: a small unit test for the "is past deadline" helper.
