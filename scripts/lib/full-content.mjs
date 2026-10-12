import { CONTENT_VERSION, enrichFromXml } from "./eforms.mjs";
import { categoryFor, getFlags, numberOrNull, REGIONS } from "./normalize.mjs";
const array = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const unique = (xs) => [...new Set(xs.filter(Boolean))];
const text = (value) => {
  const xs = array(value);
  const preferred = ["FIN", "ENG", "SWE"].find((lang) =>
    xs.some((x) => x?.languageID === lang),
  );
  return xs
    .filter((x) => !preferred || x?.languageID === preferred)
    .map((x) => (typeof x === "string" ? x : String(x?.value ?? "")))
    .filter(Boolean)
    .join("\n\n");
};
const clone = (notice) => ({
  ...notice,
  lots: notice.lots.map((l) => ({ ...l, winners: [...l.winners] })),
});
const lot = (id) => ({
  id,
  title: "",
  description: "",
  cpvCodes: [],
  regions: [],
  deadline: null,
  estimatedValue: null,
  awardedValue: null,
  estimatedCurrency: null,
  awardedCurrency: null,
  bids: null,
  winners: [],
});
const cpvs = (xs) =>
  unique(xs.map((x) => String(x ?? "")).filter((x) => /^\d{8}$/.test(x)));
const regions = (xs) =>
  unique(xs.filter(Boolean).map((c) => REGIONS[c] || "Other / nationwide"));
function finish(n) {
  n.cpvCodes = unique([
    ...n.cpvCodes,
    ...n.lots.flatMap((l) => l.cpvCodes || []),
  ]);
  n.category = categoryFor(n.cpvCodes);
  n.winners = unique([...n.winners, ...n.lots.flatMap((l) => l.winners)]);
  n.currency = n.estimatedCurrency || n.awardedCurrency || n.currency;
  n.fullContentAvailable = true;
  n.contentUnavailable = false;
  n.contentVersion = CONTENT_VERSION;
  n.contentCheckedAt = new Date().toISOString();
  n.flags = getFlags(n);
  return n;
}
function performance(n, codes) {
  if (!codes.length) return;
  n.regions = regions(codes);
  n.region = n.regions[0];
  n.regionSource = "performance";
}
export function contentRequest(notice) {
  let route;
  if (
    /^EF-\d+$/.test(notice.id) &&
    Number.isSafeInteger(notice.noticeId) &&
    notice.noticeId > 0
  )
    route = "/avp-eforms/external-read/v1/notice/" + notice.noticeId;
  else if (
    /^OLD-\d+$/.test(notice.id) &&
    Number.isSafeInteger(notice.noticeId) &&
    notice.noticeId > 0
  )
    route = "/avp-notice/api/avp/notices/" + notice.noticeId;
  else if (/^PLAN-\d+$/.test(notice.id))
    route = "/avp-eforms/external-read/v1/plan/" + notice.id.slice(5);
  else throw Error("Unsupported Hilma record identity: " + notice.id);
  return "https://api.hankintailmoitukset.fi" + route;
}
export function enrichmentQueue(notices, limit = Infinity, now = Date.now()) {
  return notices
    .filter(
      (n) =>
        /^(EF|OLD|PLAN)-\d+$/.test(n.id) &&
        (n.contentUnavailable
          ? !n.contentCheckedAt ||
            now - Date.parse(n.contentCheckedAt) >= 7 * 86400000
          : !n.fullContentAvailable || n.contentVersion !== CONTENT_VERSION),
    )
    .sort(
      (a, b) =>
        (a.contentCheckedAt || a.published).localeCompare(
          b.contentCheckedAt || b.published,
        ) || a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
export function enrichPlan(notice, response) {
  if (
    response.id !== Number(notice.id.slice(5)) ||
    !response.planData ||
    !Array.isArray(response.planData.procurementPlanLots)
  )
    throw Error("Unexpected Hilma plan structure");
  const n = clone(notice),
    data = response.planData;
  n.title = text(data.name) || n.title;
  const lots = data.procurementPlanLots;
  for (const source of lots) {
    const id = String(source.id ?? "");
    if (!id) continue;
    let target = n.lots.find((l) => l.id === id);
    if (!target) {
      target = lot(id);
      n.lots.push(target);
    }
    target.title = text(source.name) || target.title;
    target.description = text(source.description) || target.description;
    target.cpvCodes = unique([
      ...(target.cpvCodes || []),
      ...cpvs(
        [
          ...array(source.itemClassificationCode),
          ...array(source.additionalCommodityClassification),
        ].map((c) => c.itemClassificationCode?.value),
      ),
    ]);
    const codes = array(source.countrySubentityCode)
      .map((c) => c.value)
      .filter(Boolean);
    if (codes.length) target.regions = regions(codes);
  }
  performance(
    n,
    lots
      .flatMap((l) => array(l.countrySubentityCode).map((c) => c.value))
      .filter(Boolean),
  );
  // A planning range is not a single notice estimate; keep it explicitly separate.
  const min = data.estimatedMinContractAmount,
    max = data.estimatedMaxContractAmount;
  if (min || max)
    n.plannedValueRange = {
      min: numberOrNull(min?.value),
      max: numberOrNull(max?.value),
      minCurrency: min?.currencyID || null,
      maxCurrency: max?.currencyID || null,
    };
  return finish(n);
}
function legacyAmount(v) {
  // type 0 means not reported, type 2 is a range. Respect withholding flags.
  if (!v || v.disagreeToBePublished || v.type !== 1)
    return { value: null, currency: null };
  return { value: numberOrNull(v.value), currency: v.currency || null };
}
export function enrichLegacy(notice, response) {
  if (
    response.id !== notice.noticeId ||
    !response.procurementObject ||
    !Array.isArray(response.objectDescriptions)
  )
    throw Error("Unexpected Hilma legacy notice structure");
  const n = clone(notice),
    project = response.procurementObject;
  n.description = text(project.shortDescription) || n.description;
  const estimated = legacyAmount(project.estimatedValue),
    awarded = legacyAmount(project.totalValue);
  if (n.estimatedValue === null && estimated.value !== null) {
    n.estimatedValue = estimated.value;
    n.estimatedCurrency = estimated.currency;
  }
  if (n.awardedValue === null && awarded.value !== null) {
    n.awardedValue = awarded.value;
    n.awardedCurrency = awarded.currency;
  }
  n.cpvCodes = unique([...n.cpvCodes, ...cpvs([project.mainCpvCode?.code])]);
  for (const source of response.objectDescriptions) {
    const id = source.lotNumber == null ? null : String(source.lotNumber);
    let target = n.lots.find((l) => l.id === id);
    // An unnumbered single object is a whole-procurement object, not an invented lot ID.
    if (
      !target &&
      id === null &&
      response.objectDescriptions.length === 1 &&
      n.lots.length === 1
    )
      target = n.lots[0];
    if (!target) {
      target = lot(id);
      n.lots.push(target);
    }
    target.title = text(source.title) || target.title;
    target.description = text(source.descrProcurement) || target.description;
    target.cpvCodes = unique([
      ...(target.cpvCodes || []),
      ...cpvs([
        source.mainCpvCode?.code,
        ...array(source.additionalCpvCodes).map((c) => c.code),
      ]),
    ]);
    if (source.nutsCodes?.length) target.regions = regions(source.nutsCodes);
    const estimate = legacyAmount(source.estimatedValue);
    if (target.estimatedValue === null && estimate.value !== null) {
      target.estimatedValue = estimate.value;
      target.estimatedCurrency = estimate.currency;
    }
    const award = source.awardContract;
    const contracts = award?.awardedContracts?.length
      ? award.awardedContracts
      : array(award?.awardedContract);
    // Legacy templates populate default counts even without awards. Do not infer bid counts.
    target.winners = unique([
      ...target.winners,
      ...contracts
        .filter((c) => !c.disagreeContractorInformationToBePublished)
        .flatMap((c) => array(c.contractors).map((o) => o.officialName)),
    ]);
    const amounts = contracts.map((c) => legacyAmount(c.finalTotalValue));
    if (
      target.awardedValue === null &&
      amounts.length &&
      amounts.every(
        (a) =>
          a.value !== null && a.currency && a.currency === amounts[0].currency,
      )
    ) {
      target.awardedValue = amounts.reduce((sum, a) => sum + a.value, 0);
      target.awardedCurrency = amounts[0].currency;
    }
  }
  performance(
    n,
    response.objectDescriptions.flatMap((d) => d.nutsCodes || []),
  );
  return finish(n);
}
export function enrichContent(notice, response) {
  if (notice.id.startsWith("EF-")) {
    if (response.id !== notice.noticeId || typeof response.eForm !== "string")
      throw Error("Unexpected Hilma eForms response");
    return enrichFromXml(notice, response.eForm);
  }
  return notice.id.startsWith("PLAN-")
    ? enrichPlan(notice, response)
    : enrichLegacy(notice, response);
}
export function enrichmentCoverage(notices) {
  const enriched = notices.filter(
    (n) => n.fullContentAvailable && n.contentVersion === CONTENT_VERSION,
  ).length;
  const unavailable = notices.filter((n) => n.contentUnavailable).length;
  return {
    total: notices.length,
    enriched,
    unavailable,
    pending: notices.length - enriched - unavailable,
    complete: enriched === notices.length,
  };
}

export function contentBatchRequest(notices) {
  if (!notices.length || notices.length > 50)
    throw Error("A Hilma bulk read requires 1 to 50 records.");
  const prefix = notices[0].id.split("-")[0];
  if (
    !["EF", "PLAN"].includes(prefix) ||
    notices.some((n) => n.id.split("-")[0] !== prefix)
  )
    throw Error("A Hilma bulk read requires one supported notice format.");
  const route = prefix === "EF" ? "notices" : "plans";
  const url = new URL(
    "https://api.hankintailmoitukset.fi/avp-eforms/external-read/v1/" + route,
  );
  for (const notice of notices) {
    const single = new URL(contentRequest(notice));
    url.searchParams.append("id", single.pathname.split("/").at(-1));
  }
  return url.href;
}
export function matchContentBatch(notices, response) {
  if (!Array.isArray(response))
    throw Error("Unexpected Hilma bulk response structure.");
  const expected = new Set(notices.map((n) => Number(n.id.split("-")[1]))),
    matched = new Map();
  for (const item of response) {
    if (!expected.has(item?.id) || matched.has(item.id))
      throw Error("Unexpected or duplicate identity in Hilma bulk response.");
    matched.set(item.id, item);
  }
  return matched;
}
