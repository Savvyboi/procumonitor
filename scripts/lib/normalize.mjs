export const REGIONS = {
  FI1B1: "Uusimaa",
  FI1C1: "Varsinais-Suomi",
  FI1C2: "Kanta-Häme",
  FI1C3: "Päijät-Häme",
  FI1C4: "Kymenlaakso",
  FI1C5: "Etelä-Karjala",
  FI193: "Keski-Suomi",
  FI194: "Etelä-Pohjanmaa",
  FI195: "Pohjanmaa",
  FI196: "Satakunta",
  FI197: "Pirkanmaa",
  FI19B: "Pirkanmaa",
  FI19C: "Keski-Suomi",
  FI1D1: "Etelä-Savo",
  FI1D2: "Pohjois-Savo",
  FI1D3: "Pohjois-Karjala",
  FI1D4: "Kainuu",
  FI1D5: "Keski-Pohjanmaa",
  FI1D6: "Pohjois-Pohjanmaa",
  FI1D7: "Lappi",
  FI200: "Åland",
};
const categories = {
  "03": "Agriculture & food",
  "09": "Energy & utilities",
  14: "Materials & equipment",
  15: "Agriculture & food",
  18: "Materials & equipment",
  22: "Office & supplies",
  24: "Materials & equipment",
  30: "IT & software",
  31: "Materials & equipment",
  32: "IT & software",
  33: "Healthcare",
  34: "Transport & logistics",
  35: "Safety & security",
  38: "Materials & equipment",
  39: "Office & supplies",
  42: "Materials & equipment",
  43: "Materials & equipment",
  44: "Construction",
  45: "Construction",
  48: "IT & software",
  50: "Maintenance & facilities",
  51: "Maintenance & facilities",
  55: "Hospitality & catering",
  60: "Transport & logistics",
  63: "Transport & logistics",
  64: "IT & software",
  65: "Energy & utilities",
  66: "Professional services",
  70: "Property & real estate",
  71: "Architecture & engineering",
  72: "IT & software",
  73: "Research & education",
  75: "Public services",
  76: "Energy & utilities",
  77: "Environment & outdoors",
  79: "Professional services",
  80: "Research & education",
  85: "Healthcare",
  90: "Maintenance & facilities",
  92: "Culture & recreation",
  98: "Other services",
};
export const categoryFor = (codes) =>
  categories[String(codes?.[0] || "").slice(0, 2)] || "Other services";
export function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function getFlags(n) {
  const flags = [];
  if (n.status === "Awarded" && n.lots.some((l) => l.bids === 1))
    flags.push("single-bid");
  if (n.deadline && n.published) {
    const days = (Date.parse(n.deadline) - Date.parse(n.published)) / 86400000;
    if (days >= 0 && days < 14) flags.push("short-window");
  }
  // A multi-lot award total cannot safely be compared with an estimate for one lot.
  if (
    n.status === "Awarded" &&
    n.estimatedValue > 0 &&
    n.awardedValue !== null &&
    n.estimatedCurrency === "EUR" &&
    n.awardedCurrency === "EUR" &&
    n.awardedValue / n.estimatedValue >= 0.95 &&
    n.awardedValue / n.estimatedValue <= 1
  )
    flags.push("near-budget");
  return flags;
}
const localized = (s, p) =>
  s[p + "Fi"] || s[p + "En"] || s[p + "Sv"] || s[p + "Other"] || "";
const codes = (s) => [...new Set(String(s || "").match(/\b\d{8}\b/g) || [])];
const names = (s) =>
  Array.isArray(s)
    ? s.filter(Boolean).map(String)
    : String(s || "")
        .split(/;|\n/)
        .map((x) => x.trim())
        .filter(Boolean);
const safeUrl = (s) => {
  try {
    const u = new URL(s);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
};
export function normalize(raw, now = new Date()) {
  if (
    !raw.id ||
    !raw.datePublished ||
    !Number.isFinite(Date.parse(raw.datePublished))
  )
    throw new Error("Hilma notice missing identity/publication date");
  const lots = (raw.lots || []).map((l) => ({
    id: l.id,
    title: localized(l, "title"),
    description: localized(l, "description"),
    cpvCodes: codes(l.cpvCodes),
    regions: [
      ...new Set(
        String(l.nutsCodes || "")
          .split(/[ ,;]+/)
          .filter(Boolean)
          .map((c) => REGIONS[c] || "Other / nationwide"),
      ),
    ],
    deadline: l.deadline || null,
    estimatedValue: numberOrNull(l.estimatedValue),
    awardedValue: numberOrNull(l.lotResultTotalAmount),
    estimatedCurrency: l.currency || null,
    awardedCurrency: l.lotResultTotalAmountCurrency || null,
    bids: numberOrNull(l.receivedTenderCount),
    winners: names(l.winnerOrganisations),
  }));
  const cpvCodes = [
    ...new Set([...codes(raw.cpvCodes), ...lots.flatMap((l) => l.cpvCodes)]),
  ];
  const performanceNuts = [
    raw.nutsCodes,
    ...(raw.lots || []).map((l) => l.nutsCodes),
  ]
    .filter(Boolean)
    .join(" ");
  const regionCodes = String(performanceNuts || raw.organisationNutsCode || "")
    .split(/[ ,;]/)
    .filter(Boolean);
  const regions = [
    ...new Set(regionCodes.map((c) => REGIONS[c] || "Other / nationwide")),
  ];
  let status = raw.isCancelled
    ? "Cancelled"
    : raw.isPlan ||
        raw.mainType === "PlanNotices" ||
        raw.mainType === "PriorInformationNotices"
      ? "Planning"
      : raw.mainType === "ContractAwardNotices"
        ? "Awarded"
        : raw.mainType === "ContractNotices"
          ? "Active"
          : "Other";
  const deadline = raw.deadline || null;
  if (status === "Active" && deadline && Date.parse(deadline) <= now.getTime())
    status = "Closed";
  const n = {
    id: String(raw.id),
    noticeId: raw.noticeId,
    noticeNumber: raw.noticeNumber || String(raw.id),
    title: localized(raw, "title") || "Untitled notice",
    description: localized(raw, "description"),
    buyer: localized(raw, "organisationName") || "Unknown buyer",
    businessId: raw.organisationNationalRegistrationNumber || null,
    buyerType:
      {
        la: "Municipality",
        ra: "Regional authority",
        cga: "Central government",
        "body-pl": "Public body",
        "pub-undert": "Public undertaking",
      }[raw.organisationType] || "Other buyer",
    region: regions[0] || "Other / nationwide",
    regionSource: performanceNuts
      ? "performance"
      : raw.organisationNutsCode
        ? "buyer"
        : "unreported",
    regions: regions.length ? regions : ["Other / nationwide"],
    cpvCodes,
    category: categoryFor(cpvCodes),
    status,
    published: raw.datePublished,
    modified: raw.dateModified || raw.datePublished,
    deadline,
    estimatedValue: numberOrNull(raw.estimatedValue),
    awardedValue: numberOrNull(raw.noticeResultTotalAmount),
    currency: raw.currency || raw.noticeResultTotalAmountCurrency || null,
    estimatedCurrency: raw.currency || null,
    awardedCurrency: raw.noticeResultTotalAmountCurrency || null,
    winners: [
      ...new Set([
        ...names(raw.winnerOrganisations),
        ...lots.flatMap((l) => l.winners),
      ]),
    ],
    procedure: raw.procedureType || "Not specified",
    flags: [],
    lots,
    sourceUrl: raw.isPlan
      ? "https://www.hankintailmoitukset.fi/fi/public/plan/" + raw.planId
      : raw.isEForms
        ? "https://www.hankintailmoitukset.fi/fi/public/procedure/" +
          raw.procedureId +
          "/enotice/" +
          raw.noticeId
        : "https://www.hankintailmoitukset.fi/fi/public/procurement/" +
          raw.oldProcurementProjectId +
          "/notice/" +
          raw.noticeId +
          "/overview",
    documentsUrl: safeUrl(raw.procurementDocumentsUrl),
    fullContentAvailable: false,
    superseded: false,
    relatedIds: raw.previousSearchIds || [],
  };
  n.flags = getFlags(n);
  return n;
}
export function reuseEnrichment(notice, cached) {
  if (!cached?.fullContentAvailable || cached.modified !== notice.modified)
    return notice;
  const unique = (values) => [...new Set(values)];
  const freshLots = new Map(notice.lots.map((l) => [l.id, l]));
  const lots = cached.lots
    .map((old) => {
      const fresh = freshLots.get(old.id);
      freshLots.delete(old.id);
      if (!fresh) return old;
      return {
        ...fresh,
        ...old,
        description: old.description || fresh.description,
        cpvCodes: unique([...(fresh.cpvCodes || []), ...(old.cpvCodes || [])]),
        regions: unique([...(fresh.regions || []), ...(old.regions || [])]),
        deadline: old.deadline || fresh.deadline,
        winners: unique([...fresh.winners, ...old.winners]),
      };
    })
    .concat([...freshLots.values()]);
  const cpvCodes = unique([...notice.cpvCodes, ...cached.cpvCodes]);
  const performance = notice.regionSource === "performance";
  const regions = performance
    ? unique([
        ...notice.regions,
        ...(cached.regionSource === "performance" ? cached.regions : []),
      ])
    : cached.regions;
  const merged = {
    ...notice,
    ...cached,
    status: notice.status,
    superseded: false,
    relatedIds: notice.relatedIds,
    lots,
    cpvCodes,
    category: categoryFor(cpvCodes),
    regions,
    region: regions[0],
    regionSource: performance
      ? "performance"
      : cached.regionSource || notice.regionSource,
    winners: unique([
      ...notice.winners,
      ...cached.winners,
      ...lots.flatMap((l) => l.winners),
    ]),
  };
  merged.flags = getFlags(merged);
  return merged;
}
export function markSuperseded(notices) {
  const superseded = new Set(notices.flatMap((n) => n.relatedIds || []));
  return notices.map((n) => ({ ...n, superseded: superseded.has(n.id) }));
}
export function csvCell(v) {
  const s = String(v ?? "");
  // Prevent formula execution in spreadsheet programs, including leading control/space.
  return (
    '"' + (/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
  );
}
export function toCSV(notices) {
  const keys = [
    "id",
    "noticeId",
    "noticeNumber",
    "title",
    "buyer",
    "businessId",
    "buyerType",
    "region",
    "regions",
    "cpvCodes",
    "category",
    "status",
    "published",
    "modified",
    "deadline",
    "estimatedValue",
    "awardedValue",
    "estimatedCurrency",
    "awardedCurrency",
    "currency",
    "winners",
    "flags",
    "procedure",
    "documentsUrl",
    "fullContentAvailable",
    "plannedValueRange",
    "relatedIds",
    "lots",
    "sourceUrl",
  ];
  return (
    "\uFEFF" +
    keys.join(",") +
    "\r\n" +
    notices
      .map((n) =>
        keys
          .map((k) =>
            csvCell(
              k === "lots" || k === "plannedValueRange"
                ? JSON.stringify(n[k])
                : Array.isArray(n[k])
                  ? n[k].join("; ")
                  : n[k],
            ),
          )
          .join(","),
      )
      .join("\r\n")
  );
}
