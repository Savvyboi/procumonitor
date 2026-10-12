import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  ExternalLink,
  Flag,
  Globe2,
  Layers3,
  Menu,
  Moon,
  Rss,
  Search,
  SlidersHorizontal,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import type { Company, Dataset, Notice, Spending } from "./types";
import { LanguageContext, useI18n, type Language } from "./i18n";
import {
  defaults,
  fold,
  matchesFilters,
  matchesQuery,
  readFilters,
  searchText,
  sortNotices,
  sorts,
  writeFilters,
  type Filters,
} from "./lib/discovery";

const BASE = import.meta.env.BASE_URL;
const views = [
  "explore",
  "categories",
  "buyers",
  "spending",
  "signals",
  "saved",
  "about",
];
const signals = ["single-bid", "short-window", "near-budget"];
const statuses = [
  "Active",
  "Awarded",
  "Planning",
  "Closed",
  "Cancelled",
  "Other",
];
const slug = (value: string) =>
  fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function initialLanguage(): Language {
  const value =
    new URLSearchParams(location.search).get("lang") ||
    stored("tilimyyra-language");
  return value === "sv" || value === "en" ? value : "fi";
}
function initialSaved(): string[] {
  try {
    const value: unknown = JSON.parse(
      stored("tilimyyra-saved") || stored("avoin-saved") || "[]",
    );
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
async function loadNotices(): Promise<Dataset> {
  if ("DecompressionStream" in window) {
    try {
      const response = await fetch(BASE + "data/notices.json.gz");
      if (response.ok && response.body)
        return await new Response(
          response.body.pipeThrough(new DecompressionStream("gzip")),
        ).json();
    } catch {
      /* The uncompressed snapshot also works in older browsers. */
    }
  }
  const response = await fetch(BASE + "data/notices.json");
  if (!response.ok) throw new Error("Snapshot unavailable");
  return response.json();
}
function exportData(notices: Notice[], kind: "csv" | "json") {
  const keys = [
    "id",
    "noticeId",
    "noticeNumber",
    "title",
    "buyer",
    "businessId",
    "buyerType",
    "regions",
    "category",
    "cpvCodes",
    "status",
    "published",
    "modified",
    "deadline",
    "estimatedValue",
    "estimatedCurrency",
    "awardedValue",
    "awardedCurrency",
    "winners",
    "flags",
    "procedure",
    "documentsUrl",
    "fullContentAvailable",
    "plannedValueRange",
    "relatedIds",
    "lots",
    "sourceUrl",
  ] as const;
  const cell = (value: unknown) => {
    const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
    return (
      '"' +
      (/^\s*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') +
      '"'
    );
  };
  const content =
    kind === "json"
      ? JSON.stringify(notices, null, 2)
      : "\uFEFF" +
        keys.join(",") +
        "\r\n" +
        notices
          .map((n) =>
            keys
              .map((k) =>
                cell(
                  k === "lots" || k === "plannedValueRange"
                    ? JSON.stringify(n[k])
                    : n[k],
                ),
              )
              .join(","),
          )
          .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], {
      type: kind === "json" ? "application/json" : "text/csv;charset=utf-8;",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    "tilimyyra-notices-" + new Date().toISOString().slice(0, 10) + "." + kind;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function Mole({ small = false }: { small?: boolean }) {
  const { t } = useI18n();
  return (
    <img
      className={small ? "mole-mark" : "mole-hero"}
      src={BASE + "mole.svg"}
      alt={small ? "" : t("mascot")}
      width={small ? 48 : 260}
      height={small ? 40 : 220}
    />
  );
}
function Status({ value }: { value: string }) {
  const { t } = useI18n();
  return (
    <span className={"status " + value.toLowerCase()}>
      <i />
      {t(value)}
    </span>
  );
}
function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-top">
        <span id="modal-title" className="eyebrow">
          {title}
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("close")}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function NoticeDialog({
  n,
  companies,
  notices,
  saved,
  onSave,
  onClose,
}: {
  n: Notice;
  companies: Record<string, Company>;
  notices: Notice[];
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const { language, t, money, date, fmt } = useI18n();
  const company = n.businessId ? companies[n.businessId] : null;
  return (
    <Modal
      title={t("officialNotice") + " · " + n.noticeNumber}
      onClose={onClose}
      wide
    >
      <div className="modal-content">
        <Status value={n.status} />{" "}
        {n.superseded && <span className="muted">{t("earlier")}</span>}
        <h2>{n.title}</h2>
        <p className="buyer-line">
          <Building2 size={18} />
          {n.buyer}
        </p>
        <div className="detail-grid">
          {[
            [
              t("estimate"),
              money(n.estimatedValue, n.estimatedCurrency, false),
            ],
            ...(n.plannedValueRange
              ? [
                  [
                    t("plannedRange"),
                    `${money(n.plannedValueRange.min, n.plannedValueRange.minCurrency, false)} – ${money(n.plannedValueRange.max, n.plannedValueRange.maxCurrency, false)}`,
                  ],
                ]
              : []),
            [t("award"), money(n.awardedValue, n.awardedCurrency, false)],
            [t("published"), date(n.published)],
            [t("modifiedDate"), date(n.modified)],
            [t("deadlineHelsinki"), date(n.deadline, true)],
            [t("region"), n.regions.map((r) => t(r)).join(", ")],
            [t("procedure"), t(n.procedure)],
            [t("businessId"), n.businessId || t("unknown")],
            [t("category"), t(n.category)],
            [t("buyerType"), t(n.buyerType)],
          ].map(([key, value]) => (
            <div key={key}>
              <small>{key}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        {n.flags.length > 0 && (
          <div className="callout signal-callout">
            <Flag size={20} />
            <div>
              <strong>{t("signalDefinitions")}</strong>
              {n.flags.map((f) => (
                <p key={f}>
                  {t(f)}:{" "}
                  {t(
                    f === "single-bid"
                      ? "singleDefinition"
                      : f === "short-window"
                        ? "shortDefinition"
                        : "nearDefinition",
                  )}
                </p>
              ))}
              <small>{t("disclaimer")}</small>
            </div>
          </div>
        )}
        <h3>{t("description")}</h3>
        <p className="original-note">{t("original")}</p>
        <p className="description">{n.description || t("noDescription")}</p>
        <h3>{t("classification")}</h3>
        <div className="cpvs">
          {n.cpvCodes.length
            ? n.cpvCodes.map((c) => <code key={c}>{c}</code>)
            : t("unknown")}
        </div>
        {n.winners.length > 0 && (
          <>
            <h3>{t("awardees")}</h3>
            <p>{n.winners.join("; ")}</p>
          </>
        )}
        {n.lots.length > 0 && (
          <>
            <h3>{t("lots")}</h3>
            <div className="lot-list">
              {n.lots.map((l) => (
                <div key={l.id}>
                  <strong>{l.title || l.id}</strong>
                  {l.description && (
                    <p className="description">{l.description}</p>
                  )}
                  {!!l.cpvCodes?.length && (
                    <p>
                      {t("classification")}: {l.cpvCodes.join(", ")}
                    </p>
                  )}
                  {!!l.regions?.length && (
                    <p>
                      {t("region")}: {l.regions.map((r) => t(r)).join(", ")}
                    </p>
                  )}
                  {l.deadline && (
                    <p>
                      {t("deadlineHelsinki")}: {date(l.deadline, true)}
                    </p>
                  )}
                  <span>
                    {l.bids === null
                      ? t("unknownBids")
                      : t("bids", { count: fmt(l.bids) })}
                  </span>
                  {l.winners.length > 0 && (
                    <p>
                      {t("awardees")}: {l.winners.join("; ")}
                    </p>
                  )}
                  <small>
                    {t("estimate")}:{" "}
                    {money(l.estimatedValue, l.estimatedCurrency)} ·{" "}
                    {t("award")}: {money(l.awardedValue, l.awardedCurrency)}
                  </small>
                </div>
              ))}
            </div>
          </>
        )}
        {company?.found && (
          <div className="callout">
            <Building2 size={20} />
            <div>
              <strong>{company.name}</strong>
              <p>{[company.form, company.city].filter(Boolean).join(" · ")}</p>
              <small>
                PRH / YTJ · {t("updated")} {date(company.checkedAt)}
              </small>
            </div>
          </div>
        )}
        {n.relatedIds.length > 0 && (
          <>
            <h3>{t("previousNotices")}</h3>
            <div className="related-notices">
              {n.relatedIds.map((id) =>
                notices.some((related) => related.id === id) ? (
                  <a
                    className="text-link"
                    key={id}
                    href={
                      BASE +
                      "?notice=" +
                      encodeURIComponent(id) +
                      "&lang=" +
                      language
                    }
                  >
                    {id}
                    <ArrowUpRight size={14} />
                  </a>
                ) : (
                  <span key={id}>
                    {id} · {t("outsideSnapshot")}
                  </span>
                ),
              )}
            </div>
          </>
        )}
        <p className="source-note">
          {t(n.fullContentAvailable ? "fullContent" : "summaryContent")}
        </p>
        <p className="source-note">{t("noticeSource")}</p>
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={onSave}>
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          {t(saved ? "unsave" : "save")}
        </button>
        {n.documentsUrl && (
          <a
            className="text-link"
            href={n.documentsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("documents")}
            <ExternalLink size={15} />
          </a>
        )}
        <a
          className="button primary"
          href={n.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("readHilma")}
          <ArrowUpRight size={17} />
        </a>
      </div>
    </Modal>
  );
}
function Pagination({
  page,
  count,
  size,
  onChange,
}: {
  page: number;
  count: number;
  size: number;
  onChange: (page: number) => void;
}) {
  const { t, fmt } = useI18n();
  const pages = Math.max(1, Math.ceil(count / size));
  if (!count) return null;
  return (
    <div className="pagination">
      <span>
        {t("showing", {
          from: fmt((page - 1) * size + 1),
          to: fmt(Math.min(page * size, count)),
          count: fmt(count),
        })}
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={t("previous")}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          {t("page")} {page} / {pages}
        </span>
        <button
          className="icon-button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label={t("next")}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
function About() {
  const { t } = useI18n();
  return (
    <section className="reading-page">
      <span className="eyebrow">TILIMYYRÄ</span>
      <h1>{t("aboutHeading")}</h1>
      <p className="page-lead">{t("aboutBody")}</p>
      <div className="about-grid">
        <article>
          <Database />
          <h2>{t("sources")}</h2>
          <p>{t("sourcesBody")}</p>
          <a
            className="text-link"
            href="https://github.com/Hankintailmoitukset/hilma-api/blob/master/endpoints/avpendpoints.md"
            target="_blank"
            rel="noreferrer"
          >
            Hilma API <ExternalLink size={14} />
          </a>
          <a
            className="text-link"
            href="https://www.ytj.fi/index/avoindata.html"
            target="_blank"
            rel="noreferrer"
          >
            PRH / YTJ <ExternalLink size={14} />
          </a>
          <a
            className="text-link"
            href="https://avoindata.suomi.fi/data/fi/dataset/ba96a638-67bf-4747-b084-c78ccfe052e9"
            target="_blank"
            rel="noreferrer"
          >
            {t("officialDataset")} <ExternalLink size={14} />
          </a>
        </article>
        <article>
          <Flag />
          <h2>{t("signalDefinitions")}</h2>
          {signals.map((s, i) => (
            <p key={s}>
              <b>{t(s)}: </b>
              {t(["singleDefinition", "shortDefinition", "nearDefinition"][i])}
            </p>
          ))}
          <strong>{t("disclaimer")}</strong>
        </article>
        <article>
          <Layers3 />
          <h2>{t("limits")}</h2>
          <p>{t("limitsBody")}</p>
          <p>{t("valuesBody")}</p>
        </article>
        <article>
          <Wallet />
          <h2>{t("spending")}</h2>
          <p>{t("spendingCoverage")}</p>
          <p>{t("unofficial")}</p>
          <a
            className="text-link"
            href="https://github.com/Savvyboi/procumonitor"
            target="_blank"
            rel="noreferrer"
          >
            {t("github")}
            <ArrowUpRight size={15} />
          </a>
        </article>
      </div>
    </section>
  );
}
export default function App() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <Explorer />
    </LanguageContext.Provider>
  );
}
function Explorer() {
  const { language, setLanguage, t, fmt, money, date } = useI18n();
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState(() =>
    views.includes(params.get("view") || "") ? params.get("view")! : "explore",
  );
  const [filters, setFilters] = useState<Filters>(() => readFilters(params));
  const [sort, setSort] = useState(() =>
    sorts.includes(params.get("sort") as (typeof sorts)[number])
      ? params.get("sort")!
      : "newest",
  );
  const [pageSize, setPageSize] = useState(() =>
    [15, 30, 60].includes(Number(params.get("size")))
      ? Number(params.get("size"))
      : 15,
  );
  const [page, setPage] = useState(1);
  const [advanced, setAdvanced] = useState(false);
  const searchPanelRef = useRef<HTMLDetailsElement>(null);
  const [theme, setTheme] = useState(
    () =>
      stored("tilimyyra-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [data, setData] = useState<Dataset | null>(null);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [spending, setSpending] = useState<Spending | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<string[]>(initialSaved);
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("notice"),
  );
  const [mobile, setMobile] = useState(false);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [spendingTab, setSpendingTab] = useState<
    "buyers" | "suppliers" | "categories"
  >("buyers");
  const [spendingQuery, setSpendingQuery] = useState("");
  const [spendingPage, setSpendingPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width: 760px)");
    const update = () => {
      setNarrow(media.matches);
      if (!media.matches) setMobile(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !narrow) return;
    const previous = document.activeElement as HTMLElement | null;
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLButtonElement>("button") || [],
      );
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [mobile, narrow]);
  useEffect(() => {
    let active = true;
    loadNotices()
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setError(true);
      });
    fetch(BASE + "data/companies.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((c) => {
        if (active) setCompanies(c);
      })
      .catch(() => {});
    fetch(BASE + "data/spending.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (active) setSpending(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.title = "Tilimyyrä — " + t("tagline");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("heroBody"));
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#111e26" : "#194b3b");
    try {
      localStorage.setItem("tilimyyra-language", language);
      localStorage.setItem("tilimyyra-theme", theme);
      localStorage.setItem("tilimyyra-saved", JSON.stringify(saved));
    } catch {
      setStorageError(true);
    }
  }, [language, theme, saved]);
  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, view, directoryQuery]);
  useEffect(() => {
    const p = writeFilters(filters);
    p.set("lang", language);
    if (view !== "explore") p.set("view", view);
    if (sort !== "newest") p.set("sort", sort);
    if (pageSize !== 15) p.set("size", String(pageSize));
    if (selectedId) p.set("notice", selectedId);
    history.replaceState(
      null,
      "",
      location.pathname + "?" + p.toString() + location.hash,
    );
  }, [filters, view, sort, pageSize, selectedId, language]);
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(location.search);
      setFilters(readFilters(p));
      setView(views.includes(p.get("view") || "") ? p.get("view")! : "explore");
      setSelectedId(p.get("notice"));
      setSort(
        sorts.includes(p.get("sort") as (typeof sorts)[number])
          ? p.get("sort")!
          : "newest",
      );
      setPageSize(
        [15, 30, 60].includes(Number(p.get("size")))
          ? Number(p.get("size"))
          : 15,
      );
      const lang = p.get("lang");
      if (lang === "fi" || lang === "sv" || lang === "en") setLanguage(lang);
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) &&
        !target.isContentEditable &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        if (searchPanelRef.current) searchPanelRef.current.open = true;
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  const notices = useMemo(
    () =>
      (data?.notices || []).map((n) =>
        n.status === "Active" &&
        n.deadline &&
        Date.parse(n.deadline) <= Date.now()
          ? { ...n, status: "Closed" }
          : n,
      ),
    [data],
  );
  const latest = useMemo(() => notices.filter((n) => !n.superseded), [notices]);
  const options = useMemo(() => {
    const unique = (values: string[]) =>
      [...new Set(values)].sort((a, b) => a.localeCompare(b, language));
    return {
      regions: unique(notices.flatMap((n) => n.regions)),
      categories: unique(notices.map((n) => n.category)),
      buyers: unique(notices.map((n) => n.buyer)),
      buyerTypes: unique(notices.map((n) => n.buyerType)),
      procedures: unique(notices.map((n) => n.procedure)),
    };
  }, [notices, language]);
  const searchIndex = useMemo(
    () =>
      new Map(
        notices.map((n) => [
          n.id,
          searchText(n, filters.scope) +
            (filters.scope === "all"
              ? " " +
                fold(
                  t(n.category) +
                    " " +
                    t(n.status) +
                    " " +
                    n.regions.map((r) => t(r)).join(" "),
                )
              : ""),
        ]),
      ),
    [notices, filters.scope, language],
  );
  const filtered = useMemo(
    () =>
      sortNotices(
        notices.filter(
          (n) =>
            matchesFilters(n, filters) &&
            matchesQuery(
              searchIndex.get(n.id) || "",
              filters.q,
              filters.match,
            ) &&
            (view !== "saved" || saved.includes(n.id)) &&
            (view !== "signals" || n.flags.length > 0),
        ),
        sort,
        language,
      ),
    [notices, filters, searchIndex, sort, language, view, saved],
  );
  const selected = notices.find((n) => n.id === selectedId);
  const categoryStats = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; count: number; active: number }
    >();
    for (const n of latest) {
      const group = groups.get(n.category) || {
        name: n.category,
        count: 0,
        active: 0,
      };
      group.count++;
      if (n.status === "Active") group.active++;
      groups.set(n.category, group);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }, [latest]);
  const buyers = useMemo(() => {
    const groups = new Map<
      string,
      {
        name: string;
        count: number;
        active: number;
        value: number;
        known: number;
        id: string | null;
        regions: Set<string>;
      }
    >();
    for (const n of latest) {
      const group = groups.get(n.buyer) || {
        name: n.buyer,
        count: 0,
        active: 0,
        value: 0,
        known: 0,
        id: n.businessId,
        regions: new Set<string>(),
      };
      group.count++;
      if (n.status === "Active") group.active++;
      if (n.estimatedValue !== null && n.estimatedCurrency === "EUR") {
        group.value += n.estimatedValue;
        group.known++;
      }
      n.regions.forEach((r) => group.regions.add(r));
      groups.set(n.buyer, group);
    }
    return [...groups.values()]
      .filter((b) =>
        fold(b.name + " " + (b.id || "")).includes(fold(directoryQuery)),
      )
      .sort((a, b) => b.count - a.count);
  }, [latest, directoryQuery]);
  const estimates = latest.filter(
    (n) => n.estimatedValue !== null && n.estimatedCurrency === "EUR",
  );
  const totalEstimate = estimates.reduce(
    (sum, n) => sum + (n.estimatedValue ?? 0),
    0,
  );
  const activeCount = latest.filter((n) => n.status === "Active").length;
  const flaggedCount = latest.filter((n) => n.flags.length > 0).length;
  const chips = (Object.keys(defaults) as (keyof Filters)[]).filter(
    (k) => filters[k] !== defaults[k],
  );
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => setFilters({ ...defaults });
  function navigate(next: string) {
    setView(next);
    clear();
    setDirectoryQuery("");
    setPage(1);
    setMobile(false);
    window.scrollTo({ top: 0 });
  }
  function chooseCategory(name: string) {
    navigate("explore");
    setFilters({ ...defaults, category: name });
  }
  const toggleSave = (id: string) =>
    setSaved((items) =>
      items.includes(id) ? items.filter((i) => i !== id) : [...items, id],
    );
  const nav = [
    { id: "explore", icon: Search },
    { id: "categories", icon: Layers3 },
    { id: "buyers", icon: Building2 },
    { id: "spending", icon: Wallet },
    { id: "signals", icon: Flag },
  ];
  const rangeInvalid = !!(
    (filters.min && filters.max && Number(filters.min) > Number(filters.max)) ||
    (filters.publishedFrom &&
      filters.publishedTo &&
      filters.publishedFrom > filters.publishedTo) ||
    (filters.deadlineFrom &&
      filters.deadlineTo &&
      filters.deadlineFrom > filters.deadlineTo)
  );
  const visiblePage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const rows = filtered.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );
  const spendingRows = (spending?.[spendingTab] || []).filter((row) =>
    fold(row.name).includes(fold(spendingQuery)),
  );
  const selectFilter = (
    key: keyof Filters,
    label: string,
    values: string[],
    empty = "all",
  ) => (
    <label className="field">
      {t(label)}
      <select
        value={String(filters[key])}
        onChange={(e) => setFilter(key, e.target.value)}
      >
        <option value="">{t(empty)}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {t(value)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        {t("skip")}
      </a>
      {mobile && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobile(false)}
          aria-label={t("close")}
        />
      )}
      <aside
        ref={sidebarRef}
        className={"sidebar " + (mobile ? "open" : "")}
        inert={narrow && !mobile}
      >
        <button
          className="brand"
          onClick={() => navigate("explore")}
          aria-label={t("home")}
        >
          <Mole small />
          <span>
            tilimyyrä<small>{t("tagline")}</small>
          </span>
        </button>
        <div className="sidebar-label">{t("observatory")}</div>
        <nav aria-label={t("navigation")}>
          {nav.map((item) => (
            <button
              key={item.id}
              className={"nav-item " + (view === item.id ? "selected" : "")}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>{t(item.id)}</span>
              {item.id === "signals" && <small>{fmt(flaggedCount)}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button
          className={"nav-item " + (view === "saved" ? "selected" : "")}
          aria-current={view === "saved" ? "page" : undefined}
          onClick={() => navigate("saved")}
        >
          <Bookmark size={19} />
          <span>{t("saved")}</span>
          <small>{fmt(saved.length)}</small>
        </button>
        <button
          className="nav-item"
          onClick={() => {
            setFeedOpen(true);
            setMobile(false);
          }}
        >
          <Rss size={19} />
          <span>{t("feeds")}</span>
          <ArrowUpRight size={14} />
        </button>
        <div className="sidebar-bottom">
          <div className="civic-note">
            <span className="small-seed">✳</span>
            <h3>{t("civic")}</h3>
            <p>{t("civicBody")}</p>
          </div>
          <button
            className={"nav-item " + (view === "about" ? "selected" : "")}
            aria-current={view === "about" ? "page" : undefined}
            onClick={() => navigate("about")}
          >
            <CircleHelp size={18} />
            <span>{t("about")}</span>
          </button>
          <div className="sidebar-footer">{t("independent")}</div>
        </div>
      </aside>
      <div className="workspace" inert={narrow && mobile}>
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="icon-button mobile-menu"
              aria-label={t("openMenu")}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>
              Tilimyyrä <i>/</i> <b>{t(view)}</b>
            </span>
          </div>
          <div className="preferences">
            <Globe2 size={16} />
            <select
              aria-label={t("language")}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="fi">Suomi</option>
              <option value="sv">Svenska</option>
              <option value="en">English</option>
            </select>
            <button
              className="icon-button theme-toggle"
              aria-label={t(theme === "dark" ? "light" : "dark")}
              title={t(theme === "dark" ? "light" : "dark")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        <main id="main">
          {storageError && (
            <p className="storage-note" role="status">
              {t("storage")}
            </p>
          )}
          {error ? (
            <div className="empty-state" role="alert">
              <Database size={36} />
              <h1>{t("loadError")}</h1>
              <button
                className="button primary"
                onClick={() => location.reload()}
              >
                {t("retry")}
              </button>
              <a
                className="text-link"
                href="https://www.hankintailmoitukset.fi"
              >
                {t("readHilma")}
                <ExternalLink size={16} />
              </a>
            </div>
          ) : !data ? (
            <div className="loading" role="status">
              <Mole />
              <p>{t("loading")}</p>
            </div>
          ) : view === "about" ? (
            <About />
          ) : (
            <>
              {["explore", "saved", "signals"].includes(view) && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="eyebrow">
                        <span className="live-dot" />
                        {t("observatory")}
                      </span>
                      <h1>
                        {view === "explore" ? (
                          <>
                            {t("hero1")}
                            <br />
                            <em>{t("hero2")}</em>
                          </>
                        ) : (
                          t(
                            view === "saved"
                              ? "savedHeading"
                              : "signalsHeading",
                          )
                        )}
                      </h1>
                      <p>
                        {t(
                          view === "explore"
                            ? "heroBody"
                            : view === "saved"
                              ? "savedBody"
                              : "signalsBody",
                        )}
                      </p>
                      <div className="freshness">
                        {t("updated")} {date(data.fetchedAt, true)}{" "}
                        <span>· {t("schedule")}</span>
                      </div>
                    </div>
                    <div className="hero-mascot">
                      <Mole />
                    </div>
                  </section>
                  <details className="overview-panel disclosure">
                    <summary>
                      <Layers3 size={18} />
                      <span>{t("overview")}</span>
                      <ChevronDown size={18} className="disclosure-chevron" />
                    </summary>
                    <section className="metrics" aria-label={t("snapshot")}>
                      <div className="metric">
                        <span>
                          {t("snapshot")}
                          <Layers3 size={17} />
                        </span>
                        <strong>{fmt(latest.length)}</strong>
                        <small>{t("window", { days: data.windowDays })}</small>
                      </div>
                      <div className="metric">
                        <span>
                          {t("activeCount")}
                          <ArrowUpRight size={18} />
                        </span>
                        <strong>
                          {fmt(activeCount)}
                          <i className="live-dot" />
                        </strong>
                        <small>{t("activeHint")}</small>
                      </div>
                      <div className="metric">
                        <span>
                          {t("estimates")}
                          <Wallet size={17} />
                        </span>
                        <strong>
                          {estimates.length
                            ? money(totalEstimate)
                            : t("unknown")}
                        </strong>
                        <small>
                          {t("estimateCoverage", {
                            count: fmt(estimates.length),
                          })}
                        </small>
                      </div>
                      <button
                        className="metric metric-button"
                        onClick={() => navigate("signals")}
                      >
                        <span>
                          {t("signals")}
                          <Flag size={17} />
                        </span>
                        <strong>{fmt(flaggedCount)}</strong>
                        <small>
                          {t("signalHint")} <ArrowRight size={13} />
                        </small>
                      </button>
                    </section>
                    {view === "explore" && (
                      <section className="category-strip">
                        <div>
                          <span className="eyebrow">{t("categories")}</span>
                          <button
                            className="text-link"
                            onClick={() => navigate("categories")}
                          >
                            {t("allCategories")}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                        <div className="category-shortcuts">
                          {categoryStats.slice(0, 6).map((c) => (
                            <button
                              key={c.name}
                              className={
                                filters.category === c.name ? "chosen" : ""
                              }
                              onClick={() =>
                                setFilter(
                                  "category",
                                  filters.category === c.name ? "" : c.name,
                                )
                              }
                            >
                              {t(c.name)}
                              <span>{fmt(c.count)}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                    <p className="coverage-note">
                      {t("hilmaCoverage", {
                        full: fmt(
                          notices.filter((n) => n.fullContentAvailable).length,
                        ),
                        count: fmt(notices.length),
                      })}
                    </p>
                  </details>
                  <section className="results-panel" id="results">
                    <div className="section-heading">
                      <div>
                        <h2>
                          {t(
                            view === "saved"
                              ? "saved"
                              : view === "signals"
                                ? "signals"
                                : "explore",
                          )}
                        </h2>
                      </div>
                    </div>
                    <details
                      className="search-panel disclosure"
                      ref={searchPanelRef}
                    >
                      <summary>
                        <Search size={18} />
                        <span>{t("searchFilters")}</span>
                        {chips.length > 0 && (
                          <span className="filter-count">
                            {fmt(chips.length)}
                          </span>
                        )}
                        <ChevronDown size={18} className="disclosure-chevron" />
                      </summary>
                      <div
                        className="status-tabs"
                        role="group"
                        aria-label={t("status")}
                      >
                        {["", ...statuses].map((status) => (
                          <button
                            key={status}
                            className={
                              filters.status === status ? "active-tab" : ""
                            }
                            onClick={() => setFilter("status", status)}
                            aria-pressed={filters.status === status}
                          >
                            {t(status || "all")}
                          </button>
                        ))}
                      </div>
                      <div className="search-controls">
                        <label className="search-field">
                          <Search size={20} />
                          <input
                            ref={searchRef}
                            type="search"
                            value={filters.q}
                            onChange={(e) => setFilter("q", e.target.value)}
                            aria-label={t("search")}
                            placeholder={t("searchPlaceholder")}
                          />
                          <kbd>/</kbd>
                        </label>
                        <div className="filter-row">
                          {selectFilter(
                            "region",
                            "region",
                            options.regions,
                            "allRegions",
                          )}
                          {selectFilter(
                            "category",
                            "category",
                            options.categories,
                            "allCategories",
                          )}
                          <button
                            className={
                              "button secondary filter-button " +
                              (advanced ? "on" : "")
                            }
                            onClick={() => setAdvanced(!advanced)}
                            aria-expanded={advanced}
                            aria-controls="advanced-filters"
                          >
                            <SlidersHorizontal size={17} />
                            {t("moreFilters")}
                            {chips.length > 0 && (
                              <span className="filter-count">
                                {chips.length}
                              </span>
                            )}
                          </button>
                        </div>
                        {advanced && (
                          <div
                            className="advanced-filters"
                            id="advanced-filters"
                          >
                            <label className="field">
                              {t("searchMode")}
                              <select
                                value={filters.match}
                                onChange={(e) =>
                                  setFilter("match", e.target.value)
                                }
                              >
                                {[
                                  ["all", "allWords"],
                                  ["any", "anyWords"],
                                  ["phrase", "phrase"],
                                ].map(([v, label]) => (
                                  <option key={v} value={v}>
                                    {t(label)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field">
                              {t("searchScope")}
                              <select
                                value={filters.scope}
                                onChange={(e) =>
                                  setFilter("scope", e.target.value)
                                }
                              >
                                {[
                                  ["all", "allFields"],
                                  ["title", "title"],
                                  ["buyer", "buyer"],
                                  ["supplier", "supplier"],
                                  ["description", "description"],
                                ].map(([v, label]) => (
                                  <option key={v} value={v}>
                                    {t(label)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field">
                              {t("buyer")}
                              <input
                                list="buyer-options"
                                value={filters.buyer}
                                onChange={(e) =>
                                  setFilter("buyer", e.target.value)
                                }
                                placeholder={t("all")}
                              />
                              <datalist id="buyer-options">
                                {options.buyers.map((name) => (
                                  <option key={name} value={name} />
                                ))}
                              </datalist>
                            </label>
                            {selectFilter(
                              "buyerType",
                              "buyerType",
                              options.buyerTypes,
                            )}
                            {selectFilter(
                              "procedure",
                              "procedure",
                              options.procedures,
                            )}
                            <label className="field">
                              {t("cpv")}
                              <input
                                inputMode="numeric"
                                value={filters.cpv}
                                onChange={(e) =>
                                  setFilter("cpv", e.target.value)
                                }
                                placeholder={t("cpvHint")}
                              />
                            </label>
                            <label className="field">
                              {t("valueKind")}
                              <select
                                value={filters.valueKind}
                                onChange={(e) =>
                                  setFilter("valueKind", e.target.value)
                                }
                              >
                                <option value="estimate">
                                  {t("estimate")}
                                </option>
                                <option value="award">{t("award")}</option>
                              </select>
                            </label>
                            {(["min", "max"] as const).map((key) => (
                              <label className="field" key={key}>
                                {t(key)}
                                <input
                                  type="number"
                                  min="0"
                                  value={filters[key]}
                                  placeholder={t("noLimit")}
                                  onChange={(e) =>
                                    setFilter(key, e.target.value)
                                  }
                                />
                              </label>
                            ))}
                            <label className="field">
                              {t("valueKnown")}
                              <select
                                value={filters.valueKnown}
                                onChange={(e) =>
                                  setFilter("valueKnown", e.target.value)
                                }
                              >
                                <option value="any">{t("all")}</option>
                                <option value="reported">
                                  {t("reported")}
                                </option>
                                <option value="missing">{t("missing")}</option>
                              </select>
                            </label>
                            <label className="field">
                              {t("period")}
                              <select
                                value={filters.period}
                                onChange={(e) =>
                                  setFilter("period", e.target.value)
                                }
                              >
                                <option value="">{t("entire")}</option>
                                {[7, 30, 90, 180].map((days) => (
                                  <option key={days} value={days}>
                                    {t("days", { count: days })}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {selectFilter("signal", "signal", signals)}
                            {(
                              [
                                "publishedFrom",
                                "publishedTo",
                                "deadlineFrom",
                                "deadlineTo",
                              ] as const
                            ).map((key) => (
                              <label className="field" key={key}>
                                {t(key)}
                                <input
                                  type="date"
                                  value={filters[key]}
                                  onChange={(e) =>
                                    setFilter(key, e.target.value)
                                  }
                                />
                              </label>
                            ))}
                            <label className="check-filter">
                              <input
                                type="checkbox"
                                checked={filters.includeEarlier}
                                onChange={(e) =>
                                  setFilter("includeEarlier", e.target.checked)
                                }
                              />
                              {t("includeEarlier")}
                            </label>
                            <p className="filter-note">{t("filterNote")}</p>
                          </div>
                        )}
                      </div>
                    </details>
                    <div className="active-search">
                      {rangeInvalid && (
                        <p className="range-error" role="alert">
                          {t("invalidRange")}
                        </p>
                      )}
                      {chips.length > 0 && (
                        <div className="filter-chips">
                          {chips.map((key) => (
                            <button
                              key={key}
                              onClick={() => setFilter(key, defaults[key])}
                              aria-label={
                                t("remove") +
                                ": " +
                                t(key === "q" ? "search" : key) +
                                " " +
                                String(filters[key])
                              }
                            >
                              {t(key === "q" ? "search" : key)}:{" "}
                              {key === "includeEarlier" ? (
                                <Check size={12} />
                              ) : (
                                t(
                                  key === "match"
                                    ? {
                                        all: "allWords",
                                        any: "anyWords",
                                        phrase: "phrase",
                                      }[filters.match] || filters.match
                                    : key === "scope" && filters.scope === "all"
                                      ? "allFields"
                                      : String(filters[key]),
                                )
                              )}
                              <X size={12} />
                            </button>
                          ))}
                          <button className="clear-filters" onClick={clear}>
                            {t("clear")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="results-meta">
                      <span role="status" aria-live="polite">
                        {t("matches", { count: fmt(filtered.length) })}
                      </span>
                    </div>
                    <details className="sort-panel disclosure">
                      <summary>
                        <SlidersHorizontal size={18} />
                        <span>{t("sortDisplay")}</span>
                        <span className="sort-current">
                          {t(
                            sort === "deadline"
                              ? "deadlineSoonest"
                              : sort === "buyer"
                                ? "sortBuyer"
                                : sort === "title"
                                  ? "sortTitle"
                                  : sort,
                          )}
                        </span>
                        <ChevronDown size={18} className="disclosure-chevron" />
                      </summary>
                      <div className="sort-controls">
                        <label className="field">
                          {t("sort")}
                          <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                          >
                            {sorts.map((s) => (
                              <option key={s} value={s}>
                                {t(
                                  s === "deadline"
                                    ? "deadlineSoonest"
                                    : s === "buyer"
                                      ? "sortBuyer"
                                      : s === "title"
                                        ? "sortTitle"
                                        : s,
                                )}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>{t("perPage")}</span>
                          <select
                            aria-label={t("perPage")}
                            value={pageSize}
                            onChange={(e) =>
                              setPageSize(Number(e.target.value))
                            }
                          >
                            {[15, 30, 60].map((n) => (
                              <option key={n} value={n}>
                                {n} / {t("page").toLowerCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="export-actions">
                          {(["csv", "json"] as const).map((kind) => (
                            <button
                              key={kind}
                              className="button secondary small"
                              disabled={!filtered.length}
                              onClick={() => exportData(filtered, kind)}
                              aria-label={
                                t("export") + " " + kind.toUpperCase()
                              }
                            >
                              <ArrowDownToLine size={15} />
                              {kind.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </details>
                    <div className="notice-table">
                      <div className="table-header">
                        <span>{t("noticeBuyer")}</span>
                        <span>
                          {t("estimate")} / {t("award")}
                        </span>
                        <span>{t("deadline")}</span>
                        <span />
                      </div>
                      {rows.map((n) => (
                        <article className="notice-row" key={n.id}>
                          <div className="notice-main">
                            <div className="notice-row-labels">
                              <Status value={n.status} />
                              <button
                                className="notice-category"
                                onClick={() =>
                                  setFilter("category", n.category)
                                }
                              >
                                {t(n.category)}
                              </button>
                              {n.superseded && (
                                <span className="muted">{t("earlier")}</span>
                              )}
                              {n.flags.length > 0 && (
                                <span
                                  className="flag-mini"
                                  title={n.flags.map((f) => t(f)).join(", ")}
                                >
                                  <Flag size={13} />
                                  <span className="sr-only">
                                    {n.flags.map((f) => t(f)).join(", ")}
                                  </span>
                                </span>
                              )}
                            </div>
                            <button
                              className="notice-title"
                              onClick={() => setSelectedId(n.id)}
                            >
                              {n.title}
                            </button>
                            <div className="notice-subtitle">
                              <Building2 size={13} />
                              <button
                                onClick={() => setFilter("buyer", n.buyer)}
                              >
                                {n.buyer}
                              </button>
                              <span>
                                · {n.regions.map((r) => t(r)).join(", ")}
                              </span>
                            </div>
                          </div>
                          <div className="notice-value">
                            <span className="sr-only">{t("estimate")}: </span>
                            <b
                              className={
                                n.estimatedValue === null ? "unknown" : ""
                              }
                            >
                              {money(n.estimatedValue, n.estimatedCurrency)}
                            </b>
                            <small>
                              {t("award")}:{" "}
                              {money(n.awardedValue, n.awardedCurrency)}
                            </small>
                            <small>
                              {t("published")} {date(n.published)}
                            </small>
                          </div>
                          <div className="notice-deadline">
                            <b>{date(n.deadline)}</b>
                            <small>
                              {n.status === "Active" && n.deadline
                                ? t("daysLeft", {
                                    count: Math.max(
                                      0,
                                      Math.ceil(
                                        (Date.parse(n.deadline) - Date.now()) /
                                          86400000,
                                      ),
                                    ),
                                  })
                                : t(n.status)}
                            </small>
                          </div>
                          <button
                            className={
                              "icon-button save-button " +
                              (saved.includes(n.id) ? "saved" : "")
                            }
                            onClick={() => toggleSave(n.id)}
                            aria-label={
                              t(saved.includes(n.id) ? "unsave" : "save") +
                              ": " +
                              n.title
                            }
                            aria-pressed={saved.includes(n.id)}
                          >
                            <Bookmark
                              size={18}
                              fill={
                                saved.includes(n.id) ? "currentColor" : "none"
                              }
                            />
                          </button>
                        </article>
                      ))}
                      {!rows.length && (
                        <div className="empty-state">
                          <Search size={32} />
                          <h3>
                            {t(
                              !notices.length
                                ? "noImported"
                                : view === "saved" && !saved.length
                                  ? "noSaved"
                                  : "noResults",
                            )}
                          </h3>
                          <p>
                            {t(
                              view === "saved" && !saved.length
                                ? "noSavedBody"
                                : "noResultsBody",
                            )}
                          </p>
                          <button
                            className="button secondary"
                            onClick={
                              view === "saved" && !saved.length
                                ? () => navigate("explore")
                                : clear
                            }
                          >
                            {t(
                              view === "saved" && !saved.length
                                ? "explore"
                                : "clear",
                            )}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <Pagination
                      page={visiblePage}
                      count={filtered.length}
                      size={pageSize}
                      onChange={setPage}
                    />
                    <div className="results-foot">
                      <span>{t("original")}</span>
                      <a
                        className="text-link"
                        href={BASE + "search.html?lang=" + language}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("deepSearch")}
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </section>
                </>
              )}

              {view === "categories" && (
                <section className="directory-page">
                  <span className="eyebrow">{t("categories")}</span>
                  <h1>{t("categoryHeading")}</h1>
                  <p className="page-lead">{t("categoryBody")}</p>
                  <label className="search-field directory-search">
                    <Search size={19} />
                    <input
                      type="search"
                      value={directoryQuery}
                      onChange={(e) => setDirectoryQuery(e.target.value)}
                      placeholder={t("searchCategories")}
                      aria-label={t("searchCategories")}
                    />
                  </label>
                  <div className="category-grid">
                    {categoryStats
                      .filter((c) =>
                        fold(t(c.name)).includes(fold(directoryQuery)),
                      )
                      .map((c, i) => (
                        <button
                          className="category-tile"
                          key={c.name}
                          onClick={() => chooseCategory(c.name)}
                        >
                          <span className="tile-top">
                            <span className="tile-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <ArrowUpRight size={21} />
                          </span>
                          <h2>{t(c.name)}</h2>
                          <div>
                            <strong>{fmt(c.count)}</strong> {t("notices")}
                            <span className="category-active">
                              {fmt(c.active)} {t("active")}
                            </span>
                          </div>
                          <span className="tile-footer">
                            {t("viewNotices")}
                            <ArrowRight size={15} />
                          </span>
                        </button>
                      ))}
                  </div>
                  {!categoryStats.some((c) =>
                    fold(t(c.name)).includes(fold(directoryQuery)),
                  ) && <div className="empty-state">{t("noCategories")}</div>}
                </section>
              )}
              {view === "buyers" && (
                <section className="directory-page">
                  <span className="eyebrow">{t("buyers")}</span>
                  <h1>{t("buyerHeading")}</h1>
                  <p className="page-lead">{t("buyerBody")}</p>
                  <label className="search-field directory-search">
                    <Search size={19} />
                    <input
                      type="search"
                      value={directoryQuery}
                      onChange={(e) => setDirectoryQuery(e.target.value)}
                      placeholder={t("searchBuyers")}
                      aria-label={t("searchBuyers")}
                    />
                  </label>
                  <div className="section-heading">
                    <h2>
                      {fmt(buyers.length)} {t("buyers").toLowerCase()}
                    </h2>
                    <span className="muted">
                      {t("window", { days: data.windowDays })}
                    </span>
                  </div>
                  <div className="buyer-grid">
                    {buyers.slice((page - 1) * 18, page * 18).map((b) => (
                      <button
                        className="buyer-card"
                        key={b.name}
                        onClick={() => {
                          navigate("explore");
                          setFilters({ ...defaults, buyer: b.name });
                        }}
                      >
                        <span className="tile-top">
                          <span className="buyer-avatar">
                            <Building2 size={23} />
                          </span>
                          <ArrowUpRight size={20} />
                        </span>
                        <h3>{b.name}</h3>
                        <p>
                          {[...b.regions]
                            .slice(0, 2)
                            .map((r) => t(r))
                            .join(" · ")}
                        </p>
                        <div className="buyer-stats">
                          <span>
                            <b>{fmt(b.count)}</b>
                            {t("notices")}
                          </span>
                          <span>
                            <b>{fmt(b.active)}</b>
                            {t("active")}
                          </span>
                        </div>
                        <p>
                          {t("estimates")}:{" "}
                          <b>{b.known ? money(b.value) : t("unknown")}</b>
                        </p>
                        <small>
                          {t("estimateCoverage", { count: b.known })}
                        </small>
                        <small>
                          {t("businessId")}: {b.id || t("unknown")}
                          {b.id && companies[b.id]?.found && (
                            <> · {t("verified")}</>
                          )}
                        </small>
                      </button>
                    ))}
                  </div>
                  {!buyers.length && (
                    <div className="empty-state">
                      <Building2 size={30} />
                      <h3>{t("noBuyers")}</h3>
                    </div>
                  )}
                  <Pagination
                    page={page}
                    count={buyers.length}
                    size={18}
                    onChange={setPage}
                  />
                </section>
              )}
              {view === "spending" && (
                <section className="directory-page">
                  <span className="eyebrow">{t("spending")}</span>
                  <h1>{t("spendingHeading")}</h1>
                  <p className="page-lead">{t("spendingBody")}</p>
                  <div className="callout">
                    <CircleHelp size={22} />
                    <p>{t("spendingCoverage")}</p>
                  </div>
                  {spending?.status === "ok" ? (
                    <>
                      <div className="metrics spending-metrics">
                        <div className="metric">
                          <span>
                            {t("recorded")}
                            <Wallet size={17} />
                          </span>
                          <strong>{money(spending.total)}</strong>
                          <small>
                            {date(spending.periodStart)} –{" "}
                            {date(spending.periodEnd)}
                          </small>
                        </div>
                        <div className="metric">
                          <span>
                            {t("accounting")}
                            <Layers3 size={17} />
                          </span>
                          <strong>{fmt(spending.rows)}</strong>
                          <small>{t("credits")}</small>
                        </div>
                        <div className="metric">
                          <span>
                            {t("organisations")}
                            <Building2 size={17} />
                          </span>
                          <strong>{fmt(spending.buyers.length)}</strong>
                          <small>
                            {t("sourceYear", { year: spending.year || "" })}
                          </small>
                        </div>
                      </div>
                      <div className="spending-toolbar">
                        <div
                          className="status-tabs"
                          role="group"
                          aria-label={t("spending")}
                        >
                          {(["buyers", "suppliers", "categories"] as const).map(
                            (tab) => (
                              <button
                                key={tab}
                                className={
                                  spendingTab === tab ? "active-tab" : ""
                                }
                                aria-pressed={spendingTab === tab}
                                onClick={() => {
                                  setSpendingTab(tab);
                                  setSpendingQuery("");
                                  setSpendingPage(1);
                                }}
                              >
                                {t(
                                  tab === "categories"
                                    ? "spendingCategories"
                                    : tab,
                                )}
                              </button>
                            ),
                          )}
                        </div>
                        <a
                          className="button secondary small"
                          href={spending.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("officialDataset")}
                          <ExternalLink size={15} />
                        </a>
                      </div>
                      <label className="search-field directory-search">
                        <Search size={18} />
                        <input
                          type="search"
                          value={spendingQuery}
                          aria-label={t("searchSpending")}
                          placeholder={t("searchSpending")}
                          onChange={(e) => {
                            setSpendingQuery(e.target.value);
                            setSpendingPage(1);
                          }}
                        />
                      </label>
                      <div className="spending-list">
                        <div className="spending-row heading">
                          <span>
                            {t(
                              spendingTab === "categories"
                                ? "spendingCategories"
                                : spendingTab,
                            )}
                          </span>
                          <span>{t("invoiceLines")}</span>
                          <span>{t("netAmount")}</span>
                        </div>
                        {spendingRows
                          .slice((spendingPage - 1) * 25, spendingPage * 25)
                          .map((row, i) => (
                            <div key={i} className="spending-row">
                              <span>
                                <b>{row.name}</b>
                                {"businessId" in row && (
                                  <small>{String(row.businessId || "")}</small>
                                )}
                              </span>
                              <span>{fmt(row.rows)}</span>
                              <strong>{money(row.total)}</strong>
                            </div>
                          ))}
                      </div>
                      {!spendingRows.length && (
                        <div className="empty-state">{t("noSpending")}</div>
                      )}
                      <Pagination
                        page={spendingPage}
                        count={spendingRows.length}
                        size={25}
                        onChange={setSpendingPage}
                      />
                      <p className="source-note">
                        Valtiokonttori / Statskontoret / State Treasury ·
                        Tutkihankintoja · CC BY 4.0 · {t("updated")}{" "}
                        {date(spending.fetchedAt)}
                        {spendingTab === "suppliers" && <> · {t("top250")}</>}
                      </p>
                    </>
                  ) : (
                    <div className="empty-state">
                      <Wallet size={32} />
                      <h2>{t("spendingUnavailable")}</h2>
                      <a
                        className="button primary"
                        href="https://avoindata.suomi.fi/data/fi/dataset/ba96a638-67bf-4747-b084-c78ccfe052e9"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("officialDataset")}
                        <ArrowUpRight size={16} />
                      </a>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Mole small />
              <b>tilimyyrä</b>
              <span>{t("independent")}</span>
            </span>
            <div>
              <button className="text-link" onClick={() => navigate("about")}>
                {t("about")}
                <ArrowUpRight size={13} />
              </button>
              <a
                className="text-link"
                href="https://github.com/Savvyboi/procumonitor"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
                <ArrowUpRight size={13} />
              </a>
            </div>
          </footer>
        </main>
      </div>
      {selected && (
        <NoticeDialog
          n={selected}
          companies={companies}
          notices={notices}
          saved={saved.includes(selected.id)}
          onSave={() => toggleSave(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
      {feedOpen && (
        <Modal title={t("feeds")} onClose={() => setFeedOpen(false)}>
          <div className="modal-content">
            <h2>{t("feeds")}</h2>
            <p>{t("feedBody")}</p>
            <a
              className="button primary feed-all"
              href={BASE + "feeds/all.xml"}
              target="_blank"
              rel="noreferrer"
            >
              <Rss size={18} />
              {t("allNotices")}
              <ArrowUpRight size={16} />
            </a>
            <h3>{t("byRegion")}</h3>
            <div className="feed-links">
              {options.regions.map((region) => (
                <a
                  key={region}
                  href={BASE + "feeds/regions/" + slug(region) + ".xml"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(region)}
                  <Rss size={13} />
                </a>
              ))}
            </div>
            <h3>{t("byBuyerType")}</h3>
            <div className="feed-links">
              {options.buyerTypes.map((type) => (
                <a
                  key={type}
                  href={BASE + "feeds/buyers/" + slug(type) + ".xml"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(type)}
                  <Rss size={13} />
                </a>
              ))}
            </div>
            <a
              className="text-link"
              href={BASE + "data/manifest.json"}
              target="_blank"
              rel="noreferrer"
            >
              {t("allData")}
              <ArrowRight size={14} />
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
