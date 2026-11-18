# Registered Competitors PDF: Competition Attire section and logo

The Gaonhae logo goes in the top right corner of the first page, beside the title. It's the same logo used on the /perthcomp page.

After the last competitor group, add a **Competition Attire** heading followed by these points:

- Full Taekwondo uniform with the colour belt matching the event.
- No undershirt for males. Plain white T-shirt under the uniform for females.
- No accessories, including hair pins, watches, bracelets, necklaces and earrings. Non-jewellery ear studs are allowed.
- Long hair must be tied in a single ponytail or bun.

If there isn't enough room left on the last page, the section starts on a new page. The page numbers ("Page X of Y") still include it. The /perthcomp page and the other PDFs don't change.

I read "Not jewellery ear studs allowed" as "non-jewellery ear studs are allowed". Tell me if you meant something else.

## Technical
- `src/pages/public/PublicPerthComp.tsx` `downloadCompetitorsPdf`: after the `COMP_EVENTS.forEach` loop and before the page-number pass, add a bold heading and `splitTextToSize` bullets, with a page break when `y` is close to the bottom.
- Logo: load `/lovable-uploads/gaonhae-logo-transparent.png` (the image the confirmation PDF already uses) and `addImage` it top-right on page 1, keeping its aspect ratio.
