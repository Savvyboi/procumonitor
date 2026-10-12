import assert from "node:assert/strict";
import test from "node:test";
import { normalize } from "../scripts/lib/normalize.mjs";
import { CONTENT_VERSION, enrichFromXml } from "../scripts/lib/eforms.mjs";
const notice = () =>
  normalize({
    id: "EF-1",
    noticeId: 1,
    datePublished: "2026-10-01T12:00:00Z",
    titleFi: "Hankinta",
    mainType: "ContractAwardNotices",
    lots: [{ id: "LOT-1" }],
  });
const encode = (xml) => Buffer.from(xml).toString("base64");
const xml = ({
  currency = "EUR",
  secondAmount = "50",
  tenderLot = "LOT-1",
  resultCode = "selec-w",
  secondContract = true,
} = {}) => `
<ContractAwardNotice>
  <ProcurementProject><Description languageID="FIN">Virallinen kuvaus</Description></ProcurementProject>
  <ProcurementProjectLot><ID schemeName="Lot">LOT-1</ID><ProcurementProject>
    <Name languageID="FIN">Osa yksi</Name><Description languageID="ENG">English description</Description><Description languageID="FIN">Osan kuvaus</Description>
    <MainCommodityClassification><ItemClassificationCode>72000000</ItemClassificationCode></MainCommodityClassification>
    <RealizedLocation><Address><CountrySubentityCode>FI1D7</CountrySubentityCode></Address></RealizedLocation>
    <RequestedTenderTotal><EstimatedOverallContractAmount currencyID="EUR">200</EstimatedOverallContractAmount></RequestedTenderTotal>
  </ProcurementProject></ProcurementProjectLot>
  <ProcurementProjectLot><ID schemeName="LotsGroup">GLO-1</ID><ProcurementProject><Name>Group</Name></ProcurementProject></ProcurementProjectLot>
  <ProcurementProjectLot><ID schemeName="Lot">LOT-2</ID><ProcurementProject><Name>Second lot</Name></ProcurementProject></ProcurementProjectLot>
  <UBLExtensions><UBLExtension><ExtensionContent><EformsExtension>
    <Organizations>
      <Organization><Company><PartyIdentification><ID>ORG-1</ID></PartyIdentification><PartyName><Name>Voittaja Oy</Name></PartyName><Contact><ElectronicMail>private@example.invalid</ElectronicMail></Contact></Company></Organization>
      <Organization><Company><PartyIdentification><ID>ORG-2</ID></PartyIdentification><PartyName><Name>Losing bidder</Name></PartyName></Company></Organization>
    </Organizations>
    <NoticeResult>
      <LotResult><TenderResultCode>${resultCode}</TenderResultCode><TenderLot><ID>LOT-1</ID></TenderLot>
        <SettledContract><ID>CON-1</ID></SettledContract>${secondContract ? "<SettledContract><ID>CON-2</ID></SettledContract>" : ""}
        <ReceivedSubmissionsStatistics><StatisticsCode>tenders</StatisticsCode><StatisticsNumeric>1</StatisticsNumeric></ReceivedSubmissionsStatistics>
      </LotResult>
      <SettledContract><ID>CON-1</ID><LotTender><ID>TEN-1</ID></LotTender></SettledContract>
      <SettledContract><ID>CON-2</ID><LotTender><ID>TEN-2</ID></LotTender></SettledContract>
      <LotTender><ID>TEN-1</ID><TenderLot><ID>${tenderLot}</ID></TenderLot><TenderingParty><ID>TPA-1</ID></TenderingParty><LegalMonetaryTotal><PayableAmount currencyID="EUR">100</PayableAmount></LegalMonetaryTotal></LotTender>
      <LotTender><ID>TEN-2</ID><TenderLot><ID>LOT-1</ID></TenderLot><TenderingParty><ID>TPA-1</ID></TenderingParty><LegalMonetaryTotal><PayableAmount currencyID="${currency}">${secondAmount}</PayableAmount></LegalMonetaryTotal></LotTender>
      <LotTender><ID>TEN-3</ID><TenderLot><ID>LOT-1</ID></TenderLot><TenderingParty><ID>TPA-2</ID></TenderingParty><LegalMonetaryTotal><PayableAmount currencyID="EUR">999</PayableAmount></LegalMonetaryTotal></LotTender>
      <TenderingParty><ID>TPA-1</ID><Tenderer><ID>ORG-1</ID></Tenderer></TenderingParty>
      <TenderingParty><ID>TPA-2</ID><Tenderer><ID>ORG-2</ID></Tenderer></TenderingParty>
    </NoticeResult>
  </EformsExtension></ExtensionContent></UBLExtension></UBLExtensions>
</ContractAwardNotice>`;

test("retains public lot descriptions, missing lots, CPVs and performance regions", () => {
  const original = notice();
  const n = enrichFromXml(original, encode(xml()));
  assert.deepEqual(
    n.lots.map((l) => l.id),
    ["LOT-1", "LOT-2"],
  );
  assert.equal(n.lots[0].title, "Osa yksi");
  assert.equal(n.lots[0].description, "Osan kuvaus");
  assert.equal(n.description, "Virallinen kuvaus");
  assert.equal(n.lots[0].estimatedValue, 200);
  assert.equal(n.estimatedValue, null);
  assert.deepEqual(n.regions, ["Lappi"]);
  assert.deepEqual(n.cpvCodes, ["72000000"]);
  assert.equal(n.contentVersion, CONTENT_VERSION);
  assert.equal(original.lots[0].estimatedValue, null);
  assert.equal(n.lots[1].bids, null);
});
test("uses explicit settled-contract links for lot awards and winners, excluding losing bidders and contacts", () => {
  const n = enrichFromXml(notice(), encode(xml()));
  assert.equal(n.lots[0].awardedValue, 150);
  assert.equal(n.lots[0].awardedCurrency, "EUR");
  assert.equal(n.awardedValue, null);
  assert.deepEqual(n.winners, ["Voittaja Oy"]);
  assert.deepEqual(n.lots[0].winners, ["Voittaja Oy"]);
  assert.ok(n.flags.includes("single-bid"));
  assert.ok(!JSON.stringify(n).includes("private@example.invalid"));
  assert.ok(!JSON.stringify(n).includes("Losing bidder"));
});
test("does not add incompatible, incomplete or group tender values into a lot award", () => {
  for (const opts of [
    { currency: "SEK" },
    { secondAmount: "" },
    { tenderLot: "GLO-1" },
    { resultCode: "clos-nw" },
  ]) {
    const n = enrichFromXml(notice(), encode(xml(opts)));
    assert.equal(n.lots[0].awardedValue, null);
    assert.equal(n.lots[0].awardedCurrency, null);
  }
  assert.equal(
    enrichFromXml(notice(), encode(xml({ secondAmount: "0" }))).lots[0]
      .awardedValue,
    100,
  );
});
test("does not count uncontracted tenders or duplicate contract references twice", () => {
  assert.equal(
    enrichFromXml(notice(), encode(xml({ secondContract: false }))).lots[0]
      .awardedValue,
    100,
  );
  const duplicate = xml().replace(
    "<SettledContract><ID>CON-2</ID></SettledContract>",
    "<SettledContract><ID>CON-1</ID></SettledContract>",
  );
  assert.equal(
    enrichFromXml(notice(), encode(duplicate)).lots[0].awardedValue,
    100,
  );
});
test("preserves reported zero and currencies and ignores fractional tender counts", () => {
  const original = notice();
  original.lots[0].awardedValue = 0;
  original.lots[0].awardedCurrency = "SEK";
  const n = enrichFromXml(
    original,
    encode(
      xml().replace(
        "<StatisticsNumeric>1</StatisticsNumeric>",
        "<StatisticsNumeric>1.5</StatisticsNumeric>",
      ),
    ),
  );
  assert.equal(n.lots[0].awardedValue, 0);
  assert.equal(n.lots[0].awardedCurrency, "SEK");
  assert.equal(n.lots[0].bids, null);
});
test("missing contract or tender references cannot create partial successful-looking lot totals", () => {
  for (const payload of [
    xml().replace(
      "<SettledContract><ID>CON-2</ID><LotTender><ID>TEN-2</ID></LotTender></SettledContract>",
      "",
    ),
    xml().replace(
      "<SettledContract><ID>CON-2</ID><LotTender><ID>TEN-2</ID></LotTender></SettledContract>",
      "<SettledContract><ID>CON-2</ID></SettledContract>",
    ),
    xml().replace(
      "<SettledContract><ID>CON-2</ID><LotTender><ID>TEN-2</ID></LotTender></SettledContract>",
      "<SettledContract><ID>CON-2</ID><LotTender><ID>MISSING</ID></LotTender></SettledContract>",
    ),
  ])
    assert.equal(
      enrichFromXml(notice(), encode(payload)).lots[0].awardedValue,
      null,
    );
});

test("full official project text replaces a shortened search description", () => {
  const n = { ...notice(), description: "Short search summary" };
  assert.equal(
    enrichFromXml(n, encode(xml())).description,
    "Virallinen kuvaus",
  );
  assert.equal(
    enrichFromXml(
      n,
      encode(
        xml().replace(
          '<Description languageID="FIN">Virallinen kuvaus</Description>',
          "<Name>Hankinta</Name>",
        ),
      ),
    ).description,
    "Short search summary",
  );
});
