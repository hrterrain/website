# HR Terrain — hrterrain.com

Marketing site for HR Terrain (HR operations, payroll and statutory compliance). Static HTML, no build step. Hosted on Hostinger.

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | The site (single page, inline CSS/JS) |
| `legal.html` | Privacy policy, terms of use, disclaimer |
| `404.html` | Not-found page |
| `assets/` | Logos, favicons, share image |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | SEO / browser metadata |
| `.htaccess` | Headers, caching, redirects and hidden folders for Hostinger |
| `vercel.json` | The same for Vercel |
| `api/news.php` | The compliance news feed (`/api/news`) on Hostinger |
| `api/news.mjs` | The same feed as a Vercel Function |
| `archive/` | Earlier design iterations (v15–v25) — not deployed |
| `brand-source/` | Original logo files — not deployed |

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

**Hostinger (production).** hPanel → Websites → hrterrain.com → Advanced → **Git**: repository `https://github.com/hrterrain/website`, branch `main`, install path left empty (`public_html`, which must be empty the first time). The repo is public, so no deploy key is needed. Turn on **Auto deployment** and add the webhook URL hPanel gives you under GitHub → Settings → Webhooks, so every push to `main` goes live.

- `.htaccess` does what `vercel.json` did on Vercel: security headers, asset caching, the 404 page, https and no-www redirects, and it hides folders that are in the repo but not the site (`archive/`, `brand-source/`, `supabase/`, `.git`).
- `/api/news` is served by `api/news.php` (PHP 8+, needs cURL; both are on by default). It caches the result in `.cache/news.json` for 6 hours.
- In hPanel → Security → SSL, make sure the free SSL certificate is active before the https redirect matters.

**Vercel (previews).** The Vercel project still builds every push and uses `api/news.mjs` + `vercel.json`. `.vercelignore` keeps the Hostinger files out of it. If both stay, keep the two news files in step when editing topics or filters.

The news endpoint is skipped by `python3 -m http.server`; run `php -S localhost:8000` and open `/api/news.php` to try the Hostinger version locally.

## Contact form

The enquiry form and the calendar download both post to FormSubmit (`abhiraj@hrterrain.com`). **The first submission from the live domain sends an activation email to that inbox — click the link in it once**, or enquiries will not be delivered.

## Keeping content current

- The deadline countdown, applicability checker and calendar download all read state Professional Tax and Labour Welfare Fund dates from the `STATES` table in `assets/calendar-doc.js`.
- The compliance calendar (`#resources`) carries a "Last reviewed" date — update it whenever the dates are rechecked.

## Compliance calendar download

The calendar panel builds a Word document in the visitor's browser: `assets/calendar-doc.js` holds the deadline rules and document layout, and `assets/docx.min.js` (the `docx` library, v9) loads only when someone clicks Download. Update the deadline rules in `calendar-doc.js` when statutory dates change.

## Compliance news

The news section loads `/api/news`, a Vercel Function (`api/news.mjs`). It reads Google News RSS for each topic (EPF, ESI, labour codes, wages, payroll tax, professional tax, state rules, POSH, apprenticeships), keeps only headlines that mention the topic, balances topics, and returns the latest 12. Vercel's CDN caches the result for 6 hours, so the feeds are fetched a few times a day at most.

It needs no API keys and no AI service, and runs within Vercel's free tier. To change topics, edit the `TOPICS` list in `news.mjs`. If the function is unavailable, the page shows links to the official EPFO, ESIC and Ministry of Labour sources instead.

## Calendar download leads

Before the Word calendar downloads, the visitor enters name, company, work email and phone. These go to FormSubmit (`abhiraj@hrterrain.com`) with the states and obligations they picked. If sending fails, the download still happens.

## Accounts

The GitHub repo, the Vercel project and the Supabase project all belong to HR Terrain. Nothing in the site depends on a developer's machine or on Claude. Keep keys out of the repo: put them in Vercel → Project → Settings → Environment Variables.
