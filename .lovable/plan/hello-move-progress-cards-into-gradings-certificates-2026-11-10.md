# /hello: move progress cards into Gradings & certificates

- Remove the separate "Progress cards" box from the /hello menu.
- Inside the "Gradings & certificates" window, add a "Progress cards" section listing each term's card with a "New" tag for unopened ones; tapping opens the PDF and marks it viewed.
- Move the "Gradings & certificates" button to sit directly below "Update Personal Information".
- The new-card sign-in pop-up stays as is.

## Technical details
- `HelloCertificatesDialog.tsx`: accept `progressCards` and `onOpenCard` props and render the list.
- `PublicHelloChat.tsx`: delete the inline block, relocate the button after the Update Personal Information button, pass cards + `openCard` to the dialog.
