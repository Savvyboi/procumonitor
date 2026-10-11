# Tilimyyrä — bringing Finnish public procurement to light

An independent, open-source procurement observatory built for GitHub Pages. React + Vite + TypeScript, with official data collected by GitHub Actions. No paid services or backend server.

## What works

- Live Hilma notices, planning notices, awards and closed/cancelled notices.
- Finnish, Swedish and English interfaces, with localized dates, numbers, categories and statuses. Official notice text stays in its original language.
- Persistent light/dark themes in forest green, brown, cream and blue-black, with a European mole (kontiainen) mascot.
- Accent-insensitive all-word, any-word and exact-phrase search across notice identifiers, titles, buyers, Business IDs, reported awardees, descriptions and CPV codes; field-specific search is available.
- Category directory and shortcuts based on official CPV classification.
- Region, category, status, exact buyer, buyer type, procedure, CPV-prefix, signal, publication-date, deadline-date and earlier-version filters.
- Separate estimate/award EUR ranges and reported/missing-value filters; ten sorting choices and adjustable page sizes. Search settings, sorting and language are shareable in URLs.
- Notice details, lot-level competition fields, official source links and shareable URLs.
- Buyer directory and cached PRH company enrichment where the register has coverage.
- Actual invoice spending, aggregated from the official Tutkihankintoja annual download.
- Local bookmarks, filtered CSV/JSON exports and regional/buyer-type RSS feeds.
- Static Pagefind full-text search for every imported notice, available at search.html.
- Compressed JSON, daily/monthly shards, safe CSV exports and a data manifest.

## Local development

Node.js 22 or later:

```sh
npm ci
npm run dev
```

The repository includes a real official-data snapshot. No API key is needed to browse or build it.

To refresh, set HILMA_API_KEY in the process environment, then run:

```sh
npm run ingest
node scripts/enrich-eforms.mjs
node scripts/ingest-spending.mjs
npm test
npm run build
npm run preview
```

Never put the key in a VITE_ variable, a committed file, or a browser request. The importer reads it from the environment and sends it only to api.hankintailmoitukset.fi. Raw API payloads and personal contact records are not retained.

## GitHub Pages

Repository: https://github.com/Savvyboi/procumonitor
Pages URL: https://savvyboi.github.io/procumonitor/

1. Store the Hilma subscription key as the repository Actions secret HILMA_API_KEY.
2. Select **GitHub Actions** under Settings → Pages → Build and deployment.
3. Push to main, or run **Refresh data and publish GitHub Pages** manually.

The workflow deploys on each main push. Every six hours it reads differential changes (with a two-day overlap), prunes notices published more than 180 days ago, refreshes company records, enriches a bounded batch of full eForms XML and commits snapshots. Invoice files refresh at most weekly. GitHub can delay scheduled runs and may disable inactive public-repository schedules after 60 days; inspect the Actions tab if freshness falls behind. Failures preserve the last deployed site.

The Pages base path comes from actions/configure-pages, so assets, exports, deep links and RSS feeds also work under a repository subpath.

## Official sources and coverage

**Hilma:** POST https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search.
Official documentation: https://github.com/Hankintailmoitukset/hilma-api/blob/master/endpoints/avpendpoints.md.
Search summaries contain core procurement and lot fields. Full eForms content uses a separate authenticated read product and is base64 XML, not JSON. The bounded XML enrichment worker fetches up to 200 full notices per run at https://api.hankintailmoitukset.fi/avp-eforms/external-read/v1/notice/{noticeId}, fills missing structured estimates and competition fields, and retains no full XML or personal contacts. The original legal record remains on Hilma. Older notices continue to use search summaries until enriched. Values missing from structured fields are not guessed from description text.

**PRH / YTJ:** https://avoindata.prh.fi/opendata-ytj-api/v3/companies?businessId=...
https://www.ytj.fi/index/avoindata.html.
Coverage excludes municipalities, wellbeing services counties and sole traders. Keep Hilma buyer names for these. Enrichment is cached for 30 days and bounded to 100 lookups per run.

**State Treasury / Tutkihankintoja:** metadata and download discovery through the official national open-data catalogue:
https://avoindata.suomi.fi/data/api/3/action/package_show?id=ba96a638-67bf-4747-b084-c78ccfe052e9.
The latest annual CSV is streamed and aggregated. Data covers state budget entities and selected municipalities/other organisations, not all national spending. Accounting lines include credit notes and some supplier identities are withheld. Supplier rankings retain the top 250. No unsupported tender-to-invoice attribution is made.

## Transparency indicators

- **Single bid:** award notice with exactly one received tender in at least one lot.
- **Short response window:** 0 ≤ deadline minus notice publication < 14 days. Amendments may affect this.
- **Near estimate:** reported EUR award total is 95–100% of a positive notice-level EUR estimate.

Unknown values never become zero. Indicators are prompts to investigate, not accusations. Notice counts are not contract counts. Earlier versions are identified only from explicit previousSearchIds links. Region uses performance NUTS codes, with buyer NUTS as a fallback; multiple regions may apply. Estimates are summed only in EUR and coverage is displayed beside the total.

## Data artifacts

- data/notices.json — normalized schema version 1, rolling snapshot.
- data/notices.json.gz — gzip snapshot.
- data/companies.json — bounded PRH cache.
- data/spending.json — invoice aggregates.
- data/manifest.json — all daily/monthly shard and RSS feed paths.
- exports/notices.csv and exports/notices.json — full downloadable snapshot.
- feeds/all.xml, feeds/regions/_.xml and feeds/buyers/_.xml — 100 newest matching notices.
- notices/*.html — static full-description pages indexed by Pagefind.
- pagefind/ — generated multilingual-capable browser search index.

See src/types.ts for the client schema. Nullable monetary values and lot bid counts preserve missing data. Every notice retains sourceUrl, noticeNumber and publication/modified dates.

## Verification

npm test checks normalization, status deadlines, missing values, currency compatibility, flags, amendments, region mapping, safe links and CSV formula injection.
npm run build type-checks, builds the static application, generates artifacts and indexes all notices with Pagefind.

## Licence

Application code: MIT (see LICENSE).
Official data retains its respective source terms; PRH and State Treasury data require CC BY 4.0 attribution. Attribution is displayed in the application. Tilimyyrä is not affiliated with the Finnish government.

## Interface preferences and discovery

Finnish is the default. Use the language selector for Swedish or English; language, theme and saved notices persist locally when browser storage is available. Existing Avoin bookmarks migrate automatically. The theme follows the system preference on first visit and can then be changed with the theme button.

Use **More filters / Tarkempi haku / Avancerad sökning** for advanced search. Search matches words without case or accent sensitivity; exact phrase matches consecutive text. Buyer filtering uses an exact organisation name from the suggestions. CPV accepts a full code or prefix. Date boundaries include the entire selected day in Europe/Helsinki. Value limits exclude missing amounts and non-EUR currencies; zero remains a reported value. Value sorting compares EUR amounts only and places other currencies and missing values last. Estimates and awards stay separate. Category cards and overview totals describe the latest notice versions in the full snapshot, while result counts and downloads follow the active filters.

All discovery settings, sorting, page size and language survive copying or reloading the URL. The separate Pagefind search page and indexed notice summaries also offer all three interface languages and both themes. Official buyer, supplier and spending-category names retain their source wording. Static search indexes the original notice text; it does not translate documents.
