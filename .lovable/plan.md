## Logo proportion + transparency fix

**`src/pages/public/PublicGradingPayment.tsx`:**
- Change logo `<img>` from `h-16 w-16` (forced square, distorts the wide logo) to `h-[67px] w-auto` (~5% bigger than 64px, natural aspect ratio).
- Swap `src` to a new transparent-background version of the logo at `/lovable-uploads/gaonhae-logo-transparent.png`.

**Asset prep:**
- Use `imagegen--edit_image` on the existing `/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png` with `transparent_background: true` to strip the white square and save as `public/lovable-uploads/gaonhae-logo-transparent.png`.

No other pages touched.