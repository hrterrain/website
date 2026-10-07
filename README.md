# HR Terrain — hrterrain.com

Marketing site for HR Terrain (HR operations, payroll and statutory compliance). Static HTML, no build step.

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | The site (single page, inline CSS/JS) |
| `legal.html` | Privacy policy, terms of use, disclaimer |
| `404.html` | Not-found page |
| `assets/` | Logos, favicons, share image |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | SEO / browser metadata |
| `vercel.json` | Security + cache headers for Vercel |
| `api/news.mjs` | The compliance news function (`/api/news`, a Vercel Function) |
| `archive/` | Earlier design iterations (v15–v25) — not deployed |
| `brand-source/` | Original logo files — not deployed |

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

Hosted on Vercel, connected to `github.com/hrterrain/website`. Every push to `main` deploys to production; every other branch gets a preview URL. Project settings: framework preset "Other", no build command, output directory `.` (Vercel picks up `api/` as functions on its own).

The news function `api/news.mjs` is skipped by `python3 -m http.server`; run `npx vercel dev` to try it locally.

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
