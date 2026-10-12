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
- Notice details, original lot descriptions, classifications, performance regions, deadlines, awardees and competition fields, explicit earlier-version links, official source links and shareable URLs.
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
node scripts/enrich-eforms.mjs --all
node scripts/ingest-spending.mjs
npm test
npm run build
npm run preview
```

Never put the key in a VITE\_ variable, a committed file, or a browser request. The importer reads it from the environment and sends it only to api.hankintailmoitukset.fi. Raw API payloads and personal contact records are not retained.

## GitHub Pages

Repository: https://github.com/Savvyboi/procumonitor
Pages URL: https://savvyboi.github.io/procumonitor/

1. Store the Hilma subscription key as the repository Actions secret HILMA_API_KEY.
2. Select **GitHub Actions** under Settings → Pages → Build and deployment.
3. Push to main, or run **Refresh data and publish GitHub Pages** manually.

The workflow deploys on each main push. Every six hours it reads differential changes (with a two-day overlap), prunes notices published more than 180 days ago, refreshes company records, enriches every pending eForms notice, legacy notice and procurement plan in resumable batches and commits snapshots. Invoice files refresh at most weekly. GitHub can delay scheduled runs and may disable inactive public-repository schedules after 60 days; inspect the Actions tab if freshness falls behind. Failures preserve the last deployed site.

The Pages base path comes from actions/configure-pages, so assets, exports, deep links and RSS feeds also work under a repository subpath.

## Official sources and coverage

**Hilma:** POST https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search.
Official documentation: https://github.com/Hankintailmoitukset/hilma-api/blob/master/endpoints/avpendpoints.md.
Search summaries retain core procurement and lot fields, including lot descriptions, CPV codes, performance NUTS regions and lot deadlines. Unchanged cached full content survives summary refreshes while newly retained summary fields are filled.

Full content uses separate authenticated read endpoints, verified against actual responses:

- eForms: `/avp-eforms/external-read/v1/notice/{noticeId}`, with base64-encoded XML inside JSON.
- Legacy notices: `/avp-notice/api/avp/notices/{noticeId}`, with structured JSON.
- Procurement plans: `/avp-eforms/external-read/v1/plan/{planId}`, with structured JSON.

All requests go only to `https://api.hankintailmoitukset.fi`. The worker retains selected public procurement fields: full original project and lot descriptions, classifications, performance regions, estimates and awardees. Plan value ranges are kept separately from single estimates. Legacy value ranges, withheld amounts and template-default bid counts are not converted into exact values. eForms lot awards follow explicit result → settled-contract → tender → organisation references. Lot totals require complete values in one reported currency; group tender values are never assigned to an individual lot. Notice-level totals are not inferred from lot totals. Missing values are not guessed from free text. Full raw payloads and personal contacts are discarded.

Scheduled refreshes use `--all` to process all new, changed or outdated records in the current snapshot. eForms and plans use bulk reads of at most 50 records, with repeated `id` query parameters. Returned identities are validated and omitted IDs fall back to individual reads. Legacy records use individual reads. The worker uses two concurrent legacy requests by default (`HILMA_ENRICH_CONCURRENCY`, maximum four), respects retry/backoff and atomically checkpoints every 50 records. It resumes from those checkpoints after interruption, processes the oldest unchecked records first and revisits content when the extractor version changes. An unavailable (404) record is explicitly marked and retried after seven days. Without `--all`, a manual run retains the bounded 200-record default (`EFORMS_LIMIT`, maximum 2,000). The snapshot records enriched, pending and unavailable counts; the interface reports coverage and identifies summary-only records. This is a selected public procurement field set, not every field in the legal record, which remains on Hilma.

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
- exports/notices.csv and exports/notices.json — full downloadable snapshot. CSV includes identifiers, all regions, CPVs, modification dates, version links, document URLs and a JSON-encoded lots column; JSON preserves the full public client schema.
- feeds/all.xml, feeds/regions/_.xml and feeds/buyers/_.xml — 100 newest matching notices.
- notices/\*.html — static full-description pages indexed by Pagefind.
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

Search and filters, sorting/display/downloads, and the dataset/category overview start collapsed, including on shared URLs. Active filter chips remain visible while search is closed. Open the search panel or press **/** to focus search; use **More filters / Tarkempi haku / Avancerad sökning** for advanced search. Search matches words without case or accent sensitivity; exact phrase matches consecutive text. Buyer filtering uses an exact organisation name from the suggestions. CPV accepts a full code or prefix. Date boundaries include the entire selected day in Europe/Helsinki. Value limits exclude missing amounts and non-EUR currencies; zero remains a reported value. Value sorting compares EUR amounts only and places other currencies and missing values last. Estimates and awards stay separate. Category cards and overview totals describe the latest notice versions in the full snapshot, while result counts and downloads follow the active filters.

All discovery settings, sorting, page size and language survive copying or reloading the URL. The separate Pagefind search page and indexed notice summaries also offer all three interface languages and both themes. Both search systems include imported lot descriptions and awardees, and static notice pages distinguish estimates from awards. Official buyer, supplier and spending-category names retain their source wording. Static search indexes the original notice text; it does not translate documents.

## Hilma coverage verification

The audit verified authenticated search and full-content responses for eForms, legacy notices and procurement plans against the official [Hilma read documentation](https://github.com/Hankintailmoitukset/hilma-api/blob/master/endpoints/avpendpoints.md). The full summary refresh read 12,648 records and retained 11,155 published within the rolling window. The full-content backfill completed on 12 October 2026 at 02:12 UTC: all 11,155 records were enriched (10,849 eForms notices, 191 legacy notices and 115 plans), with zero pending or unavailable records. The snapshot records the actual coverage and check time in `public/data/notices.json`. The backfill uses resumable checkpoints. No raw responses, full XML, personal contacts or API keys are retained. Tests cover currency compatibility, missing values, reported zero, withheld fields, explicit winner references, grouped tenders, all notice formats, privacy, queue ordering, unavailable retries and cached enrichment during summary refreshes.
