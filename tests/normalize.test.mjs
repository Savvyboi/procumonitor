import test from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  numberOrNull,
  getFlags,
  markSuperseded,
  reuseEnrichment,
  toCSV,
} from "../scripts/lib/normalize.mjs";
const now = new Date("2026-10-11T12:00:00Z");
const raw = {
  id: "EF-123",
  noticeId: 123,
  procedureId: 456,
  isEForms: true,
  mainType: "ContractNotices",
  datePublished: "2026-10-01T12:00:00Z",
  deadline: "2026-10-20T12:00:00Z",
  titleFi: "Ohjelmistot",
  organisationNameFi: "Helsinki",
  organisationType: "la",
  organisationNutsCode: "FI1B1",
  cpvCodes: "48000000 72000000",
  lots: [],
};
test("normalizes real Hilma index fields and official eForms URL", () => {
  const n = normalize(raw, now);
  assert.equal(n.buyer, "Helsinki");
  assert.equal(n.region, "Uusimaa");
  assert.equal(n.buyerType, "Municipality");
  assert.equal(n.category, "IT & software");
  assert.equal(
    n.sourceUrl,
    "https://www.hankintailmoitukset.fi/fi/public/procedure/456/enotice/123",
  );
});
test("unknown numeric values stay unknown, including missing bid counts", () => {
  const n = normalize(
    {
      ...raw,
      mainType: "ContractAwardNotices",
      lots: [{ id: "1", receivedTenderCount: null }],
    },
    now,
  );
  assert.equal(n.lots[0].bids, null);
  assert.equal(n.estimatedValue, null);
  assert.ok(!n.flags.includes("single-bid"));
  assert.equal(numberOrNull(""), null);
  assert.equal(numberOrNull(0), 0);
});
test("single-bid flag requires an award and an explicit count of one", () => {
  assert.ok(
    normalize(
      {
        ...raw,
        mainType: "ContractAwardNotices",
        lots: [{ id: "1", receivedTenderCount: 1 }],
      },
      now,
    ).flags.includes("single-bid"),
  );
  assert.ok(
    !normalize(
      { ...raw, lots: [{ id: "1", receivedTenderCount: 1 }] },
      now,
    ).flags.includes("single-bid"),
  );
});
test("response-window boundary is strictly less than 14 days", () => {
  assert.ok(
    !normalize(
      { ...raw, deadline: "2026-10-15T12:00:00Z" },
      now,
    ).flags.includes("short-window"),
  );
  assert.ok(
    normalize({ ...raw, deadline: "2026-10-14T12:00:00Z" }, now).flags.includes(
      "short-window",
    ),
  );
  assert.ok(
    !normalize(
      { ...raw, deadline: "2026-09-30T12:00:00Z" },
      now,
    ).flags.includes("short-window"),
  );
});
test("near-budget comparison only uses compatible notice totals in EUR", () => {
  const n = normalize(
    {
      ...raw,
      mainType: "ContractAwardNotices",
      estimatedValue: 100,
      currency: "EUR",
      noticeResultTotalAmount: 97,
      noticeResultTotalAmountCurrency: "EUR",
    },
    now,
  );
  assert.ok(n.flags.includes("near-budget"));
  assert.ok(
    !getFlags({ ...n, awardedCurrency: "SEK" }).includes("near-budget"),
  );
  assert.ok(!getFlags({ ...n, estimatedValue: null }).includes("near-budget"));
  assert.ok(!getFlags({ ...n, awardedValue: 101 }).includes("near-budget"));
});
test("expired, cancelled and planned notices receive truthful status", () => {
  assert.equal(
    normalize({ ...raw, deadline: "2026-10-10T12:00:00Z" }, now).status,
    "Closed",
  );
  assert.equal(
    normalize({ ...raw, isCancelled: true }, now).status,
    "Cancelled",
  );
  assert.equal(normalize({ ...raw, isPlan: true }, now).status, "Planning");
});
test("performance region takes precedence over buyer location", () => {
  const n = normalize({ ...raw, nutsCodes: "FI1C1 FI1D7" }, now);
  assert.deepEqual(n.regions, ["Varsinais-Suomi", "Lappi"]);
});
test("explicit links mark earlier notices without collapsing distinct awards", () => {
  const result = markSuperseded([
    { id: "EF-1", relatedIds: [] },
    { id: "EF-2", relatedIds: ["EF-1"] },
  ]);
  assert.equal(result[0].superseded, true);
  assert.equal(result[1].superseded, false);
});
test("CSV neutralizes spreadsheet formulas and preserves quotes and newlines", () => {
  const csv = toCSV([
    {
      ...normalize(raw, now),
      title: ' =HYPERLINK("bad")\nnext',
      buyer: "@SUM(1)",
    },
  ]);
  assert.ok(csv.includes('"\' =HYPERLINK(""bad"")\nnext"'));
  assert.ok(csv.includes('"\'@SUM(1)"'));
});
test("rejects malformed identities and unsafe document URLs", () => {
  assert.throws(() => normalize({ ...raw, id: null }, now));
  assert.equal(
    normalize({ ...raw, procurementDocumentsUrl: "javascript:alert(1)" }, now)
      .documentsUrl,
    null,
  );
});

import { enrichFromXml } from "../scripts/lib/eforms.mjs";
const encode = (s) => Buffer.from(s).toString("base64");
test("decodes eForms XML estimates and tender counts without contact records", () => {
  const xml =
    '<ContractAwardNotice xmlns:cac="urn:cac" xmlns:cbc="urn:cbc" xmlns:ext="urn:ext" xmlns:efac="urn:efac"><cac:ProcurementProject><cac:RequestedTenderTotal><cbc:EstimatedOverallContractAmount currencyID="EUR">100</cbc:EstimatedOverallContractAmount></cac:RequestedTenderTotal></cac:ProcurementProject><ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><efac:EformsExtension><efac:NoticeResult><efac:TotalAmount currencyID="EUR">97</efac:TotalAmount><efac:LotResult><efac:TenderLot><cbc:ID>LOT-1</cbc:ID></efac:TenderLot><efac:ReceivedSubmissionsStatistics><efac:StatisticsCode>tenders</efac:StatisticsCode><efac:StatisticsNumeric>1</efac:StatisticsNumeric></efac:ReceivedSubmissionsStatistics></efac:LotResult></efac:NoticeResult></efac:EformsExtension></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions><cac:Contact><cbc:ElectronicMail>private@example.invalid</cbc:ElectronicMail></cac:Contact></ContractAwardNotice>';
  const n = enrichFromXml(
    normalize(
      { ...raw, mainType: "ContractAwardNotices", lots: [{ id: "LOT-1" }] },
      now,
    ),
    encode(xml),
  );
  assert.equal(n.estimatedValue, 100);
  assert.equal(n.estimatedCurrency, "EUR");
  assert.equal(n.awardedValue, 97);
  assert.ok(n.flags.includes("single-bid"));
  assert.ok(n.flags.includes("near-budget"));
  assert.ok(!JSON.stringify(n).includes("private@example.invalid"));
});
test("rejects DTD/entity payloads and malformed full content", () => {
  assert.throws(() =>
    enrichFromXml(
      normalize(raw, now),
      encode('<!DOCTYPE x [<!ENTITY x "secret">]><x/>'),
    ),
  );
  assert.throws(() => enrichFromXml(normalize(raw, now), encode("not xml")));
});
test("mixed award/estimate currencies do not produce a near-budget flag", () => {
  const n = normalize(
    {
      ...raw,
      mainType: "ContractAwardNotices",
      estimatedValue: 100,
      currency: "EUR",
      noticeResultTotalAmount: 97,
      noticeResultTotalAmountCurrency: "SEK",
    },
    now,
  );
  assert.ok(!n.flags.includes("near-budget"));
});

test("procurement plans use the official public plan route", () => {
  assert.equal(
    normalize({ ...raw, isPlan: true, planId: 789 }, now).sourceUrl,
    "https://www.hankintailmoitukset.fi/fi/public/plan/789",
  );
});

test("CSV retains full public identifiers, multiple regions, source relationships and nested lots", async () => {
  const { parse } = await import("csv-parse/sync");
  const n = normalize(
    {
      ...raw,
      nutsCodes: "FI1C1 FI1D7",
      previousSearchIds: ["EF-earlier"],
      lots: [
        {
          id: "LOT-1",
          titleFi: 'Title "with quotes"',
          winnerOrganisations: "Supplier Oy",
        },
      ],
    },
    now,
  );
  const [row] = parse(toCSV([n]), { columns: true, bom: true });
  assert.equal(row.noticeNumber, n.noticeNumber);
  assert.equal(row.regions, "Varsinais-Suomi; Lappi");
  assert.equal(row.cpvCodes, n.cpvCodes.join("; "));
  assert.equal(row.modified, n.modified);
  assert.equal(row.relatedIds, "EF-earlier");
  assert.deepEqual(JSON.parse(row.lots), n.lots);
});

test("search summaries retain lot descriptions, classifications, deadlines and performance regions", () => {
  const n = normalize(
    {
      ...raw,
      cpvCodes: "",
      lots: [
        {
          id: "LOT-1",
          descriptionFi: "Osan virallinen kuvaus",
          cpvCodes: "72000000",
          nutsCodes: "FI1D7",
          deadline: "2026-10-20T12:00:00Z",
          winnerOrganisations: "Supplier Oy",
        },
      ],
    },
    now,
  );
  assert.equal(n.lots[0].description, "Osan virallinen kuvaus");
  assert.deepEqual(n.lots[0].cpvCodes, ["72000000"]);
  assert.equal(n.lots[0].deadline, "2026-10-20T12:00:00Z");
  assert.deepEqual(n.regions, ["Lappi"]);
  assert.equal(n.regionSource, "performance");
  assert.equal(n.category, "IT & software");
  assert.deepEqual(n.winners, ["Supplier Oy"]);
});
test("summary refresh fills new lot fields without losing unchanged cached eForms", () => {
  const original = normalize({ ...raw, lots: [{ id: "LOT-1" }] }, now);
  const cached = {
    ...original,
    fullContentAvailable: true,
    contentVersion: 2,
    description: "Full official text",
    estimatedValue: 200,
    estimatedCurrency: "EUR",
    lots: [
      {
        ...original.lots[0],
        description: "Full lot text",
        estimatedValue: 100,
        estimatedCurrency: "EUR",
      },
    ],
  };
  const fresh = normalize(
    {
      ...raw,
      lots: [
        {
          id: "LOT-1",
          descriptionFi: "Summary text",
          cpvCodes: "72000000",
          nutsCodes: "FI1D7",
          deadline: "2026-10-20T12:00:00Z",
        },
      ],
    },
    now,
  );
  const n = reuseEnrichment(fresh, cached);
  assert.equal(n.fullContentAvailable, true);
  assert.equal(n.contentVersion, 2);
  assert.equal(n.description, "Full official text");
  assert.equal(n.estimatedValue, 200);
  assert.equal(n.lots[0].estimatedValue, 100);
  assert.equal(n.lots[0].description, "Full lot text");
  assert.deepEqual(n.lots[0].cpvCodes, ["72000000"]);
  assert.deepEqual(n.regions, ["Lappi"]);
  assert.equal(n.lots[0].deadline, "2026-10-20T12:00:00Z");
  const amended = { ...fresh, modified: "2026-10-12T12:00:00Z" };
  assert.equal(reuseEnrichment(amended, cached), amended);
  assert.equal(amended.fullContentAvailable, false);
});
