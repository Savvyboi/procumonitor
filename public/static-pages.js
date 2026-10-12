const strings = {
  fi: {
    back: "← Takaisin hankintahakuun",
    searchTitle: "Koko tekstin haku",
    searchLead:
      "Hae kaikkien tuotujen ilmoitusten koko kuvauksista. Viralliset tekstit ovat alkuperäisellä kielellä.",
    searchEyebrow: "JOKAINEN ILMOITUS. JOKAINEN SANA.",
    estimate: "Arvioitu arvo",
    award: "Sopimusten arvo",
    plannedRange: "Suunniteltu arvo (vaihteluväli)",
    lots: "Osat",
    open: "Avaa hankintahaussa",
    official: "Virallinen Hilma-ilmoitus",
    original: "Virallinen teksti on alkuperäisellä kielellä.",
    language: "Käyttöliittymän kieli",
    dark: "Tumma teema",
    light: "Vaalea teema",
    placeholder: "Hae ilmoitusten koko tekstistä",
    clear_search: "Tyhjennä",
    load_more: "Näytä lisää",
    search_label: "Hae ilmoitusten koko tekstistä",
    filters_label: "Suodattimet",
    zero_results: "Ei tuloksia haulle [SEARCH_TERM]",
    many_results: "[COUNT] tulosta haulle [SEARCH_TERM]",
    one_result: "[COUNT] tulos haulle [SEARCH_TERM]",
    total_zero_results: "Ei tuloksia",
    total_one_result: "[COUNT] tulos",
    total_many_results: "[COUNT] tulosta",
    alt_search:
      "Ei tuloksia haulle [SEARCH_TERM]. Näytetään tulokset haulle [DIFFERENT_TERM]",
    search_suggestion:
      "Ei tuloksia haulle [SEARCH_TERM]. Kokeile seuraavia hakusanoja:",
    searching: "Haetaan: [SEARCH_TERM]",
    unknown: "Ei ilmoitettu",
    currencyUnknown: "valuutta puuttuu",
  },
  sv: {
    back: "← Tillbaka till upphandlingssökningen",
    searchTitle: "Fulltextsökning",
    searchLead:
      "Sök i de fullständiga beskrivningarna av alla importerade annonser. Officiella texter visas på originalspråket.",
    searchEyebrow: "VARJE ANNONS. VARJE ORD.",
    estimate: "Uppskattat värde",
    award: "Tilldelat värde",
    plannedRange: "Planerat värde (intervall)",
    lots: "Delar",
    open: "Öppna i upphandlingssökningen",
    official: "Officiell Hilma-annons",
    original: "Officiell text visas på originalspråket.",
    language: "Gränssnittets språk",
    dark: "Mörkt tema",
    light: "Ljust tema",
    placeholder: "Sök i annonsernas fullständiga text",
    clear_search: "Rensa",
    load_more: "Visa fler",
    search_label: "Sök i annonsernas fullständiga text",
    filters_label: "Filter",
    zero_results: "Inga resultat för [SEARCH_TERM]",
    many_results: "[COUNT] resultat för [SEARCH_TERM]",
    one_result: "[COUNT] resultat för [SEARCH_TERM]",
    total_zero_results: "Inga resultat",
    total_one_result: "[COUNT] resultat",
    total_many_results: "[COUNT] resultat",
    alt_search:
      "Inga resultat för [SEARCH_TERM]. Visar resultat för [DIFFERENT_TERM]",
    search_suggestion:
      "Inga resultat för [SEARCH_TERM]. Prova följande sökord:",
    searching: "Söker efter [SEARCH_TERM]",
    unknown: "Inte rapporterat",
    currencyUnknown: "valuta saknas",
  },
  en: {
    back: "← Back to the explorer",
    searchTitle: "Full-text search",
    searchLead:
      "Search the full descriptions of all imported notices. Official text is shown in its original language.",
    searchEyebrow: "EVERY NOTICE. EVERY WORD.",
    estimate: "Estimated value",
    award: "Awarded value",
    plannedRange: "Planned value range",
    lots: "Lots",
    open: "Open in explorer",
    official: "Official Hilma notice",
    original: "Official text is shown in its original language.",
    language: "Interface language",
    dark: "Dark theme",
    light: "Light theme",
    placeholder: "Search full notice text",
    clear_search: "Clear",
    load_more: "Load more",
    search_label: "Search full notice text",
    filters_label: "Filters",
    zero_results: "No results for [SEARCH_TERM]",
    many_results: "[COUNT] results for [SEARCH_TERM]",
    one_result: "[COUNT] result for [SEARCH_TERM]",
    total_zero_results: "No results",
    total_one_result: "[COUNT] result",
    total_many_results: "[COUNT] results",
    alt_search:
      "No results for [SEARCH_TERM]. Showing results for [DIFFERENT_TERM]",
    search_suggestion: "No results for [SEARCH_TERM]. Try these search terms:",
    searching: "Searching for [SEARCH_TERM]",
    unknown: "Not reported",
    currencyUnknown: "currency unknown",
  },
};
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
const params = new URLSearchParams(location.search);
const preferred = params.get("lang") || read("tilimyyra-language") || "fi";
const language = ["fi", "sv", "en"].includes(preferred) ? preferred : "fi";
const text = strings[language];
document.documentElement.lang = language;
save("tilimyyra-language", language);
document.querySelectorAll("[data-i18n]").forEach((node) => {
  node.textContent = text[node.dataset.i18n];
});
const languageControl = document.querySelector("#language");
languageControl.value = language;
languageControl.setAttribute("aria-label", text.language);
languageControl.addEventListener("change", () => {
  params.set("lang", languageControl.value);
  save("tilimyyra-language", languageControl.value);
  const query = document.querySelector(".pagefind-ui__search-input")?.value;
  if (query) params.set("q", query);
  location.search = params.toString();
});
let theme =
  read("tilimyyra-theme") ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const themeButton = document.querySelector("#theme");
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "dark" ? "☀" : "☾";
  themeButton.setAttribute(
    "aria-label",
    theme === "dark" ? text.light : text.dark,
  );
}
applyTheme();
themeButton.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  save("tilimyyra-theme", theme);
  applyTheme();
});
document.querySelectorAll("[data-explorer-link]").forEach((link) => {
  const url = new URL(link.href);
  url.searchParams.set("lang", language);
  link.href = url;
});
document.querySelectorAll("[data-value]").forEach((node) => {
  const value = node.dataset.value;
  const currency = node.dataset.currency;
  node.textContent =
    value === ""
      ? text.unknown
      : currency
        ? new Intl.NumberFormat(
            { fi: "fi-FI", sv: "sv-FI", en: "en-GB" }[language],
            { style: "currency", currency, maximumFractionDigits: 0 },
          ).format(Number(value))
        : Number(value).toLocaleString(language) +
          " (" +
          text.currencyUnknown +
          ")";
});
if (document.querySelector("#search")) {
  document.title = text.searchTitle + " — Tilimyyrä";
  const ui = new PagefindUI({
    element: "#search",
    showSubResults: false,
    showImages: false,
    resetStyles: true,
    translations: { ...text, language },
  });
  if (params.get("q") && typeof ui.triggerSearch === "function")
    ui.triggerSearch(params.get("q"));
}
