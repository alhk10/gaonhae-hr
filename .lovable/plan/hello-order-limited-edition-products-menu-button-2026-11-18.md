# /hello: "Order Limited Edition Products" menu button

1. Add an **Order Limited Edition Products** button directly under **Pay Term Fees** on the student's /hello menu.
2. Tapping it opens the same Limited Edition list (full-width images, zoom, GST-inclusive price, Order), even if the family already pressed Later on the popup.
3. The button only appears when at least one limited edition product is available for the student's branch today. Otherwise it is hidden.

## Technical
- Share the product query (`limitedEditionService` public list, same queryKey as `LimitedEditionPopup`) in `PublicHelloChat.tsx` to decide visibility.
- Add an optional `forceOpen`/`onClose` prop to `LimitedEditionPopup` so the menu button reopens the list popup.
- Verify with Playwright at phone and desktop widths using a matched student.
