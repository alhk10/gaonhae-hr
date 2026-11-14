# Show only local branches based on visitor location

## What changes
- On the /hello sign-in form, the Branch list shows only branches in the visitor's country:
  - Visitors in Singapore see only the Singapore branches.
  - Visitors in Australia see only the Perth branches (Morley, Greenwood, Floreat, Yokine).
- **Fallbacks:**
  - If the location can't be worked out, all branches show.
  - If the visitor is in another country, all branches also show.
- **"Show all branches" link:** a small link under the list brings back every branch, for families on holiday or behind a VPN.
- The same filter applies to the public Registration (/register) and Studio Rental (/rental) branch pickers.

## Technical details
- New `src/utils/visitorCountry.ts` works out the visitor's country:
  - It asks a free location service (ipapi.co, country only) with a 2-second limit.
  - It falls back to the browser timezone: Asia/Singapore means Singapore, and Australia/Perth or other Australia timezones mean Australia.
  - The result is saved for the browser session.
- It returns `'singapore' | 'australia' | null`, which is compared with `branches.country`.
- No data or database changes.
