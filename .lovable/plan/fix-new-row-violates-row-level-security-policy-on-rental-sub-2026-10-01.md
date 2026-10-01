# Fix "new row violates row-level security policy" on /rental submit

## Cause (confirmed)
The rental form uploads the payment screenshot, ID document and liability certificate with "overwrite if exists" turned on. File storage treats overwrite as needing read + update permission, and public visitors deliberately have no read/update access to the `studio-rental/` folder (these are private ID documents). Plain uploads are allowed, so only the overwrite option fails.

## Fix
- Upload rental files without overwrite, using a unique file name per attempt (booking reference + file type + short random suffix), so retries after a failed submit never collide.
- Keep the documents private: no new public read permission is added. Staff continue opening them through the existing signed links.
- Show a clearer error message if an upload fails ("Could not upload your file, please try again").

## Verify
- Submit a test booking on /rental with screenshot, ID and liability certificate; confirm it succeeds and appears in /access Studio Rental with working document links.

## Technical details
- `src/services/studioRentalService.ts`: in `submitRental` and `uploadRentalFile`, set `upsert: false` and append `-${crypto.randomUUID().slice(0,8)}` to paths under `studio-rental/`.
- No database or storage policy changes.
