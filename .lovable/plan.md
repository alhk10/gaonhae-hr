# Fix the `/hello` branch selector on phones

## Confirmed behavior
- The database currently returns eight valid school branches for `/hello`: Balmoral, Bukit Merah, Carpe Diem Jurong West, Carpe Diem Stradia, Jurong West, Kembangan, Morley, and Yishun.
- The browser test can open the custom branch menu and sees all eight options.
- The screenshot shows the custom popup collapsing into a thin blank strip on the Android browser, so the data is present but the phone is not rendering that popup reliably.

## Change
1. Replace only the Branch field on the `/hello` identification form with a mobile-safe native selector, while retaining the same styling, required validation, branch IDs, and displayed names.
2. Show a disabled “Loading branches…” option while the branch request is running, and a clear retry message if it fails instead of an empty menu.
3. Keep Centralised Grading excluded and keep every other `/hello` field and workflow unchanged.

## Verification
- Open `/hello` at phone and desktop sizes and confirm all eight branches are visible and selectable.
- Select a branch and confirm the existing Continue flow receives its ID.
- Check loading and request-error states, then typecheck and review the latest build result.
