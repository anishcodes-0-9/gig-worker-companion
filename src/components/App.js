"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { LANGS, translate, translateMessage } from "@/lib/i18n";
import EarningsPanel from "./EarningsPanel";
import SupportPanel from "./SupportPanel";
import { LangContext } from "./LangContext";

const TABS = [
  { id: "earnings", label: "tabEarnings" },
  { id: "support", label: "tabSupport" },
];
const LANG_STORAGE_KEY = "gwc-lang";

export default function App() {
  const [lang, setLang] = useState("en");
  const [tab, setTab] = useState("earnings");
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState(null); // null, or the server message ("" if none)
  const [draft, setDraft] = useState(null); // prefill for the grievance form
  const tabRefs = useRef({});
  const t = (key, vars) => translate(lang, key, vars);

  // Remember the language per browser; storage may be unavailable (private mode).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved in LANGS) setLang(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const refresh = useCallback(async () => {
    const { ok, data } = await api("/api/earnings");
    if (ok) {
      setSnapshot(data);
      setLoadError(null);
    } else {
      setLoadError(data.message ?? "");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startComplaint = (prefill) => {
    setDraft({ ...prefill, key: Date.now() });
    setTab("support");
  };

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event) => {
    const index = TABS.findIndex((x) => x.id === tab);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <LangContext.Provider value={lang}>
      <a className="skip-link" href="#main">
        {t("skip")}
      </a>
      <header className="app-header">
        <div className="container header-row">
          <div>
            <h1>{t("appTitle")}</h1>
            <p>{t("tagline")}</p>
          </div>
          <div className="lang-switch" role="group" aria-label={t("language")}>
            {Object.entries(LANGS).map(([code, label]) => (
              <button key={code} lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="container">
        <div role="tablist" aria-label={t("sections")} className="tabs" onKeyDown={onTabKeyDown}>
          {TABS.map((x) => (
            <button
              key={x.id}
              ref={(el) => (tabRefs.current[x.id] = el)}
              role="tab"
              id={`tab-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls={`panel-${x.id}`}
              tabIndex={tab === x.id ? 0 : -1}
              onClick={() => setTab(x.id)}
            >
              {t(x.label)}
            </button>
          ))}
        </div>
        <main id="main" tabIndex={-1}>
          {loadError !== null && (
            <p role="alert" className="banner banner-error">
              {loadError ? translateMessage(lang, loadError) : t("loadError")}{" "}
              <button onClick={refresh}>{t("retry")}</button>
            </p>
          )}
          {snapshot?.storage === "temporary" && <p className="banner banner-demo">{t("storageTemporary")}</p>}
          <section role="tabpanel" id="panel-earnings" aria-labelledby="tab-earnings" hidden={tab !== "earnings"}>
            <EarningsPanel snapshot={snapshot} onChange={setSnapshot} onComplaint={startComplaint} />
          </section>
          <section role="tabpanel" id="panel-support" aria-labelledby="tab-support" hidden={tab !== "support"}>
            <SupportPanel draft={draft} />
          </section>
        </main>
        <footer className="footer">
          {snapshot?.storage === "persistent" && <p>{t("storagePersistent")}</p>}
          {snapshot?.storage === "local" && <p>{t("storageLocal")}</p>}
          {t("translationNotice") && <p>{t("translationNotice")}</p>}
          <p>{t("footer")}</p>
        </footer>
      </div>
    </LangContext.Provider>
  );
}
