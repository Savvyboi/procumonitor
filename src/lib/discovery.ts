import type { Notice } from "../types";

export type Filters = {
  q: string;
  match: string;
  scope: string;
  region: string;
  category: string;
  status: string;
  buyer: string;
  buyerType: string;
  procedure: string;
  cpv: string;
  signal: string;
  valueKind: string;
  min: string;
  max: string;
  valueKnown: string;
  publishedFrom: string;
  publishedTo: string;
  deadlineFrom: string;
  deadlineTo: string;
  period: string;
  includeEarlier: boolean;
};
export const defaults: Filters = {
  q: "",
  match: "all",
  scope: "all",
  region: "",
  category: "",
  status: "",
  buyer: "",
  buyerType: "",
  procedure: "",
  cpv: "",
  signal: "",
  valueKind: "estimate",
  min: "",
  max: "",
  valueKnown: "any",
  publishedFrom: "",
  publishedTo: "",
  deadlineFrom: "",
  deadlineTo: "",
  period: "",
  includeEarlier: false,
};
export const sorts = [
  "newest",
  "oldest",
  "modified",
  "deadline",
  "estimateDesc",
  "estimateAsc",
  "awardDesc",
  "awardAsc",
  "buyer",
  "title",
] as const;
export function readFilters(params: URLSearchParams): Filters {
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Filters)[]) {
    const value = params.get(key);
    if (key === "includeEarlier") result[key] = value === "true";
    else if (value !== null) result[key] = value;
  }
  result.min = params.get("min") ?? params.get("minValue") ?? "";
  return result;
}
export function writeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults) as (keyof Filters)[])
    if (filters[key] !== defaults[key]) params.set(key, String(filters[key]));
  return params;
}
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fi");
export function searchText(n: Notice, scope: string): string {
  const fields: Record<string, string> = {
    title: n.title,
    buyer: n.buyer + " " + (n.businessId ?? ""),
    supplier: [...n.winners, ...n.lots.flatMap((l) => l.winners)].join(" "),
    description: [
      n.description,
      ...n.lots.map((l) => l.description || ""),
    ].join(" "),
  };
  return fold(
    fields[scope] ??
      [
        n.noticeNumber,
        n.id,
        ...Object.values(fields),
        ...n.lots.map((l) => l.title),
        ...n.cpvCodes,
        n.category,
        ...n.regions,
      ].join(" "),
  );
}
export function matchesQuery(
  text: string,
  query: string,
  mode: string,
): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  if (mode === "phrase") return text.includes(q);
  const words = q.split(/\s+/);
  return mode === "any"
    ? words.some((w) => text.includes(w))
    : words.every((w) => text.includes(w));
}
const helsinkiFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Helsinki",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function helsinkiDay(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : helsinkiFormatter.format(parsed);
}
function inDates(value: string | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  const day = value ? helsinkiDay(value) : "";
  return !!day && (!from || day >= from) && (!to || day <= to);
}
export function matchesFilters(
  n: Notice,
  f: Filters,
  now = Date.now(),
): boolean {
  const value = f.valueKind === "award" ? n.awardedValue : n.estimatedValue;
  const currency =
    f.valueKind === "award" ? n.awardedCurrency : n.estimatedCurrency;
  return (
    (f.includeEarlier || !n.superseded) &&
    (!f.region || n.regions.includes(f.region)) &&
    (!f.category || n.category === f.category) &&
    (!f.status || n.status === f.status) &&
    (!f.buyer || n.buyer === f.buyer) &&
    (!f.buyerType || n.buyerType === f.buyerType) &&
    (!f.procedure || n.procedure === f.procedure) &&
    (!f.cpv || n.cpvCodes.some((c) => c.startsWith(f.cpv.trim()))) &&
    (!f.signal || n.flags.includes(f.signal)) &&
    (f.valueKnown !== "reported" || value !== null) &&
    (f.valueKnown !== "missing" || value === null) &&
    (!f.min ||
      (value !== null && currency === "EUR" && value >= Number(f.min))) &&
    (!f.max ||
      (value !== null && currency === "EUR" && value <= Number(f.max))) &&
    (!f.period ||
      (now - Date.parse(n.published) >= 0 &&
        now - Date.parse(n.published) <= Number(f.period) * 86400000)) &&
    inDates(n.published, f.publishedFrom, f.publishedTo) &&
    inDates(n.deadline, f.deadlineFrom, f.deadlineTo)
  );
}
export function sortNotices(
  notices: Notice[],
  sort: string,
  locale = "fi",
): Notice[] {
  const numeric = (a: number | null, b: number | null, asc: boolean) =>
    a === null ? (b === null ? 0 : 1) : b === null ? -1 : asc ? a - b : b - a;
  return [...notices].sort((a, b) => {
    let result = 0;
    if (sort.startsWith("estimate"))
      result = numeric(
        a.estimatedCurrency === "EUR" ? a.estimatedValue : null,
        b.estimatedCurrency === "EUR" ? b.estimatedValue : null,
        sort.endsWith("Asc"),
      );
    else if (sort.startsWith("award"))
      result = numeric(
        a.awardedCurrency === "EUR" ? a.awardedValue : null,
        b.awardedCurrency === "EUR" ? b.awardedValue : null,
        sort.endsWith("Asc"),
      );
    else if (sort === "deadline")
      result = numeric(
        a.deadline ? Date.parse(a.deadline) : null,
        b.deadline ? Date.parse(b.deadline) : null,
        true,
      );
    else if (sort === "buyer" || sort === "title")
      result = a[sort].localeCompare(b[sort], locale);
    else if (sort === "oldest") result = a.published.localeCompare(b.published);
    else if (sort === "modified") result = b.modified.localeCompare(a.modified);
    else result = b.published.localeCompare(a.published);
    return result || a.id.localeCompare(b.id);
  });
}
