import assert from "node:assert/strict";
import test from "node:test";
import {
  defaults,
  fold,
  matchesQuery,
  searchText,
  matchesFilters,
  sortNotices,
  helsinkiDay,
  readFilters,
  writeFilters,
} from "../src/lib/discovery.ts";
import { messages, translate } from "../src/i18n.ts";

const notice = {
  id: "a",
  noticeNumber: "2026-123",
  title: "Päiväkodin uusi rakennus",
  description: "Suunnittelu ja rakentaminen",
  buyer: "Esimerkkikunta",
  businessId: "1234567-8",
  winners: ["Malliyritys Oy"],
  category: "Construction",
  regions: ["Uusimaa", "Pirkanmaa"],
  buyerType: "Municipality",
  procedure: "open",
  cpvCodes: ["45210000", "71200000"],
  flags: ["short-window"],
  status: "Active",
  superseded: false,
  published: "2026-10-10T21:30:00Z",
  modified: "2026-10-11T09:00:00Z",
  deadline: "2026-10-20T20:59:00Z",
  estimatedValue: 100,
  estimatedCurrency: "EUR",
  awardedValue: null,
  awardedCurrency: null,
};
const f = (overrides) => ({ ...defaults, ...overrides });

test("word, phrase and accent-insensitive matching have distinct semantics", () => {
  const text = fold("Päiväkodin uusi rakennus");
  assert.equal(matchesQuery(text, "paivakodin rakennus", "all"), true);
  assert.equal(matchesQuery(text, "päiväkodin toimisto", "all"), false);
  assert.equal(matchesQuery(text, "päiväkodin toimisto", "any"), true);
  assert.equal(matchesQuery(text, "uusi rakennus", "phrase"), true);
  assert.equal(matchesQuery(text, "päiväkodin rakennus", "phrase"), false);
  assert.equal(matchesQuery(text, "   ", "all"), true);
});
test("search scopes isolate buyers and reported awardees and retain identifiers", () => {
  assert.equal(
    matchesQuery(searchText(notice, "buyer"), "1234567-8", "all"),
    true,
  );
  assert.equal(
    matchesQuery(searchText(notice, "supplier"), "Malliyritys", "all"),
    true,
  );
  assert.equal(
    matchesQuery(searchText(notice, "title"), "Malliyritys", "all"),
    false,
  );
  assert.equal(
    matchesQuery(searchText(notice, "all"), "2026-123 4521", "all"),
    true,
  );
});
test("combined filters include all reported performance regions and CPV prefixes", () => {
  assert.equal(
    matchesFilters(
      notice,
      f({
        region: "Pirkanmaa",
        category: "Construction",
        buyerType: "Municipality",
        procedure: "open",
        cpv: "45",
        signal: "short-window",
      }),
    ),
    true,
  );
  assert.equal(matchesFilters(notice, f({ region: "Lappi" })), false);
  assert.equal(matchesFilters(notice, f({ cpv: "33" })), false);
});
test("buyer filter is exact and superseded records require explicit opt-in", () => {
  assert.equal(matchesFilters(notice, f({ buyer: "Esimerkki" })), false);
  assert.equal(matchesFilters({ ...notice, superseded: true }, f({})), false);
  assert.equal(
    matchesFilters(
      { ...notice, superseded: true },
      f({ includeEarlier: true }),
    ),
    true,
  );
});
test("estimate and award ranges use separate compatible EUR values", () => {
  const awarded = { ...notice, awardedValue: 80, awardedCurrency: "EUR" };
  assert.equal(matchesFilters(awarded, f({ min: "90", max: "110" })), true);
  assert.equal(
    matchesFilters(awarded, f({ valueKind: "award", min: "90" })),
    false,
  );
  assert.equal(
    matchesFilters(awarded, f({ valueKind: "award", min: "70", max: "90" })),
    true,
  );
  assert.equal(
    matchesFilters(
      { ...awarded, awardedCurrency: "SEK" },
      f({ valueKind: "award", min: "0" }),
    ),
    false,
  );
});
test("unknown amounts differ from reported zero in filtering", () => {
  assert.equal(
    matchesFilters({ ...notice, estimatedValue: null }, f({ min: "0" })),
    false,
  );
  assert.equal(
    matchesFilters(
      { ...notice, estimatedValue: 0 },
      f({ min: "0", max: "0", valueKnown: "reported" }),
    ),
    true,
  );
  assert.equal(
    matchesFilters(
      { ...notice, estimatedValue: null },
      f({ valueKnown: "missing" }),
    ),
    true,
  );
  assert.equal(
    matchesFilters(notice, f({ valueKind: "award", valueKnown: "missing" })),
    true,
  );
});
test("publication ranges include full Helsinki days across UTC midnight", () => {
  assert.equal(helsinkiDay(notice.published), "2026-10-11");
  assert.equal(
    matchesFilters(
      notice,
      f({ publishedFrom: "2026-10-11", publishedTo: "2026-10-11" }),
    ),
    true,
  );
  assert.equal(matchesFilters(notice, f({ publishedTo: "2026-10-10" })), false);
  assert.equal(helsinkiDay("not-a-date"), "");
});
test("deadline ranges exclude unknown dates and use inclusive local boundaries", () => {
  assert.equal(
    matchesFilters(
      notice,
      f({ deadlineFrom: "2026-10-20", deadlineTo: "2026-10-20" }),
    ),
    true,
  );
  assert.equal(
    matchesFilters(
      { ...notice, deadline: null },
      f({ deadlineFrom: "2026-10-20" }),
    ),
    false,
  );
  assert.equal(matchesFilters({ ...notice, deadline: null }, f({})), true);
});
test("relative publication windows exclude future and older records", () => {
  const now = Date.parse("2026-10-12T00:00:00Z");
  assert.equal(matchesFilters(notice, f({ period: "7" }), now), true);
  assert.equal(
    matchesFilters(
      { ...notice, published: "2026-11-01T00:00:00Z" },
      f({ period: "7" }),
      now,
    ),
    false,
  );
  assert.equal(
    matchesFilters(
      { ...notice, published: "2026-09-01T00:00:00Z" },
      f({ period: "7" }),
      now,
    ),
    false,
  );
});
test("EUR sorting puts unknown amounts and other currencies last in either direction", () => {
  const records = [
    { ...notice, id: "unknown", estimatedValue: null },
    {
      ...notice,
      id: "foreign",
      estimatedValue: 1000000,
      estimatedCurrency: "SEK",
    },
    { ...notice, id: "zero", estimatedValue: 0 },
    { ...notice, id: "eur", estimatedValue: 100 },
  ];
  assert.deepEqual(
    sortNotices(records, "estimateAsc").map((n) => n.id),
    ["zero", "eur", "foreign", "unknown"],
  );
  assert.deepEqual(
    sortNotices(records, "estimateDesc").map((n) => n.id),
    ["eur", "zero", "foreign", "unknown"],
  );
  assert.equal(records[0].id, "unknown");
});
test("award sorting uses awarded amounts and deadline sorting puts missing dates last", () => {
  const records = [
    {
      ...notice,
      id: "a",
      awardedValue: 50,
      awardedCurrency: "EUR",
      deadline: null,
    },
    { ...notice, id: "b", awardedValue: 90, awardedCurrency: "EUR" },
  ];
  assert.deepEqual(
    sortNotices(records, "awardDesc").map((n) => n.id),
    ["b", "a"],
  );
  assert.deepEqual(
    sortNotices(records, "deadline").map((n) => n.id),
    ["b", "a"],
  );
});
test("every advanced filter survives a shareable URL round trip", () => {
  const filters = f({
    q: "päiväkoti & koulu",
    match: "phrase",
    scope: "title",
    region: "Uusimaa",
    category: "Construction",
    status: "Active",
    buyer: "Esimerkkikunta",
    buyerType: "Municipality",
    procedure: "open",
    cpv: "45",
    signal: "short-window",
    valueKind: "award",
    min: "0",
    max: "10000",
    valueKnown: "reported",
    publishedFrom: "2026-10-01",
    publishedTo: "2026-10-11",
    deadlineFrom: "2026-10-20",
    deadlineTo: "2026-10-30",
    period: "30",
    includeEarlier: true,
  });
  assert.deepEqual(
    readFilters(new URLSearchParams(writeFilters(filters).toString())),
    filters,
  );
  assert.equal(writeFilters(defaults).size, 0);
  assert.equal(
    readFilters(new URLSearchParams("includeEarlier=false")).includeEarlier,
    false,
  );
});
test("legacy shared minimum values remain readable", () => {
  assert.equal(readFilters(new URLSearchParams("minValue=500")).min, "500");
});
test("every translation has Finnish, Swedish and English values", () => {
  for (const [key, values] of Object.entries(messages)) {
    assert.equal(values.length, 3, key);
    values.forEach((value) =>
      assert.ok(typeof value === "string" && value.trim().length > 0, key),
    );
  }
  assert.equal(translate("sv", "Active"), "Öppen");
  assert.equal(translate("fi", "daysLeft", { count: 4 }), "4 päivää jäljellä");
  assert.equal(translate("en", "Construction"), "Construction");
});
