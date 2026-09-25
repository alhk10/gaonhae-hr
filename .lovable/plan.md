# Make only https://x.gaonhae.app searchable and search-engine optimised

## Goal

Google should index **https://x.gaonhae.app** only. Every other address serving this app — gaonhae.app, gaonhae.lovable.app, and the id-preview URL — should stay out of search results.

## What changes

1. **Point search engines at x.gaonhae.app (index.html)**
   - Add `<link rel="canonical" href="https://x.gaonhae.app/" />` and `<meta property="og:url" content="https://x.gaonhae.app/" />` so every page names the subdomain as the one true address.

2. **Hide every other address from Google (index.html)**
   - Add a small inline script in `<head>` that checks the site's address. If it is **not** x.gaonhae.app, it adds a "noindex" tag telling search engines not to list the page. On x.gaonhae.app nothing is added, so the real site stays fully searchable.
   - This is the reliable approach: one build serves all addresses, and `robots.txt` can't differ per address (blocking crawling there would also stop Google from ever seeing the noindex tag).

3. **Basic search optimisation (index.html + public/)**
   - Keep the real title "Gaonhae Taekwondo" and a proper description (already set).
   - Add `public/sitemap.xml` listing the public pages (/, /hello, /register) on https://x.gaonhae.app.
   - Update `public/robots.txt` to allow crawling and add `Sitemap: https://x.gaonhae.app/sitemap.xml`.

## What you'll need to do (one-time, outside the code)

- **Connect the subdomain**: x.gaonhae.app must be added as a custom domain (I can open the domain setup for you — it needs a DNS CNAME record at your domain provider).
- In **Google Search Console**, verify the x.gaonhae.app property and submit the sitemap. Any gaonhae.app or lovable.app pages already in Google drop out after re-crawl (days to a few weeks); I can't speed that up from the code side.

## Notes

- Changes reach the live site only after the next **publish**.
- This app is a single-page app, so search engines see one shared title/description for all pages. Per-page search listings would need the newer server-rendered template — say the word if you ever want that upgrade.
