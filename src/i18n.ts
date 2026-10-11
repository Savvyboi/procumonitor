import { createContext, useContext } from "react";
export type Language = "fi" | "sv" | "en";
export const locales = { fi: "fi-FI", sv: "sv-FI", en: "en-GB" };
export const messages: Record<string, [string, string, string]> = {
  tagline: [
    "Julkiset hankinnat päivänvaloon",
    "Offentliga upphandlingar i dagsljus",
    "Bringing public procurement to light",
  ],
  explore: [
    "Tutki hankintoja",
    "Utforska upphandlingar",
    "Explore procurement",
  ],
  categories: [
    "Hankinnat aloittain",
    "Upphandlingar per bransch",
    "Procurement by category",
  ],
  buyers: ["Hankintayksiköt", "Upphandlande enheter", "Public buyers"],
  spending: ["Ostolaskut", "Inköpsfakturor", "Invoice spending"],
  signals: [
    "Tarkastelun aiheet",
    "Signaler att undersöka",
    "Transparency signals",
  ],
  saved: ["Tallennetut", "Sparade", "Saved notices"],
  about: [
    "Tietoa ja menetelmät",
    "Om tjänsten och metoder",
    "About & methodology",
  ],
  feeds: ["Seuraa syötteitä", "Följ flöden", "Follow feeds"],
  navigation: ["Päävalikko", "Huvudmeny", "Main navigation"],
  openMenu: ["Avaa valikko", "Öppna menyn", "Open navigation"],
  close: ["Sulje", "Stäng", "Close"],
  home: ["Tilimyyrän etusivu", "Tilimyyräs startsida", "Tilimyyrä home"],
  skip: ["Siirry sisältöön", "Hoppa till innehållet", "Skip to content"],
  independent: [
    "Riippumaton. Avoin. Kaikille.",
    "Oberoende. Öppen. För alla.",
    "Independent. Open. For everyone.",
  ],
  civic: [
    "Kaivetaan esiin yhteiset hankinnat.",
    "Vi gräver fram våra gemensamma inköp.",
    "Digging into the public picture.",
  ],
  civicBody: [
    "Avoin työkalu yhteisten rahojen ymmärtämiseen.",
    "Ett öppet verktyg för att förstå våra gemensamma pengar.",
    "An open tool for understanding public money.",
  ],
  light: ["Vaalea teema", "Ljust tema", "Light theme"],
  dark: ["Tumma teema", "Mörkt tema", "Dark theme"],
  language: [
    "Käyttöliittymän kieli",
    "Gränssnittets språk",
    "Interface language",
  ],
  observatory: [
    "SUOMEN JULKISET HANKINNAT",
    "FINLANDS OFFENTLIGA UPPHANDLINGAR",
    "FINNISH PUBLIC PROCUREMENT",
  ],
  hero1: ["Yhteiset rahat.", "Gemensamma pengar.", "Public money."],
  hero2: ["Pintaa syvemmälle.", "Under ytan.", "Below the surface."],
  heroBody: [
    "Kuka hankkii, mitä ja missä? Tutki virallisia hankintailmoituksia ja seuraa julkisten rahojen käyttöä.",
    "Vem köper, vad och var? Utforska officiella upphandlingsannonser och följ användningen av offentliga medel.",
    "Who is buying, what, and where? Explore official notices and follow the use of public money.",
  ],
  mascot: [
    "Tilimyyrän kontiainen",
    "Tilimyyräs europeiska mullvad",
    "Tilimyyrä’s European mole",
  ],
  mascotNote: [
    "Uteliaisuus kuuluu kaikille.",
    "Nyfikenhet är till för alla.",
    "Curiosity belongs to everyone.",
  ],
  updated: ["Päivitetty", "Uppdaterat", "Updated"],
  schedule: [
    "Päivitysaikataulu: 6 tuntia",
    "Uppdateringsschema: 6 timmar",
    "Refresh schedule: 6 hours",
  ],
  loading: [
    "Kaivetaan tietoja esiin…",
    "Gräver fram uppgifter…",
    "Digging up the data…",
  ],
  loadError: [
    "Tietoja ei voitu ladata. Yritä uudelleen tai käy Hilmassa.",
    "Uppgifterna kunde inte laddas. Försök igen eller besök Hilma.",
    "The snapshot could not be loaded. Try again or visit Hilma.",
  ],
  retry: ["Yritä uudelleen", "Försök igen", "Try again"],
  notices: ["ilmoitusta", "annonser", "notices"],
  snapshot: [
    "Ilmoituksia aineistossa",
    "Annonser i materialet",
    "Notices in the snapshot",
  ],
  window: [
    "{days} päivän julkaisujakso",
    "Publiceringar under {days} dagar",
    "{days}-day publication window",
  ],
  activeCount: ["Avoinna tarjouksille", "Öppna för anbud", "Open for bids"],
  activeHint: [
    "Aktiiviset ilmoitukset, joiden määräaika ei ole päättynyt",
    "Aktiva annonser vars tidsfrist inte har löpt ut",
    "Active notices with no passed deadline",
  ],
  estimates: [
    "Ilmoitetut arviot",
    "Rapporterade uppskattningar",
    "Reported estimates",
  ],
  estimateCoverage: [
    "EUR-arvo {count} ilmoituksesta · ei toteutuneita menoja",
    "EUR-värden från {count} annonser · inte faktiska utgifter",
    "EUR values from {count} notices · not actual spending",
  ],
  signalHint: [
    "Tutkimisen aiheita, eivät syytöksiä",
    "Skäl att undersöka, inte anklagelser",
    "Prompts to investigate, not accusations",
  ],
  noticeboard: [
    "HANKINTAILMOITUKSET",
    "UPPHANDLINGSANNONSER",
    "THE NOTICEBOARD",
  ],
  savedHeading: [
    "Oma seurantalistasi.",
    "Din bevakningslista.",
    "Your watchlist.",
  ],
  savedBody: [
    "Tälle selaimelle tallentamasi ilmoitukset yhdessä paikassa.",
    "Dina annonser sparade i den här webbläsaren, på ett ställe.",
    "The notices saved in this browser, all in one place.",
  ],
  signalsHeading: [
    "Aihetta tarkempaan lukuun.",
    "Värt en närmare titt.",
    "Worth a closer look.",
  ],
  signalsBody: [
    "Tutki selitettäviä havaintoja. Tarkista aina alkuperäinen ilmoitus ja sen muutokset.",
    "Undersök förklarbara signaler. Kontrollera alltid den ursprungliga annonsen och ändringarna.",
    "Explore explainable signals. Always check the original notice and amendments.",
  ],
  export: ["Lataa tulokset", "Ladda ner resultaten", "Export results"],
  search: ["Hae hankintoja", "Sök upphandlingar", "Search procurement"],
  searchPlaceholder: [
    "Hae sanoilla, Y-tunnuksella, ilmoitusnumerolla tai CPV-koodilla…",
    "Sök med ord, FO-nummer, annonsnummer eller CPV-kod…",
    "Search words, Business IDs, notice numbers or CPV codes…",
  ],
  allRegions: ["Kaikki alueet", "Alla regioner", "All regions"],
  allCategories: ["Kaikki toimialat", "Alla branscher", "All categories"],
  allStatuses: ["Kaikki tilat", "Alla statusar", "All statuses"],
  all: ["Kaikki", "Alla", "All"],
  moreFilters: ["Tarkempi haku", "Avancerad sökning", "More filters"],
  clear: ["Tyhjennä suodattimet", "Rensa filtren", "Clear filters"],
  remove: ["Poista suodatin", "Ta bort filter", "Remove filter"],
  searchMode: ["Hakutapa", "Sökläge", "Match"],
  allWords: ["Kaikki sanat", "Alla ord", "All words"],
  anyWords: ["Jokin sanoista", "Något av orden", "Any word"],
  phrase: ["Tarkka ilmaus", "Exakt fras", "Exact phrase"],
  searchScope: ["Hae kentästä", "Sök i fält", "Search within"],
  allFields: ["Kaikki hakukentät", "Alla sökfält", "All searchable fields"],
  title: ["Otsikko", "Rubrik", "Title"],
  buyer: ["Hankintayksikkö", "Upphandlande enhet", "Buyer"],
  supplier: ["Valittu toimittaja", "Tilldelad leverantör", "Reported awardee"],
  description: ["Kuvaus", "Beskrivning", "Description"],
  region: ["Alue", "Region", "Region"],
  category: ["Toimiala", "Bransch", "Category"],
  status: ["Tila", "Status", "Status"],
  buyerType: [
    "Hankintayksikön tyyppi",
    "Typ av upphandlande enhet",
    "Buyer type",
  ],
  procedure: ["Menettely", "Förfarande", "Procedure"],
  cpv: [
    "CPV-koodi tai sen alku",
    "CPV-kod eller kodens början",
    "CPV code or prefix",
  ],
  cpvHint: [
    "Esim. 45 rakennustöille",
    "T.ex. 45 för byggarbeten",
    "E.g. 45 for construction",
  ],
  valueKind: ["Arvon tyyppi", "Värdetyp", "Value type"],
  estimate: ["Arvioitu arvo", "Uppskattat värde", "Estimated value"],
  award: ["Sopimuksen arvo", "Tilldelat värde", "Awarded value"],
  min: ["Vähintään (EUR)", "Minst (EUR)", "Minimum (EUR)"],
  max: ["Enintään (EUR)", "Högst (EUR)", "Maximum (EUR)"],
  noLimit: ["Ei rajaa", "Ingen gräns", "No limit"],
  valueKnown: ["Arvon saatavuus", "Tillgängligt värde", "Value availability"],
  reported: ["Arvo ilmoitettu", "Värde rapporterat", "Value reported"],
  missing: ["Arvo puuttuu", "Värde saknas", "Value missing"],
  period: [
    "Julkaistu viimeisten",
    "Publicerad under de senaste",
    "Published within",
  ],
  entire: ["Koko aineisto", "Hela materialet", "Entire snapshot"],
  days: ["{count} päivän aikana", "{count} dagarna", "{count} days"],
  publishedFrom: [
    "Julkaistu aikaisintaan",
    "Publicerad tidigast",
    "Published from",
  ],
  publishedTo: ["Julkaistu viimeistään", "Publicerad senast", "Published to"],
  deadlineFrom: [
    "Määräaika aikaisintaan",
    "Tidsfrist tidigast",
    "Deadline from",
  ],
  deadlineTo: ["Määräaika viimeistään", "Tidsfrist senast", "Deadline to"],
  signal: ["Tarkastelun aihe", "Signal att undersöka", "Transparency signal"],
  includeEarlier: [
    "Näytä myös aiemmat versiot",
    "Visa även tidigare versioner",
    "Include earlier versions",
  ],
  filterNote: [
    "Arvorajat koskevat vain valitun tyypin EUR-arvoja. Päivämäärät ovat Suomen aikaa.",
    "Värdegränser gäller endast EUR-värden av vald typ. Datum avser finsk tid.",
    "Value limits apply only to EUR amounts of the selected type. Dates use Helsinki time.",
  ],
  invalidRange: [
    "Tarkista rajat: alaraja ei voi ylittää ylärajaa.",
    "Kontrollera gränserna: den nedre får inte överstiga den övre.",
    "Check the ranges: a lower limit cannot exceed its upper limit.",
  ],
  sort: ["Järjestä", "Sortera", "Sort by"],
  newest: ["Uusimmat ensin", "Nyaste först", "Newest first"],
  oldest: ["Vanhimmat ensin", "Äldsta först", "Oldest first"],
  modified: ["Viimeksi muutetut", "Senast ändrade", "Recently modified"],
  deadline: ["Määräaika", "Tidsfrist", "Deadline"],
  estimateDesc: [
    "Suurin arvio (EUR)",
    "Högsta uppskattning (EUR)",
    "Highest estimate (EUR)",
  ],
  estimateAsc: [
    "Pienin arvio (EUR)",
    "Lägsta uppskattning (EUR)",
    "Lowest estimate (EUR)",
  ],
  awardDesc: [
    "Suurin sopimusarvo (EUR)",
    "Högsta tilldelning (EUR)",
    "Highest award (EUR)",
  ],
  awardAsc: [
    "Pienin sopimusarvo (EUR)",
    "Lägsta tilldelning (EUR)",
    "Lowest award (EUR)",
  ],
  perPage: ["Tuloksia sivulla", "Resultat per sida", "Results per page"],
  matches: [
    "{count} hakutulosta",
    "{count} sökresultat",
    "{count} matching notices",
  ],
  deepSearch: ["Koko tekstin haku", "Fulltextsökning", "Full-text search"],
  original: [
    "Viralliset tekstit näytetään alkuperäisellä kielellä.",
    "Officiella texter visas på originalspråket.",
    "Official text is shown in its original language.",
  ],
  noticeBuyer: [
    "ILMOITUS / HANKINTAYKSIKKÖ",
    "ANNONS / UPPHANDLANDE ENHET",
    "NOTICE / BUYER",
  ],
  published: ["Julkaistu", "Publicerad", "Published"],
  daysLeft: [
    "{count} päivää jäljellä",
    "{count} dagar kvar",
    "{count} days left",
  ],
  save: ["Tallenna ilmoitus", "Spara annons", "Save notice"],
  unsave: ["Poista tallennus", "Ta bort sparad annons", "Unsave notice"],
  noResults: [
    "Ilmoituksia ei löytynyt.",
    "Inga annonser hittades.",
    "No notices found.",
  ],
  noResultsBody: [
    "Kokeile laajempaa hakua tai tyhjennä suodattimet.",
    "Prova en bredare sökning eller rensa filtren.",
    "Try a broader search or clear your filters.",
  ],
  noSaved: [
    "Ensimmäinen löytösi odottaa.",
    "Ditt första fynd väntar.",
    "Your first discovery awaits.",
  ],
  noSavedBody: [
    "Tallenna kiinnostava ilmoitus kirjanmerkkipainikkeella.",
    "Spara en intressant annons med bokmärkesknappen.",
    "Bookmark an interesting notice to keep it here.",
  ],
  noImported: [
    "Aineistossa ei ole vielä ilmoituksia.",
    "Materialet innehåller ännu inga annonser.",
    "No notices have been imported yet.",
  ],
  previous: ["Edellinen sivu", "Föregående sida", "Previous page"],
  next: ["Seuraava sivu", "Nästa sida", "Next page"],
  page: ["Sivu", "Sida", "Page"],
  showing: [
    "Näytetään {from}–{to} / {count}",
    "Visar {from}–{to} / {count}",
    "Showing {from}–{to} of {count}",
  ],
  categoryHeading: [
    "Löydä oma toimialasi.",
    "Hitta din bransch.",
    "Find your field.",
  ],
  categoryBody: [
    "Selaa hankintoja virallisten CPV-koodien perusteella ryhmiteltyinä. Luvut kuvaavat aineiston uusimpia ilmoitusversioita.",
    "Bläddra bland upphandlingar grupperade efter officiella CPV-koder. Antalen avser de senaste annonsversionerna i materialet.",
    "Browse procurement grouped by official CPV codes. Counts cover the latest notice versions in the snapshot.",
  ],
  searchCategories: ["Hae toimialaa", "Sök bransch", "Search categories"],
  viewNotices: ["Näytä ilmoitukset", "Visa annonser", "View notices"],
  active: ["avoinna", "öppna", "open"],
  noCategories: [
    "Toimialoja ei löytynyt.",
    "Inga branscher hittades.",
    "No categories found.",
  ],
  buyerHeading: [
    "Hankintojen takana.",
    "Bakom inköpen.",
    "Behind the purchases.",
  ],
  buyerBody: [
    "Tutki organisaatioiden ilmoituksia ja ilmoitettuja arvoja.",
    "Utforska organisationernas annonser och rapporterade värden.",
    "Explore organisations, their notices and reported values.",
  ],
  searchBuyers: [
    "Hae nimellä tai Y-tunnuksella",
    "Sök med namn eller FO-nummer",
    "Search by name or Business ID",
  ],
  businessId: ["Y-tunnus", "FO-nummer", "Business ID"],
  verified: [
    "PRH / YTJ -tieto saatavilla",
    "PRH / YTJ-uppgifter tillgängliga",
    "PRH / YTJ record available",
  ],
  noBuyers: [
    "Hankintayksiköitä ei löytynyt.",
    "Inga upphandlande enheter hittades.",
    "No buyers found.",
  ],
  spendingHeading: [
    "Mitä todella maksettiin?",
    "Vad betalades faktiskt?",
    "What was actually spent?",
  ],
  spendingBody: [
    "Historialliset ostolaskut tuovat oman näkökulmansa julkisiin menoihin.",
    "Historiska inköpsfakturor ger ett eget perspektiv på offentliga utgifter.",
    "Historical purchase invoices offer another view of public spending.",
  ],
  spendingCoverage: [
    "Valtion budjettitalous ja osallistuvat kunnat; ei kaikkia Suomen julkisia menoja. Luottamuksellisia hankintoja ja joitakin viranomaisia puuttuu. Kirjanpitorivit sisältävät hyvitykset. Toimittajalista kattaa 250 suurinta. Laskuja ei yhdistetä hankintailmoituksiin ilman luotettavaa yhteistä tunnistetta.",
    "Statens budgetekonomi och deltagande kommuner; inte alla offentliga utgifter i Finland. Konfidentiella inköp och vissa myndigheter saknas. Bokföringsraderna inkluderar krediteringar. Leverantörslistan omfattar de 250 största. Fakturor kopplas inte till annonser utan en tillförlitlig gemensam identifierare.",
    "State budget entities and participating municipalities; not all Finnish public spending. Confidential purchases and some authorities are excluded. Accounting lines include credit notes. Rankings cover the top 250 suppliers. Invoices are not linked to notices without a reliable shared identifier.",
  ],
  recorded: [
    "Kirjatut nettomenot",
    "Bokförda nettoutgifter",
    "Recorded net spending",
  ],
  accounting: ["Kirjanpitorivit", "Bokföringsrader", "Accounting lines"],
  credits: [
    "Sisältää hyvitykset ja palautukset",
    "Inkluderar krediteringar och återbetalningar",
    "Includes credit notes and refunds",
  ],
  organisations: [
    "Ostajaorganisaatiot",
    "Inköpsorganisationer",
    "Purchasing organisations",
  ],
  sourceYear: [
    "Lähdeaineiston vuosi {year}",
    "Källmaterialets år {year}",
    "Source file for {year}",
  ],
  suppliers: ["Toimittajat", "Leverantörer", "Suppliers"],
  spendingCategories: [
    "Menoluokat",
    "Utgiftskategorier",
    "Spending categories",
  ],
  searchSpending: [
    "Hae ostolaskuaineistosta",
    "Sök i fakturamaterialet",
    "Search invoice spending",
  ],
  officialDataset: [
    "Virallinen aineisto",
    "Officiellt material",
    "Official dataset",
  ],
  netAmount: ["NETTOSUMMA", "NETTOBELOPP", "NET AMOUNT"],
  invoiceLines: ["KIRJANPITORIVEJÄ", "BOKFÖRINGSRADER", "ACCOUNTING LINES"],
  top250: [
    "Vain 250 suurinta toimittajaa",
    "Endast de 250 största leverantörerna",
    "Top 250 suppliers only",
  ],
  spendingUnavailable: [
    "Ostolaskuaineisto ei ole vielä saatavilla.",
    "Fakturamaterialet är ännu inte tillgängligt.",
    "The spending snapshot is not available yet.",
  ],
  noSpending: [
    "Hakua vastaavia rivejä ei löytynyt.",
    "Inga matchande rader hittades.",
    "No matching rows found.",
  ],
  unknown: ["Ei ilmoitettu", "Inte rapporterat", "Not reported"],
  currencyUnknown: ["valuutta puuttuu", "valuta saknas", "currency unknown"],
  officialNotice: [
    "VIRALLINEN ILMOITUS",
    "OFFICIELL ANNONS",
    "OFFICIAL NOTICE",
  ],
  earlier: ["Aiempi versio", "Tidigare version", "Earlier version"],
  deadlineHelsinki: [
    "Määräaika (Suomen aika)",
    "Tidsfrist (finsk tid)",
    "Deadline (Helsinki)",
  ],
  noDescription: [
    "Kuvausta ei ole ilmoitettu. Lue koko ilmoitus Hilmassa.",
    "Ingen beskrivning har rapporterats. Läs hela annonsen i Hilma.",
    "No description was reported. Read the full notice on Hilma.",
  ],
  classification: ["CPV-luokitus", "CPV-klassificering", "CPV classification"],
  awardees: [
    "Ilmoitetut toimittajat",
    "Rapporterade leverantörer",
    "Reported awardees",
  ],
  lots: ["Osat ja kilpailu", "Delar och konkurrens", "Lots & competition"],
  bids: ["Tarjouksia: {count}", "Anbud: {count}", "{count} bids"],
  unknownBids: [
    "Tarjousmäärää ei ilmoitettu",
    "Antalet anbud inte rapporterat",
    "Bid count not reported",
  ],
  readHilma: ["Lue Hilmassa", "Läs i Hilma", "Read on Hilma"],
  documents: [
    "Hankinta-asiakirjat",
    "Upphandlingsdokument",
    "Procurement documents",
  ],
  noticeSource: [
    "Lähde: Hilma ja saatavilla oleva eForms-täydennys. Puuttuva tieto ei ole nolla. Tarkista oikeudellisesti sitova ilmoitus Hilmassa.",
    "Källa: Hilma och tillgänglig eForms-komplettering. Saknade uppgifter är inte noll. Kontrollera den rättsligt bindande annonsen i Hilma.",
    "Source: Hilma and available eForms enrichment. Missing data is not zero. Verify the legally binding notice on Hilma.",
  ],
  aboutHeading: [
    "Yhteinen tieto kuuluu kaikille.",
    "Gemensam kunskap tillhör alla.",
    "Public knowledge belongs to everyone.",
  ],
  aboutBody: [
    "Tilimyyrä on riippumaton, avoimen lähdekoodin palvelu kansalaisille, toimittajille, tutkijoille ja journalisteille. Kontiainen auttaa kaivamaan hankinnat päivänvaloon.",
    "Tilimyyrä är en oberoende tjänst med öppen källkod för medborgare, leverantörer, forskare och journalister. Mullvaden hjälper till att gräva fram upphandlingarna.",
    "Tilimyyrä is an independent, open-source resource for citizens, suppliers, researchers and journalists. Our European mole helps bring procurement to light.",
  ],
  sources: ["Viralliset lähteet", "Officiella källor", "Official sources"],
  sourcesBody: [
    "Ilmoitukset: Hilma. Yritystiedot: PRH / YTJ. Ostolaskut: Valtiokonttorin Tutkihankintoja. Lähdeaineistojen omat käyttöehdot ovat voimassa; PRH- ja ostolaskuaineistoissa CC BY 4.0 soveltuvin osin.",
    "Annonser: Hilma. Företagsuppgifter: PRH / YTJ. Inköpsfakturor: Statskontorets Tutkihankintoja. Källornas egna villkor gäller; CC BY 4.0 för PRH- och fakturauppgifter där tillämpligt.",
    "Notices: Hilma. Company records: PRH / YTJ. Invoices: State Treasury / Tutkihankintoja. Source terms apply; CC BY 4.0 for PRH and invoice data where applicable.",
  ],
  limits: ["Aineiston rajat", "Materialets begränsningar", "Know the limits"],
  limitsBody: [
    "Ilmoitusmäärä ei ole sopimusmäärä. Aiempia versioita tunnistetaan vain lähteen nimenomaisista suhteista. Alue määräytyy ensisijaisesti toteutuspaikan NUTS-koodista, toissijaisesti ostajan sijainnista. PRH:n avoin data ei kata kuntia, hyvinvointialueita tai yksityisiä elinkeinonharjoittajia.",
    "Antalet annonser är inte antalet kontrakt. Tidigare versioner identifieras endast genom uttryckliga källrelationer. Regionen bygger främst på NUTS-koden för utförandeplatsen, annars på köparens plats. PRH:s öppna data täcker inte kommuner, välfärdsområden eller enskilda näringsidkare.",
    "Notice counts are not contract counts. Earlier versions use explicit source relationships. Regions use performance NUTS codes, then buyer location as a fallback. PRH open data excludes municipalities, wellbeing services counties and sole traders.",
  ],
  valuesBody: [
    "Arviot, sopimusarvot ja toteutuneet ostolaskumenot ovat eri asioita. Summataan vain yhteensopivia EUR-arvoja. Puuttuvat arvot säilyvät tuntemattomina. Virallisia tekstejä ei käännetä.",
    "Uppskattningar, tilldelade värden och faktiska fakturautgifter är olika mått. Endast kompatibla EUR-värden summeras. Saknade värden förblir okända. Officiella texter översätts inte.",
    "Estimates, awards and actual invoice spending are different measures. Only compatible EUR values are aggregated. Missing values remain unknown. Official notice text is not translated.",
  ],
  signalDefinitions: [
    "Näin havainnot muodostuvat",
    "Så definieras signalerna",
    "How signals are defined",
  ],
  "single-bid": [
    "Yhden tarjouksen hankinta",
    "Tilldelning med ett anbud",
    "Single-bid award",
  ],
  "short-window": [
    "Lyhyt tarjousaika",
    "Kort anbudstid",
    "Short response window",
  ],
  "near-budget": [
    "Sopimusarvo lähellä arviota",
    "Tilldelning nära uppskattningen",
    "Award near estimate",
  ],
  singleDefinition: [
    "Jälki-ilmoituksen vähintään yhdessä osassa ilmoitetaan täsmälleen yksi vastaanotettu tarjous.",
    "En tilldelningsannons rapporterar exakt ett mottaget anbud i minst en del.",
    "An award notice reports exactly one received tender in at least one lot.",
  ],
  shortDefinition: [
    "Määräajan ja julkaisun erotus on vähintään 0 ja alle 14 päivää. Muutokset voivat vaikuttaa tulkintaan.",
    "Skillnaden mellan tidsfrist och publicering är minst 0 och under 14 dagar. Ändringar kan påverka tolkningen.",
    "Deadline minus publication is nonnegative and under 14 days. Amendments can affect interpretation.",
  ],
  nearDefinition: [
    "Ilmoitettu EUR-sopimusarvo on 95–100 % positiivisesta ilmoitustason EUR-arviosta.",
    "Det rapporterade tilldelningsvärdet i EUR är 95–100 % av en positiv uppskattning i EUR på annonsnivå.",
    "A reported EUR award total is 95–100% of a positive notice-level EUR estimate.",
  ],
  disclaimer: [
    "Havainnot ovat tarkastelun aiheita, eivät näyttöä väärinkäytöksistä.",
    "Signalerna är skäl att undersöka, inte bevis på oegentligheter.",
    "Signals are investigation prompts, not evidence of wrongdoing.",
  ],
  unofficial: [
    "Tilimyyrä ei ole viranomaispalvelu.",
    "Tilimyyrä är inte en myndighetstjänst.",
    "Tilimyyrä is not a government service.",
  ],
  github: ["Lähdekoodi GitHubissa", "Källkod på GitHub", "Source on GitHub"],
  feedBody: [
    "Lisää linkki RSS-lukijaasi. Syötteissä on 100 uusinta vastaavaa ilmoitusta. Tiliä ei tarvita.",
    "Lägg till länken i din RSS-läsare. Flödena innehåller de 100 senaste matchande annonserna. Inget konto behövs.",
    "Add a link to your RSS reader. Feeds contain the 100 latest matching notices. No account needed.",
  ],
  byRegion: ["Alueittain", "Per region", "By region"],
  byBuyerType: [
    "Hankintayksikön tyypin mukaan",
    "Efter typ av upphandlande enhet",
    "By buyer type",
  ],
  allNotices: [
    "Kaikki hankintailmoitukset",
    "Alla upphandlingsannonser",
    "All procurement notices",
  ],
  allData: [
    "Kaikki tiedostot ja syötteet",
    "Alla filer och flöden",
    "All data files & feeds",
  ],
  storage: [
    "Selaimen tallennus ei ole käytettävissä. Valinnat säilyvät tämän käynnin ajan.",
    "Webbläsarlagring är inte tillgänglig. Valen sparas under detta besök.",
    "Browser storage is unavailable. Preferences last for this visit.",
  ],
  match: ["Hakutapa", "Sökläge", "Match"],
  scope: ["Hakukenttä", "Sökfält", "Search field"],
  any: ["Kaikki", "Alla", "All"],
  modifiedDate: ["Muutettu", "Ändrad", "Modified"],
  deadlineSoonest: [
    "Lähin määräaika",
    "Närmaste tidsfrist",
    "Deadline soonest",
  ],
  sortBuyer: ["Hankintayksikkö A–Ö", "Upphandlande enhet A–Ö", "Buyer A–Z"],
  sortTitle: ["Otsikko A–Ö", "Rubrik A–Ö", "Title A–Z"],
  "Other / nationwide": [
    "Muu / koko maa",
    "Övrig / hela landet",
    "Other / nationwide",
  ],
  Uusimaa: ["Uusimaa", "Nyland", "Uusimaa"],
  "Varsinais-Suomi": [
    "Varsinais-Suomi",
    "Egentliga Finland",
    "Southwest Finland",
  ],
  Satakunta: ["Satakunta", "Satakunta", "Satakunta"],
  "Kanta-Häme": ["Kanta-Häme", "Egentliga Tavastland", "Kanta-Häme"],
  Pirkanmaa: ["Pirkanmaa", "Birkaland", "Pirkanmaa"],
  "Etelä-Karjala": ["Etelä-Karjala", "Södra Karelen", "South Karelia"],
  "Keski-Pohjanmaa": [
    "Keski-Pohjanmaa",
    "Mellersta Österbotten",
    "Central Ostrobothnia",
  ],
  Lappi: ["Lappi", "Lappland", "Lapland"],
  Åland: ["Ahvenanmaa", "Åland", "Åland"],
  Active: ["Avoinna", "Öppen", "Active"],
  Awarded: ["Ratkaistu", "Tilldelad", "Awarded"],
  Planning: ["Suunnitteilla", "Planerad", "Planning"],
  Closed: ["Päättynyt", "Avslutad", "Closed"],
  Cancelled: ["Peruttu", "Avbruten", "Cancelled"],
  Other: ["Muu", "Annan", "Other"],
  "Regional authority": [
    "Alueviranomainen",
    "Regional myndighet",
    "Regional authority",
  ],
  Municipality: ["Kunta", "Kommun", "Municipality"],
  "Public body": [
    "Julkisoikeudellinen laitos",
    "Offentligrättsligt organ",
    "Public body",
  ],
  "Central government": [
    "Valtion viranomainen",
    "Statlig myndighet",
    "Central government",
  ],
  "Other buyer": [
    "Muu hankintayksikkö",
    "Annan upphandlande enhet",
    "Other buyer",
  ],
  "Public undertaking": [
    "Julkinen yritys",
    "Offentligt företag",
    "Public undertaking",
  ],
  open: ["Avoin menettely", "Öppet förfarande", "Open procedure"],
  restricted: [
    "Rajoitettu menettely",
    "Selektivt förfarande",
    "Restricted procedure",
  ],
  "neg-wo-call": [
    "Neuvottelu ilman ilmoitusta",
    "Förhandling utan annonsering",
    "Negotiated without prior call",
  ],
  "neg-w-call": [
    "Neuvottelumenettely",
    "Förhandlat förfarande",
    "Negotiated with prior call",
  ],
  "oth-single": [
    "Muu yksivaiheinen menettely",
    "Annat enstegsförfarande",
    "Other single-stage procedure",
  ],
  "oth-mult": [
    "Muu monivaiheinen menettely",
    "Annat flerstegsförfarande",
    "Other multi-stage procedure",
  ],
  "comp-dial": [
    "Kilpailullinen neuvottelu",
    "Konkurrenspräglad dialog",
    "Competitive dialogue",
  ],
  innovation: [
    "Innovaatiokumppanuus",
    "Innovationspartnerskap",
    "Innovation partnership",
  ],
  "Not specified": ["Ei ilmoitettu", "Inte angivet", "Not specified"],
  "IT & software": ["IT ja ohjelmistot", "IT och programvara", "IT & software"],
  "Office & supplies": [
    "Toimisto ja tarvikkeet",
    "Kontor och förbrukningsvaror",
    "Office & supplies",
  ],
  "Maintenance & facilities": [
    "Kunnossapito ja kiinteistöpalvelut",
    "Underhåll och fastighetstjänster",
    "Maintenance & facilities",
  ],
  "Materials & equipment": [
    "Materiaalit ja laitteet",
    "Material och utrustning",
    "Materials & equipment",
  ],
  Healthcare: ["Terveydenhuolto", "Hälso- och sjukvård", "Healthcare"],
  "Transport & logistics": [
    "Kuljetus ja logistiikka",
    "Transport och logistik",
    "Transport & logistics",
  ],
  "Architecture & engineering": [
    "Arkkitehtuuri ja suunnittelu",
    "Arkitektur och teknik",
    "Architecture & engineering",
  ],
  "Energy & utilities": [
    "Energia ja yhdyskuntatekniikka",
    "Energi och samhällsteknik",
    "Energy & utilities",
  ],
  "Other services": ["Muut palvelut", "Övriga tjänster", "Other services"],
  "Research & education": [
    "Tutkimus ja koulutus",
    "Forskning och utbildning",
    "Research & education",
  ],
  "Professional services": [
    "Asiantuntijapalvelut",
    "Experttjänster",
    "Professional services",
  ],
  "Agriculture & food": [
    "Maatalous ja elintarvikkeet",
    "Jordbruk och livsmedel",
    "Agriculture & food",
  ],
  Construction: ["Rakentaminen", "Byggande", "Construction"],
  "Safety & security": ["Turvallisuus", "Säkerhet", "Safety & security"],
  "Property & real estate": [
    "Kiinteistöt",
    "Fastigheter",
    "Property & real estate",
  ],
  "Environment & outdoors": [
    "Ympäristö ja ulkoalueet",
    "Miljö och utomhusområden",
    "Environment & outdoors",
  ],
  "Culture & recreation": [
    "Kulttuuri ja vapaa-aika",
    "Kultur och fritid",
    "Culture & recreation",
  ],
  "Public services": [
    "Julkiset palvelut",
    "Offentliga tjänster",
    "Public services",
  ],
  "Hospitality & catering": [
    "Majoitus ja ateriapalvelut",
    "Logi och måltidstjänster",
    "Hospitality & catering",
  ],
};
export function translate(
  language: Language,
  key: string,
  values: Record<string, string | number> = {},
): string {
  let text =
    messages[key]?.[language === "fi" ? 0 : language === "sv" ? 1 : 2] ?? key;
  for (const [name, value] of Object.entries(values))
    text = text.replaceAll("{" + name + "}", String(value));
  return text;
}
export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
}>({ language: "fi", setLanguage: () => {} });
export function useI18n() {
  const { language, setLanguage } = useContext(LanguageContext);
  const locale = locales[language];
  const t = (key: string, values?: Record<string, string | number>) =>
    translate(language, key, values);
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  const money = (
    n: number | null,
    currency: string | null = "EUR",
    compact = true,
  ) => {
    if (n === null) return t("unknown");
    if (!currency) return fmt(n) + " (" + t("currencyUnknown") + ")";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 0,
      }).format(n);
    } catch {
      return fmt(n) + " " + currency;
    }
  };
  const date = (value: string | null, time = false) =>
    value && !Number.isNaN(Date.parse(value))
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          ...(time ? { timeStyle: "short" as const } : {}),
          timeZone: "Europe/Helsinki",
        }).format(new Date(value))
      : t("unknown");
  return { language, setLanguage, t, fmt, money, date };
}
