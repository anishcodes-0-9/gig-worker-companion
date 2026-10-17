"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { LANGS } from "@/lib/i18n";
import { ISSUE_KEYS } from "@/lib/support/issues";
import Field from "./Field";
import { PlatformOptions } from "./EarningsPanel";
import { useI18n } from "./LangContext";

function ModeBanner({ mode, fallback }) {
  const { t } = useI18n();
  if (mode === "ai") {
    return (
      <p className="banner banner-ai">
        <strong>{t("aiMode")}</strong> {t("aiModeText")}
      </p>
    );
  }
  return (
    <p className="banner banner-demo">
      <strong>{t("demoMode")}</strong> {fallback ? t("demoFallback") : t("demoNoKey")} {t("demoEnable")}
    </p>
  );
}

function Answer({ result }) {
  const { t } = useI18n();
  return (
    <div className="stack" aria-live="polite">
      {result.emergency && (
        <div role="alert" className="banner banner-emergency">
          <strong>{t("emergencyCall")}</strong>
          <ul>
            {result.emergencyNumbers.map((n) => (
              <li key={n.number}>
                <a href={`tel:${n.number}`}>
                  <strong>{n.number}</strong>
                </a>{" "}
                — {n.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.answer && (
        <div className="card ai-answer">
          <h4>{t("aiSummary")}</h4>
          <p className="preline">{result.answer}</p>
        </div>
      )}
      {result.matches.map((m) => (
        <article className="card" key={m.id}>
          <p className="chip">{m.category}</p>
          <h4>{m.title}</h4>
          <p>{m.summary}</p>
          <ul className="steps">
            {m.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {m.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" lang="en">
              {l.label}
            </a>
          ))}
        </article>
      ))}
      {!result.matches.length && (
        <div className="card">
          <p>{t("noAnswer")}</p>
          <ul className="steps">
            {result.topics.map((topic) => (
              <li key={topic.id}>{topic.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AskDesk({ mode }) {
  const { lang, t, tm } = useI18n();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // An answer is in the language it was asked in; clear it when the language changes.
  useEffect(() => setResult(null), [lang]);

  async function ask(text) {
    setBusy(true);
    setError("");
    const { ok, data } = await api("/api/support", { method: "POST", body: JSON.stringify({ question: text, lang }) });
    setBusy(false);
    if (ok) setResult(data);
    else setError(tm(data.fields?.question || data.message || "") || t("askFailed"));
  }

  return (
    <section className="card" aria-labelledby="ask-title">
      <h3 id="ask-title">{t("askTitle")}</h3>
      <p className="muted">{t("askIntro")}</p>
      <p className="banner banner-emergency-note">
        <strong>{t("emergencyNow")}</strong> {t("emergencyLimit")}
      </p>
      <ModeBanner mode={result?.mode ?? mode} fallback={result?.fallback} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        noValidate
      >
        <Field id="question" label={t("question")} error={error} hint={t("questionHint")}>
          {(a) => (
            <textarea {...a} rows={3} maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} />
          )}
        </Field>
        <div className="actions">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t("searching") : t("ask")}
          </button>
        </div>
      </form>
      <div className="examples" aria-label={t("exampleQuestions")}>
        {t("examples").map((q) => (
          <button
            key={q}
            className="chip-btn"
            onClick={() => {
              setQuestion(q);
              ask(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>
      {result && <Answer result={result} />}
      <p className="hint">{t("disclaimer")}</p>
    </section>
  );
}

function GrievanceDesk({ draft, mode }) {
  const { lang, t, tm } = useI18n();
  const headingRef = useRef(null);
  const blank = { name: "", platform: "", issue: "unpaid", details: "", amount: "", fromDate: "", workerId: "" };
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [letter, setLetter] = useState("");
  const [letterLang, setLetterLang] = useState(null); // null: follow the UI language
  const [polish, setPolish] = useState(false);
  const [wording, setWording] = useState(null); // { wording: "ai" | "template", fallback? } of the last letter
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
  const err = (name) => errors[name] && tm(errors[name]);

  // Prefill from the Earnings tab ("Draft complaint").
  useEffect(() => {
    if (!draft) return;
    const { key, ...prefill } = draft;
    setValues((v) => ({ ...v, ...prefill, details: v.details || t("prefillDetails") }));
    setLetter("");
    setErrors({});
    headingRef.current?.focus();
  }, [draft]); // run only for a new draft, not when the language changes

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setCopied("");
    const body = { ...values, lang: letterLang ?? lang, polish: mode === "ai" && polish };
    const { ok, data } = await api("/api/grievance", { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (ok) {
      setErrors({});
      setLetter(data.letter);
      setWording({ wording: data.wording, fallback: data.fallback });
    } else {
      setLetter("");
      setWording(null);
      setErrors(data.fields || { form: data.message || "" });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied("copied");
    } catch {
      setCopied("copyFailed");
    }
  }

  return (
    <section className="card" aria-labelledby="grievance-title">
      <h3 id="grievance-title" tabIndex={-1} ref={headingRef}>
        {t("grievanceTitle")}
      </h3>
      <p className="muted">{t("grievanceIntro")}</p>
      <form onSubmit={submit} noValidate>
        <div className="grid">
          <Field id="g-name" label={t("name")} error={err("name")}>
            {(a) => <input {...a} autoComplete="name" value={values.name} onChange={set("name")} required />}
          </Field>
          <Field id="g-platform" label={t("platform")} error={err("platform")}>
            {(a) => (
              <select {...a} value={values.platform} onChange={set("platform")} required>
                <PlatformOptions />
              </select>
            )}
          </Field>
          <Field id="g-issue" label={t("issue")} error={err("issue")}>
            {(a) => (
              <select {...a} value={values.issue} onChange={set("issue")}>
                {ISSUE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`issue_${key}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="g-workerId" label={t("workerId")} error={err("workerId")} hint={t("optional")}>
            {(a) => <input {...a} value={values.workerId} onChange={set("workerId")} maxLength={40} />}
          </Field>
          <Field id="g-amount" label={t("amountInvolved")} error={err("amount")} hint={t("optional")}>
            {(a) => <input {...a} inputMode="decimal" value={values.amount} onChange={set("amount")} />}
          </Field>
          <Field id="g-fromDate" label={t("since")} error={err("fromDate")} hint={t("optional")}>
            {(a) => <input {...a} type="date" value={values.fromDate} onChange={set("fromDate")} />}
          </Field>
        </div>
        <Field id="g-details" label={t("details")} error={err("details")}>
          {(a) => <textarea {...a} rows={4} maxLength={1500} value={values.details} onChange={set("details")} required />}
        </Field>
        <div className="grid">
          <Field id="g-letterLang" label={t("letterLanguage")}>
            {(a) => (
              <select {...a} value={letterLang ?? lang} onChange={(e) => setLetterLang(e.target.value)}>
                {Object.entries(LANGS).map(([code, label]) => (
                  <option key={code} value={code} lang={code}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        {mode === "ai" && (
          <label className="check">
            <input type="checkbox" checked={polish} onChange={(e) => setPolish(e.target.checked)} />
            {t("polishLabel")}
          </label>
        )}
        {"form" in errors && (
          <p role="alert" className="error">
            {errors.form ? tm(errors.form) : t("letterFailed")}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t("creating") : t("createLetter")}
          </button>
        </div>
      </form>
      {letter && (
        <div className="letter-wrap">
          <h4>{t("yourLetter")}</h4>
          {wording?.wording === "ai" && <p className="banner banner-ai">{t("letterAi")}</p>}
          {wording?.fallback && <p className="banner banner-demo">{t("letterFallback")}</p>}
          <label htmlFor="letter" className="sr-only">
            {t("letterLabel")}
          </label>
          <textarea id="letter" className="letter" rows={16} value={letter} onChange={(e) => setLetter(e.target.value)} />
          <div className="actions">
            <button onClick={copy}>{t("copy")}</button>
            <span role="status" className="status">
              {copied && t(copied)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SupportPanel({ draft }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("demo");
  useEffect(() => {
    api("/api/support").then(({ ok, data }) => ok && setMode(data.mode));
  }, []);
  return (
    <div className="stack">
      <h2 className="sr-only">{t("tabSupport")}</h2>
      <AskDesk mode={mode} />
      <GrievanceDesk draft={draft} mode={mode} />
    </div>
  );
}
