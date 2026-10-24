# Remove lesson counts from /hello welcome

Remove the three boxes (Unbooked (term), Attended (mo), Missed (mo)) shown under "Welcome back ... I found your record" in /hello. The welcome text and belt stay; nothing else changes.

## Technical details
- `src/pages/public/PublicHelloChat.tsx` ~L1720-1740: delete the stats grid block only.
