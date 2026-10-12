import { XMLParser, XMLValidator } from "fast-xml-parser";
import { categoryFor, getFlags, numberOrNull, REGIONS } from "./normalize.mjs";
export const CONTENT_VERSION = 3;
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  attributeNamePrefix: "@_",
});
const array = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const text = (x) =>
  typeof x === "object" && x !== null
    ? String(x["#text"] ?? "")
    : String(x ?? "");
const amount = (x) => ({
  value: numberOrNull(text(x)),
  currency: x?.["@_currencyID"] || null,
});
const unique = (items) => [...new Set(items.filter(Boolean))];
// Keep official text in one original language, matching search-summary preference.
const localized = (value) => {
  const values = array(value);
  const preferred = ["FIN", "ENG", "SWE"].find((lang) =>
    values.some((v) => v?.["@_languageID"] === lang),
  );
  return values
    .filter((v) => !preferred || v?.["@_languageID"] === preferred)
    .map(text)
    .filter(Boolean)
    .join("\n\n");
};
const classifications = (project) =>
  unique(
    [
      ...array(project?.MainCommodityClassification),
      ...array(project?.AdditionalCommodityClassification),
    ]
      .map((c) => text(c.ItemClassificationCode))
      .filter((c) => /^\d{8}$/.test(c)),
  );
export function enrichFromXml(notice, encoded) {
  const xml = Buffer.from(encoded, "base64").toString("utf8");
  if (
    xml.length > 5000000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("Invalid or unsafe eForms XML");
  const doc = Object.values(parser.parse(xml)).find(
    (v) => v && typeof v === "object" && v.ProcurementProject,
  );
  if (!doc) throw new Error("Unexpected eForms structure");
  const n = {
    ...notice,
    lots: notice.lots.map((l) => ({ ...l, winners: [...l.winners] })),
  };
  const project = doc.ProcurementProject;
  const total = amount(
    project.RequestedTenderTotal?.EstimatedOverallContractAmount,
  );
  if (n.estimatedValue === null && total.value !== null) {
    n.estimatedValue = total.value;
    n.estimatedCurrency = total.currency;
  }
  n.description = localized(project.Description) || n.description;
  const extensions =
    array(doc.UBLExtensions?.UBLExtension)
      .map((e) => e.ExtensionContent?.EformsExtension)
      .find(Boolean) || {};
  const result = extensions.NoticeResult || {};
  const awarded = amount(result.TotalAmount);
  if (n.awardedValue === null && awarded.value !== null) {
    n.awardedValue = awarded.value;
    n.awardedCurrency = awarded.currency;
  }
  const projects = [project];
  for (const lot of array(doc.ProcurementProjectLot)) {
    const id = text(lot.ID);
    // LotsGroup records are groups, not individual lots; never double-count them.
    if (
      lot.ID?.["@_schemeName"] === "LotsGroup" ||
      !id ||
      !lot.ProcurementProject
    )
      continue;
    let existing = n.lots.find((l) => l.id === id);
    if (!existing) {
      existing = {
        id,
        title: "",
        estimatedValue: null,
        awardedValue: null,
        estimatedCurrency: null,
        awardedCurrency: null,
        bids: null,
        winners: [],
      };
      n.lots.push(existing);
    }
    const p = lot.ProcurementProject;
    projects.push(p);
    if (!existing.title) existing.title = localized(p.Name);
    existing.description = localized(p.Description) || existing.description;
    existing.cpvCodes = unique([
      ...(existing.cpvCodes || []),
      ...classifications(p),
    ]);
    const lotRegions = array(p.RealizedLocation)
      .map((l) => text(l.Address?.CountrySubentityCode))
      .filter(Boolean);
    existing.regions = unique([
      ...(existing.regions || []),
      ...lotRegions.map((c) => REGIONS[c] || "Other / nationwide"),
    ]);
    const value = amount(
      p.RequestedTenderTotal?.EstimatedOverallContractAmount,
    );
    if (existing.estimatedValue === null && value.value !== null) {
      existing.estimatedValue = value.value;
      existing.estimatedCurrency = value.currency;
    }
  }
  n.cpvCodes = unique([...n.cpvCodes, ...projects.flatMap(classifications)]);
  n.category = categoryFor(n.cpvCodes);
  const performanceCodes = unique(
    projects.flatMap((p) =>
      array(p.RealizedLocation).map((l) =>
        text(l.Address?.CountrySubentityCode),
      ),
    ),
  );
  if (performanceCodes.length) {
    n.regions = unique(
      performanceCodes.map((c) => REGIONS[c] || "Other / nationwide"),
    );
    n.region = n.regions[0];
    n.regionSource = "performance";
  }
  const organisations = new Map(
    array(extensions.Organizations?.Organization).map((o) => {
      const company = o.Company;
      return [
        text(company?.PartyIdentification?.ID),
        localized(company?.PartyName?.Name),
      ];
    }),
  );
  const parties = new Map(
    array(result.TenderingParty).map((p) => [
      text(p.ID),
      unique(array(p.Tenderer).map((t) => organisations.get(text(t.ID)))),
    ]),
  );
  const tenders = new Map(array(result.LotTender).map((t) => [text(t.ID), t]));
  const contracts = new Map(
    array(result.SettledContract).map((c) => [text(c.ID), c]),
  );
  for (const lotResult of array(result.LotResult)) {
    const id = text(lotResult.TenderLot?.ID),
      existing = n.lots.find((l) => l.id === id);
    if (!existing) continue;
    const submissions = array(lotResult.ReceivedSubmissionsStatistics).find(
      (s) => text(s.StatisticsCode) === "tenders",
    );
    const bids = numberOrNull(text(submissions?.StatisticsNumeric));
    if (existing.bids === null && Number.isInteger(bids)) existing.bids = bids;
    if (text(lotResult.TenderResultCode) !== "selec-w") continue;
    // Follow explicit settled-contract -> tender -> tendering-party references.
    // A referenced tender can belong to a group; its value must not be assigned to one lot.
    const contractRefs = array(lotResult.SettledContract);
    const tenderIds = unique(
      contractRefs.flatMap((ref) =>
        array(contracts.get(text(ref.ID))?.LotTender).map((t) => text(t.ID)),
      ),
    );
    const winning = tenderIds.map((id) => tenders.get(id));
    existing.winners = unique([
      ...existing.winners,
      ...winning.flatMap((t) =>
        array(t?.TenderingParty).flatMap((p) => parties.get(text(p.ID)) || []),
      ),
    ]);
    const values = winning.map((t) =>
      amount(t?.LegalMonetaryTotal?.PayableAmount),
    );
    if (
      existing.awardedValue === null &&
      contractRefs.length &&
      contractRefs.every((ref) => {
        const refs = array(contracts.get(text(ref.ID))?.LotTender);
        return refs.length > 0 && refs.every((t) => tenders.has(text(t.ID)));
      }) &&
      winning.length &&
      winning.every((t) => text(t?.TenderLot?.ID) === id) &&
      values.every(
        (v) =>
          v.value !== null && v.currency && v.currency === values[0].currency,
      )
    ) {
      existing.awardedValue = values.reduce((sum, v) => sum + v.value, 0);
      existing.awardedCurrency = values[0].currency;
    }
  }
  n.winners = unique([...n.winners, ...n.lots.flatMap((l) => l.winners)]);
  n.currency = n.estimatedCurrency || n.awardedCurrency || n.currency;
  n.fullContentAvailable = true;
  n.contentUnavailable = false;
  n.contentVersion = CONTENT_VERSION;
  n.contentCheckedAt = new Date().toISOString();
  n.flags = getFlags(n);
  return n;
}
