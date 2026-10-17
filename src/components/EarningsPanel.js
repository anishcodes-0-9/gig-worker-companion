"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { formatMinor } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { PLATFORMS } from "@/lib/platforms";
import Field from "./Field";
import { useI18n } from "./LangContext";

const money = (minor) => formatMinor(minor);

function Stat({ label, value, note, tone }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <p>{note}</p>}
    </div>
  );
}

export function PlatformOptions() {
  const { t } = useI18n();
  return (
    <>
      <option value="">{t("choose")}</option>
      {PLATFORMS.map((name) => (
        <option key={name} value={name}>
          {name === "Other" ? t("platformOther") : name}
        </option>
      ))}
    </>
  );
}

function RecordForm({ kind, today, onSaved }) {
  const { t, tm } = useI18n();
  const isEntry = kind === "entry";
  const blank = { date: today, platform: "", amount: "", expenses: "", hours: "", note: "" };
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (name) => (event) => setValues((v) => ({ ...v, [name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const body = { kind, date: values.date, platform: values.platform, amount: values.amount, note: values.note };
    if (isEntry) Object.assign(body, { expenses: values.expenses || "0", hours: values.hours || 0 });
    const { ok, data } = await api("/api/earnings", { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (ok) {
      setErrors({});
      setValues({ ...blank, platform: values.platform });
      setStatus(isEntry ? "earningsSaved" : "payoutSaved");
      onSaved(data);
    } else {
      setErrors(data.fields || { form: data.message || "" });
    }
  }

  const p = `${kind}-`;
  const err = (name) => errors[name] && tm(errors[name]);
  return (
    <form className="card" onSubmit={submit} noValidate aria-labelledby={`${p}title`}>
      <h3 id={`${p}title`}>{isEntry ? t("logEarnings") : t("recordPayout")}</h3>
      <div className="grid">
        <Field id={`${p}date`} label={t("date")} error={err("date")}>
          {(a) => <input {...a} type="date" max={today} value={values.date} onChange={set("date")} required />}
        </Field>
        <Field id={`${p}platform`} label={t("platform")} error={err("platform")}>
          {(a) => (
            <select {...a} value={values.platform} onChange={set("platform")} required>
              <PlatformOptions />
            </select>
          )}
        </Field>
        <Field id={`${p}amount`} label={isEntry ? t("earned") : t("received")} error={err("amount")}>
          {(a) => <input {...a} inputMode="decimal" autoComplete="off" value={values.amount} onChange={set("amount")} required />}
        </Field>
        {isEntry && (
          <>
            <Field id="entry-expenses" label={t("expenses")} error={err("expenses")} hint={t("optional")}>
              {(a) => <input {...a} inputMode="decimal" autoComplete="off" value={values.expenses} onChange={set("expenses")} />}
            </Field>
            <Field id="entry-hours" label={t("hours")} error={err("hours")} hint={t("hoursHint")}>
              {(a) => <input {...a} inputMode="decimal" autoComplete="off" value={values.hours} onChange={set("hours")} />}
            </Field>
          </>
        )}
        <Field id={`${p}note`} label={t("note")} error={err("note")} hint={t("optional")}>
          {(a) => <input {...a} maxLength={200} value={values.note} onChange={set("note")} />}
        </Field>
      </div>
      {"form" in errors && (
        <p role="alert" className="error">
          {errors.form ? tm(errors.form) : t("saveFailed")}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? t("saving") : isEntry ? t("saveEarnings") : t("savePayout")}
        </button>
        <span role="status" className="status">
          {status && t(status)}
        </span>
      </div>
    </form>
  );
}

function History({ title, kind, items, onDelete }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <section className="card" aria-label={title}>
      <h3>{title}</h3>
      <ul className="history">
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{money(item.amountMinor)}</strong> · {item.platform}
              <span className="muted">
                {" "}
                · {formatDate(item.date)}
                {kind === "entry" && item.hours ? ` · ${t("hoursShort", { hours: item.hours })}` : ""}
                {kind === "entry" && item.expensesMinor
                  ? ` · ${t("expensesShort", { amount: money(item.expensesMinor) })}`
                  : ""}
              </span>
              {item.note && <div className="muted">{item.note}</div>}
            </div>
            <button
              className="link danger"
              onClick={() => onDelete(kind, item.id)}
              aria-label={t("deleteLabel", {
                amount: money(item.amountMinor),
                platform: item.platform,
                date: formatDate(item.date),
              })}
            >
              {t("delete")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function EarningsPanel({ snapshot, onChange, onComplaint }) {
  const { t, tm } = useI18n();
  const [message, setMessage] = useState("");
  if (!snapshot) return <p role="status">{t("loading")}</p>;
  const { summary, entries, payouts, today } = snapshot;
  const week = summary.thisWeek;

  async function remove(kind, id) {
    if (!window.confirm(t("confirmDelete"))) return;
    const { ok, data } = await api(`/api/earnings?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (ok) {
      onChange(data);
      setMessage(t("deleted"));
    } else {
      setMessage(data.message ? tm(data.message) : t("deleteFailed"));
    }
  }

  return (
    <div className="stack">
      <h2 className="sr-only">{t("tabEarnings")}</h2>
      <dl className="stats" aria-label={t("summary")}>
        <Stat
          label={t("netWeek")}
          value={money(week.net)}
          note={t("netWeekNote", { gross: money(week.gross), expenses: money(week.expenses) })}
        />
        <Stat
          label={t("perHour")}
          value={week.netPerHour === null ? "—" : money(week.netPerHour)}
          note={week.hours ? t("hoursLogged", { hours: week.hours }) : t("logHours")}
        />
        <Stat
          label={t("owed")}
          value={money(summary.pending)}
          tone={summary.overdue ? "warn" : undefined}
          note={summary.overdue ? t("unpaid7", { amount: money(summary.overdue) }) : t("nothingUnpaid")}
        />
        <Stat
          label={t("paidOut")}
          value={money(summary.paidOut)}
          note={t("netAllTime", { amount: money(summary.allTime.net) })}
        />
      </dl>

      {summary.byPlatform.length > 0 && (
        <section className="card" aria-labelledby="balances-title">
          <h3 id="balances-title">{t("byPlatform")}</h3>
          <ul className="balances">
            {summary.byPlatform.map((b) => (
              <li key={b.platform}>
                <div>
                  <strong>{b.platform}</strong>
                  <div className="muted">{t("earnedPaid", { earned: money(b.earned), paid: money(b.paid) })}</div>
                  {b.surplus > 0 && <div className="warn-text">{t("surplus", { amount: money(b.surplus) })}</div>}
                </div>
                <div className="balance-right">
                  <strong className={b.overdue ? "warn-text" : ""}>{t("owedAmount", { amount: money(b.pending) })}</strong>
                  {b.oldestUnpaidDays !== null && (
                    <div className="muted">{t("oldestUnpaid", { days: b.oldestUnpaidDays })}</div>
                  )}
                  {b.overdue > 0 && (
                    <button
                      onClick={() =>
                        onComplaint({
                          platform: b.platform,
                          issue: "unpaid",
                          amount: String(b.overdue / 100),
                          fromDate: b.oldestUnpaidDate,
                        })
                      }
                    >
                      {t("draftComplaint")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="hint">{t("fifoHint")}</p>
        </section>
      )}

      <div className="forms">
        <RecordForm kind="entry" today={today} onSaved={onChange} />
        <RecordForm kind="payout" today={today} onSaved={onChange} />
      </div>
      <p role="status" className="status">
        {message}
      </p>
      <History title={t("recentEarnings")} kind="entry" items={entries} onDelete={remove} />
      <History title={t("recentPayouts")} kind="payout" items={payouts} onDelete={remove} />
      {!entries.length && !payouts.length && <p className="muted">{t("empty")}</p>}
    </div>
  );
}
