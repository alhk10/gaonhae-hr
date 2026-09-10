# Grey out "Coming Soon" actions on /hello

## Goal
On the `/hello` returning-student chat, disable upcoming features and mark them as "Coming soon".

## Changes (all in `src/pages/public/PublicHelloChat.tsx`)

### Main action menu
- **Schedule / Reschedule a lesson** → greyed out (disabled), with a "Coming soon" note.
- **Register for grading** → greyed out (disabled), "Coming soon".
- **Order Uniforms and Apparel** → greyed out (disabled), "Coming soon".
- **Order Protection Guards and Accessories** → greyed out (disabled), "Coming soon".
- **Pay Term Fees** and **View Past Invoices** stay active.

### School Fees step
- **Add / confirm schedule** button → greyed out (disabled) with a "Coming soon" note. **Skip to payment** stays active.

### Styling
- Disabled buttons: `opacity-60`, `cursor-not-allowed`, muted text, no hover/click.
- "Coming soon" shown as a small amber/grey badge or caption next to the label.

## Technical details
- Wrap each disabled button with a disabled state + a small `Coming soon` Badge; prevent the click handler from firing.
- No backend or data changes.
- Verify: click-through check on `/hello` that disabled items don't navigate, and the active items still work.
