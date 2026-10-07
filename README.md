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
| `_headers` | The same headers for Netlify |
| `netlify.toml`, `netlify/functions/news.mjs` | Netlify settings and the compliance news function (`/api/news`) |
| `archive/` | Earlier design iterations (v15–v25) — not deployed |
| `brand-source/` | Original logo files — not deployed |

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages). On Vercel: import the repo, framework preset "Other", no build command, output directory `.`.

## Contact form

The enquiry form and the calendar download both post to FormSubmit (`abhiraj@hrterrain.com`). **The first submission from the live domain sends an activation email to that inbox — click the link in it once**, or enquiries will not be delivered.

## Keeping content current

- The hero "route" card dates itself from the visitor's clock; the deadlines are defined in the `#routeList` markup (`data-day`).
- The compliance calendar (`#resources`) carries a "Last reviewed" date — update it whenever the dates are rechecked.

## Compliance calendar download

The calendar panel builds a Word document in the visitor's browser: `assets/calendar-doc.js` holds the deadline rules and document layout, and `assets/docx.min.js` (the `docx` library, v9) loads only when someone clicks Download. Update the deadline rules in `calendar-doc.js` when statutory dates change.

## Compliance news

The news section loads `/api/news`, a Netlify function (`netlify/functions/news.mjs`). It reads Google News RSS for each topic (EPF, ESI, labour codes, wages, payroll tax, professional tax, state rules, POSH, apprenticeships), keeps only headlines that mention the topic, balances topics, and returns the latest 12. Netlify caches the result for 6 hours, so the feeds are fetched a few times a day at most.

It needs no API keys and no AI service, and runs within Netlify's free tier. To change topics, edit the `TOPICS` list in `news.mjs`. If the function is unavailable, the page shows links to the official EPFO, ESIC and Ministry of Labour sources instead.

## Calendar download leads

Before the Word calendar downloads, the visitor enters name, company, work email and phone. These go to FormSubmit (`abhiraj@hrterrain.com`) with the states and obligations they picked. If sending fails, the download still happens.

## Deploying and moving to another account

Netlify Drop (drag and drop) does **not** deploy functions, so use the Netlify CLI or connect a Git repository:

```sh
npx netlify-cli login
npx netlify-cli deploy --prod --dir . --functions netlify/functions
```

To move the site to the client's Netlify account: log in with their account, run the deploy command above from this folder (it offers to create a new site), then point hrterrain.com at that site in Netlify's domain settings. Nothing in the site depends on this machine or on Claude.
