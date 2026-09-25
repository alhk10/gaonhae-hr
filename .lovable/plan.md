# Make only gaonhae.app searchable on Google

## Goal

Google should index **gaonhae.app** only. The Lovable URLs (gaonhae.lovable.app and the id-preview URL) should not appear in search results.

## What changes

1. **Tell Google the real address (index.html)**
   - Add `<link rel="canonical" href="https://gaonhae.app/" />` and `<meta property="og:url" content="https://gaonhae.app/" />` so every page points Google at the custom domain as the one true address.

2. **Hide the Lovable URLs from Google (index.html)**
   - Add a small inline script in `<head>` that checks the site's address. If it is **not** gaonhae.app (i.e. any lovable.app preview or published URL), it adds a "noindex" tag telling Google not to list that page. On gaonhae.app nothing is added, so the real site stays fully searchable.
   - This is the reliable way to do it: one build serves all addresses, and `robots.txt` alone can't differ per address (and blocking crawling via robots.txt would actually prevent Google from ever seeing the noindex tag).

3. **Leave `public/robots.txt` as is** — it already allows crawling, which is what gaonhae.app needs.

## What you'll need to do (one-time, outside the app)

- In **Google Search Console**, add/verify the `gaonhae.app` property and use **Removals** or just wait: any lovable.app pages already in Google will drop out after Google re-crawls them and sees the noindex tag (typically days to a few weeks). I can't speed up Google's recrawl from the code side.

## Notes

- The change shows on the live site only after the next **publish**.
- If you ever want the whole site hidden from Google instead, that's a one-line change — just ask.
