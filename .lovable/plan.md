# Enable ordering and relocate notifications in /hello

## Changes

- Enable **Order Uniforms and Apparel** and **Order Protection Guards and Accessories** on the recognised-student menu. Remove their “Coming soon” badges and show the same arrow as other active options.
- Each option opens its corresponding category in the existing product-selection and payment journey, using the recognised student and selected branch.
- Keep existing product choices, required sizes/colours/gender options, branch pricing, GST, credit-first payment and payment-proof scanning unchanged.
- Remove **Turn On / Turn Off Notifications** from the main menu and place it inside **Update Personal Information**, below the photo/certificate fields and above **Save changes**. Notification changes take effect independently of saving personal details.
- Leave the home-screen installation prompt and the disabled lesson scheduling option unchanged.

## Technical details

- Update the menu and `personal_info` section in `src/pages/public/PublicHelloChat.tsx`.
- Reuse `HelloNotificationButton` with the existing recognised-student/session checks; do not change notification permissions or storage.
- Reuse `getChatProducts`, `ProductRow` and the current submission flow rather than introducing a separate checkout. No database or business-rule changes are planned.

## Verification

- Check that both ordering buttons open the correct category, required options are enforced, and Back navigation does not carry selections into another category.
- Exercise each category through payment review and confirm the existing credit and proof-upload controls remain available.
- Verify notifications appear only inside personal information, retain their saved on/off state, and do not submit unsaved profile changes.
- Check narrow and wide layouts and confirm the page compiles without errors. Verify submission and invoice read-back with an authorised test student where available, without creating unwanted real orders.