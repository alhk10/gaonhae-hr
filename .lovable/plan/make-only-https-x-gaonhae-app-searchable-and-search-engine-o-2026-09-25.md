# Make only https://x.gaonhae.app searchable and search-engine optimised

## Status: code changes complete — domain and publish steps remain

## Done (in code, live after next publish)

1. **Point search engines at x.gaonhae.app (index.html)**
   - `<link rel="canonical" href="https://x.gaonhae.app/" />` and `og:url` set, so every page names the subdomain as the one true address.

2. **Hide every other address from Google (index.html)**
   - An inline script in `<head>` checks the site's address. If it is **not** x.gaonhae.app, it adds a "noindex" tag telling search engines not to list the page. On x.gaonhae.app nothing is added, so the real site stays fully searchable.

3. **Basic search optimisation (index.html + public/)**
   - Real title "Gaonhae Taekwondo" and a proper description (already set).
   - `public/sitemap.xml` lists the public pages (/, /hello, /register, /grading, /fees, /comps, /seminars, /guards) on https://x.gaonhae.app.
   - `public/robots.txt` allows crawling and adds `Sitemap: https://x.gaonhae.app/sitemap.xml`.

## Domain status (checked just now)

- **x.gaonhae.app is already connected** — DNS verified, A record correct, SSL certificate being issued (status: setting up, should finish on its own).
- One issue found: it currently **redirects to gaonhae.app**, because gaonhae.app is set as the Primary domain. If that stays, visitors to x.gaonhae.app get sent to gaonhae.app and Google will index gaonhae.app instead — the opposite of what you want.

## What remains (your actions, outside the code)

1. **Set x.gaonhae.app as the Primary domain**: Project Settings → Domains → x.gaonhae.app → three-dot menu → Set as primary. Then gaonhae.app and gaonhae.lovable.app redirect to x.gaonhae.app, which reinforces it as the one true address. (You're already in the Domains section — it's the ⋯ menu on the x.gaonhae.app row.)
2. **Publish** the project so the SEO changes go live.
3. In **Google Search Console**, verify the x.gaonhae.app property and submit the sitemap (https://x.gaonhae.app/sitemap.xml). Any gaonhae.app or lovable.app pages already in Google drop out after re-crawl (days to a few weeks).

## Notes

- This app is a single-page app, so search engines see one shared title/description for all pages. Per-page search listings would need the newer server-rendered template — say the word if you ever want that upgrade.
