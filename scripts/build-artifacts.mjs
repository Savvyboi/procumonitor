import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { toCSV } from "./lib/normalize.mjs";
const data = JSON.parse(await readFile("public/data/notices.json", "utf8"));
await mkdir("dist/exports", { recursive: true });
await mkdir("dist/feeds/regions", { recursive: true });
await mkdir("dist/feeds/buyers", { recursive: true });
await mkdir("dist/data/months", { recursive: true });
await mkdir("dist/data/days", { recursive: true });
await mkdir("dist/notices", { recursive: true });
const xml = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const slug = (v) =>
  v
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const site = process.env.SITE_URL?.replace(/\/?$/, "/") || "";
await writeFile("dist/exports/notices.csv", toCSV(data.notices));
await writeFile("dist/exports/notices.json", JSON.stringify(data));
await writeFile("dist/data/notices.json.gz", gzipSync(JSON.stringify(data)));
const manifest = {
  generatedAt: data.fetchedAt,
  monthly: [],
  daily: [],
  feeds: [],
};
for (const [kind, length] of [
  ["months", 7],
  ["days", 10],
]) {
  const groups = Object.groupBy(data.notices, (n) =>
    n.published.slice(0, length),
  );
  for (const [date, notices] of Object.entries(groups)) {
    const file = "data/" + kind + "/" + date + ".json";
    await writeFile("dist/" + file, JSON.stringify(notices));
    await writeFile("dist/" + file + ".gz", gzipSync(JSON.stringify(notices)));
    manifest[kind === "months" ? "monthly" : "daily"].push({
      date,
      file,
      count: notices.length,
    });
  }
}
async function feed(title, notices, file) {
  const content =
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>' +
    xml(title) +
    "</title><link>" +
    xml(site || "https://www.hankintailmoitukset.fi") +
    "</link><description>Official Hilma notice summaries collected by Tilimyyrä. Rolling " +
    data.windowDays +
    " day window.</description><language>fi</language>" +
    notices
      .slice(0, 100)
      .map(
        (n) =>
          "<item><title>" +
          xml(n.title) +
          "</title><link>" +
          xml(n.sourceUrl) +
          '</link><guid isPermaLink="false">' +
          xml(n.id) +
          "</guid><pubDate>" +
          new Date(n.published).toUTCString() +
          "</pubDate><description>" +
          xml(n.buyer + " · " + n.region + " · " + n.status) +
          "</description></item>",
      )
      .join("") +
    "</channel></rss>";
  await writeFile("dist/" + file, content);
  manifest.feeds.push({ title, file, count: notices.length });
}
await feed(
  "Tilimyyrä — all Finnish procurement notices",
  data.notices,
  "feeds/all.xml",
);
for (const region of [...new Set(data.notices.flatMap((n) => n.regions))])
  await feed(
    region,
    data.notices.filter((n) => n.regions.includes(region)),
    "feeds/regions/" + slug(region) + ".xml",
  );
for (const type of [...new Set(data.notices.map((n) => n.buyerType))])
  await feed(
    type,
    data.notices.filter((n) => n.buyerType === type),
    "feeds/buyers/" + slug(type) + ".xml",
  );
const valueHtml = (value, currency) =>
  '<span data-value="' +
  xml(value ?? "") +
  '" data-currency="' +
  xml(currency ?? "") +
  '">' +
  xml(value === null ? "Ei ilmoitettu" : value + " " + (currency || "")) +
  "</span>";
for (const n of data.notices) {
  const lotsHtml = n.lots.length
    ? '<h2 data-i18n="lots">Osat</h2>' +
      n.lots
        .map(
          (l) =>
            '<section class="lot"><h3>' +
            xml(l.title || l.id) +
            '</h3><p class="description">' +
            xml(l.description || "") +
            "</p><p>" +
            xml(l.winners.join("; ")) +
            '</p><p><span data-i18n="estimate">Arvioitu arvo</span>: ' +
            valueHtml(l.estimatedValue, l.estimatedCurrency) +
            '<br><span data-i18n="award">Sopimusten arvo</span>: ' +
            valueHtml(l.awardedValue, l.awardedCurrency) +
            "</p></section>",
        )
        .join("")
    : "";
  const html =
    '<!doctype html><html lang="fi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' +
    xml(n.title) +
    ' | Tilimyyrä</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="../static-pages.css"></head><body><header><a href="../" data-explorer-link><img src="../mole.svg" alt="">tilimyyrä</a><div><select id="language" aria-label="Käyttöliittymän kieli"><option value="fi">Suomi</option><option value="sv">Svenska</option><option value="en">English</option></select><button id="theme" aria-label="Tumma teema">☾</button></div></header><main data-pagefind-body><a class="back" href="../" data-explorer-link data-pagefind-ignore data-i18n="back">← Takaisin hankintahakuun</a><h1>' +
    xml(n.title) +
    "</h1><p>" +
    xml(n.buyer) +
    " · " +
    xml(n.regions.join(", ")) +
    " · " +
    xml(n.category) +
    '</p><p class="original" data-pagefind-ignore data-i18n="original">Virallinen teksti on alkuperäisellä kielellä.</p><p class="description">' +
    xml(n.description) +
    '</p><p data-pagefind-ignore><span data-i18n="estimate">Arvioitu arvo</span>: <span data-value="' +
    xml(n.estimatedValue ?? "") +
    '" data-currency="' +
    xml(n.estimatedCurrency ?? "") +
    '">' +
    xml(
      n.estimatedValue === null
        ? "Ei ilmoitettu"
        : n.estimatedValue + " " + (n.estimatedCurrency || ""),
    ) +
    '</span></p><p data-pagefind-ignore><span data-i18n="award">Sopimusten arvo</span>: ' +
    valueHtml(n.awardedValue, n.awardedCurrency) +
    "</p>" +
    (n.plannedValueRange
      ? '<p data-pagefind-ignore><span data-i18n="plannedRange">Suunniteltu arvo (vaihteluväli)</span>: ' +
        valueHtml(n.plannedValueRange.min, n.plannedValueRange.minCurrency) +
        " – " +
        valueHtml(n.plannedValueRange.max, n.plannedValueRange.maxCurrency) +
        "</p>"
      : "") +
    "<p>" +
    xml(
      [n.noticeNumber, n.businessId, ...n.cpvCodes, ...n.winners]
        .filter(Boolean)
        .join(" · "),
    ) +
    "</p>" +
    lotsHtml +
    '<div class="actions" data-pagefind-ignore><a href="../?notice=' +
    encodeURIComponent(n.id) +
    '" data-explorer-link data-i18n="open">Avaa hankintahaussa</a><a href="' +
    xml(n.sourceUrl) +
    '" data-i18n="official">Virallinen Hilma-ilmoitus</a></div></main><script src="../static-pages.js"></script></body></html>';
  await writeFile("dist/notices/" + encodeURIComponent(n.id) + ".html", html);
}
await writeFile("dist/data/manifest.json", JSON.stringify(manifest));
await writeFile("dist/.nojekyll", "");
console.log(
  "Built exports, compressed daily/monthly data, RSS feeds and searchable notice pages.",
);

await writeFile(
  "dist/search.html",
  await readFile("scripts/templates/search.html", "utf8"),
);
