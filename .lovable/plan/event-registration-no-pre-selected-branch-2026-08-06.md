# Event Registration: no pre-selected branch

## What changes

On the public Event Registration page (`/seminars`), the Branch field starts empty showing the "Select branch" placeholder instead of defaulting to Bukit Merah. The user must pick a branch before belt, event, packages and payment options load.

Downstream behaviour already handles an empty branch (belt select is disabled, event list and payment options are gated), so nothing else needs to change.

## Technical detail

- `src/pages/public/PublicSeminarPayment.tsx`: change `useState<string>('bukit-merah')` for `branchId` to `useState<string>('')`.
