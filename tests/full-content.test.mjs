import test from "node:test";
import { parse } from "csv-parse/sync";
import assert from "node:assert/strict";
import {
  normalize,
  reuseEnrichment,
  toCSV,
} from "../scripts/lib/normalize.mjs";
import { CONTENT_VERSION } from "../scripts/lib/eforms.mjs";
import {
  contentRequest,
  contentBatchRequest,
  matchContentBatch,
  enrichPlan,
  enrichLegacy,
  enrichContent,
  enrichmentQueue,
  enrichmentCoverage,
} from "../scripts/lib/full-content.mjs";
const notice = (id = "PLAN-12") =>
  normalize({
    id,
    noticeId: id.startsWith("PLAN") ? 0 : Number(id.split("-")[1]),
    isPlan: id.startsWith("PLAN"),
    datePublished: "2026-10-01T12:00:00Z",
    dateModified: "2026-10-01T12:00:00Z",
    titleFi: "Summary",
    lots: [{ id: "LOT-1" }],
  });
const plan = () => ({
  id: 12,
  planData: {
    name: [
      { languageID: "ENG", value: "English" },
      { languageID: "FIN", value: "Suunnitelma" },
    ],
    buyerOrganization: {
      contact: { electronicMail: "private@example.invalid" },
    },
    estimatedMinContractAmount: { value: 0, currencyID: "EUR" },
    estimatedMaxContractAmount: { value: 100, currencyID: "EUR" },
    procurementPlanLots: [
      {
        id: "LOT-1",
        name: [{ languageID: "FIN", value: "Osa" }],
        description: [{ languageID: "FIN", value: "Koko kuvaus" }],
        itemClassificationCode: [
          { itemClassificationCode: { value: "72000000" } },
        ],
        countrySubentityCode: { value: "FI1D7" },
      },
    ],
  },
});
const legacy = () => ({
  id: 20,
  contactPerson: { email: "private@example.invalid" },
  procurementObject: {
    shortDescription: ["Official", "text"],
    estimatedValue: { type: 1, value: 0, currency: "SEK" },
    totalValue: { type: 2, minValue: 10, maxValue: 100, currency: "EUR" },
    mainCpvCode: { code: "72000000" },
  },
  objectDescriptions: [
    {
      lotNumber: "LOT-1",
      title: "Osa",
      descrProcurement: ["Full lot text"],
      nutsCodes: ["FI1B1"],
      mainCpvCode: { code: "48000000" },
      awardContract: {
        awardedContracts: [
          {
            finalTotalValue: { type: 1, value: 100, currency: "EUR" },
            numberOfTenders: { total: 0 },
            contractors: [
              {
                officialName: "Public company",
                email: "private@example.invalid",
              },
            ],
          },
          {
            finalTotalValue: { type: 1, value: 50, currency: "EUR" },
            contractors: [{ officialName: "Public company" }],
          },
        ],
      },
    },
  ],
});
test("selects verified full-content endpoints and rejects unsupported identities", () => {
  assert.equal(
    contentRequest(notice()),
    "https://api.hankintailmoitukset.fi/avp-eforms/external-read/v1/plan/12",
  );
  assert.equal(
    contentRequest(notice("EF-20")),
    "https://api.hankintailmoitukset.fi/avp-eforms/external-read/v1/notice/20",
  );
  assert.equal(
    contentRequest(notice("OLD-20")),
    "https://api.hankintailmoitukset.fi/avp-notice/api/avp/notices/20",
  );
  assert.throws(() =>
    contentRequest({ ...notice(), id: "PLAN-https://example.invalid" }),
  );
});
test("full queue includes all formats, skips current content and retries unavailable records after seven days", () => {
  const now = Date.parse("2026-10-12T00:00:00Z");
  const ns = [
    notice("PLAN-12"),
    notice("OLD-20"),
    notice("EF-20"),
    {
      ...notice("EF-21"),
      fullContentAvailable: true,
      contentVersion: CONTENT_VERSION,
    },
    {
      ...notice("EF-22"),
      contentUnavailable: true,
      contentCheckedAt: "2026-10-10T00:00:00Z",
    },
    {
      ...notice("EF-23"),
      contentUnavailable: true,
      contentCheckedAt: "2026-10-01T00:00:00Z",
    },
  ];
  assert.deepEqual(
    enrichmentQueue(ns, Infinity, now).map((n) => n.id),
    ["EF-23", "EF-20", "OLD-20", "PLAN-12"],
  );
  assert.equal(enrichmentQueue(ns, 2, now).length, 2);
  assert.equal(enrichmentCoverage(ns).complete, false);
});
test("plans retain original lot text and range without inventing a single estimate or saving contacts", () => {
  const original = notice(),
    n = enrichPlan(original, plan());
  assert.equal(n.title, "Suunnitelma");
  assert.equal(n.lots[0].description, "Koko kuvaus");
  assert.deepEqual(n.cpvCodes, ["72000000"]);
  assert.deepEqual(n.regions, ["Lappi"]);
  assert.equal(n.estimatedValue, null);
  assert.deepEqual(n.plannedValueRange, {
    min: 0,
    max: 100,
    minCurrency: "EUR",
    maxCurrency: "EUR",
  });
  assert.equal(n.contentVersion, CONTENT_VERSION);
  assert.equal(n.fullContentAvailable, true);
  assert.ok(!JSON.stringify(n).includes("private@example.invalid"));
  assert.equal(original.title, "Summary");
  assert.throws(() => enrichPlan(original, { ...plan(), id: 13 }));
  const merged = reuseEnrichment({ ...original, lots: [] }, n);
  assert.equal(merged.fullContentAvailable, true);
  assert.equal(merged.plannedValueRange.min, 0);
});
test("legacy content keeps zero, descriptions and explicitly grouped same-currency awards without default bid counts or personal fields", () => {
  const n = enrichLegacy(notice("OLD-20"), legacy());
  assert.equal(n.description, "Official\n\ntext");
  assert.equal(n.estimatedValue, 0);
  assert.equal(n.estimatedCurrency, "SEK");
  assert.equal(n.awardedValue, null);
  assert.equal(n.lots[0].awardedValue, 150);
  assert.equal(n.lots[0].bids, null);
  assert.deepEqual(n.winners, ["Public company"]);
  assert.deepEqual(n.regions, ["Uusimaa"]);
  assert.ok(!JSON.stringify(n).includes("private@example.invalid"));
});
test("legacy withheld, ranged, unknown and mixed-currency values cannot create a lot total", () => {
  for (const modify of [
    (x) =>
      (x.objectDescriptions[0].awardContract.awardedContracts[1].finalTotalValue.currency =
        "SEK"),
    (x) =>
      (x.objectDescriptions[0].awardContract.awardedContracts[1].finalTotalValue.disagreeToBePublished = true),
    (x) =>
      (x.objectDescriptions[0].awardContract.awardedContracts[1].finalTotalValue.type = 0),
    (x) =>
      delete x.objectDescriptions[0].awardContract.awardedContracts[1]
        .finalTotalValue.value,
  ]) {
    const x = legacy();
    modify(x);
    assert.equal(enrichLegacy(notice("OLD-20"), x).lots[0].awardedValue, null);
  }
  const x = legacy();
  x.objectDescriptions[0].awardContract.awardedContracts.forEach(
    (a) => (a.disagreeContractorInformationToBePublished = true),
  );
  assert.deepEqual(enrichLegacy(notice("OLD-20"), x).winners, []);
});
test("malformed or mismatched responses fail instead of appearing enriched", () => {
  assert.throws(() => enrichContent(notice("EF-20"), { id: 21, eForm: "x" }));
  assert.throws(() => enrichLegacy(notice("OLD-20"), { ...legacy(), id: 21 }));
  assert.throws(() => enrichPlan(notice(), { id: 12, planData: {} }));
});

test("bulk requests use repeated id parameters, enforce 50-record limits and match exact returned identities", () => {
  const ns = [notice("EF-20"), notice("EF-21")],
    url = new URL(contentBatchRequest(ns));
  assert.deepEqual(url.searchParams.getAll("id"), ["20", "21"]);
  assert.equal(url.pathname, "/avp-eforms/external-read/v1/notices");
  assert.equal(
    new URL(contentBatchRequest([notice()])).pathname,
    "/avp-eforms/external-read/v1/plans",
  );
  assert.throws(() => contentBatchRequest([]));
  assert.throws(() => contentBatchRequest(Array(51).fill(ns[0])));
  assert.throws(() => contentBatchRequest([ns[0], notice()]));
  assert.throws(() => contentBatchRequest([notice("OLD-20")]));
  const responses = [
    { id: 21, eForm: "second" },
    { id: 20, eForm: "first" },
  ];
  const matched = matchContentBatch(ns, responses);
  assert.equal(matched.get(20).eForm, "first");
  assert.equal(matchContentBatch(ns, [responses[0]]).has(20), false);
  assert.throws(() => matchContentBatch(ns, [{ id: 30 }]));
  assert.throws(() => matchContentBatch(ns, [responses[0], responses[0]]));
  assert.throws(() => matchContentBatch(ns, {}));
});

test("extractor upgrades revisit unchanged cached content and report current coverage truthfully", () => {
  const old = {
    ...notice("EF-20"),
    fullContentAvailable: true,
    contentVersion: CONTENT_VERSION - 1,
  };
  const current = {
    ...notice("EF-21"),
    fullContentAvailable: true,
    contentVersion: CONTENT_VERSION,
  };
  assert.deepEqual(
    enrichmentQueue([current, old]).map((n) => n.id),
    ["EF-20"],
  );
  assert.deepEqual(enrichmentCoverage([old, current]), {
    total: 2,
    enriched: 1,
    unavailable: 0,
    pending: 1,
    complete: false,
  });
  assert.equal(enrichmentCoverage([current]).complete, true);
});

test("planning ranges and full lot text round-trip through researcher CSV downloads", () => {
  const n = enrichPlan(notice(), plan());
  const [row] = parse(toCSV([n]), { columns: true, bom: true });
  assert.equal(row.estimatedValue, "");
  assert.deepEqual(JSON.parse(row.plannedValueRange), n.plannedValueRange);
  assert.deepEqual(JSON.parse(row.lots), n.lots);
});
