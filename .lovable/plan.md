# /hello: hide class buttons when branch has no classes

- Hide "Pay Term Fees" when the student's branch has no active class fee items available in /hello.
- Hide "Schedule / Reschedule a lesson" for the same branches (it relies on those classes).
- Both stay visible while the check is loading or if it fails, so branches with classes are never blocked.

## Technical details
- Extend the existing `hello-shop-availability` query in `PublicHelloChat.tsx` to also fetch `getChatProducts(branchId, SCHOOL_FEES_CATEGORY_ID, ...)`; flag `classes = list.length > 0`.
- Wrap both buttons with `shopAvailability?.[SCHOOL_FEES_CATEGORY_ID] !== false`.
