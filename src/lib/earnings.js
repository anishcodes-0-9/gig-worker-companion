import { addDays, diffDays, weekStart } from "./dates.js";

/** A payout older than this many days with unpaid earnings is flagged as overdue. */
export const OVERDUE_DAYS = 7;

const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0);

function totals(entries) {
  const gross = sum(entries, (e) => e.amountMinor);
  const expenses = sum(entries, (e) => e.expensesMinor);
  const hours = Math.round(sum(entries, (e) => e.hours) * 100) / 100; // avoid float drift (0.1 + 0.2)
  const net = gross - expenses;
  return {
    gross,
    expenses,
    net,
    hours,
    // Net per hour in paise, rounded; null when no hours were logged.
    netPerHour: hours > 0 ? Math.round(net / hours) : null,
  };
}

/**
 * Per platform: earnings recorded, payouts received, and what is still owed.
 * Payouts are applied to the oldest earnings first (FIFO), so the age of the
 * oldest unpaid earning is meaningful.
 */
function platformBalance(platform, entries, payouts, today) {
  let credit = sum(payouts, (p) => p.amountMinor);
  const earned = sum(entries, (e) => e.amountMinor);
  let pending = 0;
  let overdue = 0;
  let oldestUnpaidDate = null;
  for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    const covered = Math.min(credit, entry.amountMinor);
    credit -= covered;
    const remaining = entry.amountMinor - covered;
    if (remaining === 0) continue;
    pending += remaining;
    oldestUnpaidDate ??= entry.date;
    if (diffDays(entry.date, today) >= OVERDUE_DAYS) overdue += remaining;
  }
  return {
    platform,
    earned,
    paid: earned - pending + credit, // total payouts received (incl. any surplus)
    pending,
    overdue,
    surplus: credit, // payouts exceeding recorded earnings: likely a missing entry
    oldestUnpaidDate,
    oldestUnpaidDays: oldestUnpaidDate ? diffDays(oldestUnpaidDate, today) : null,
  };
}

/**
 * @param {{entries: object[], payouts: object[]}} data
 * @param {string} today ISO date
 */
export function summarize({ entries, payouts }, today) {
  const monday = weekStart(today);
  const thisWeek = totals(entries.filter((e) => e.date >= monday && e.date <= addDays(monday, 6)));
  const platforms = [...new Set([...entries, ...payouts].map((x) => x.platform))].sort();
  const byPlatform = platforms.map((name) =>
    platformBalance(
      name,
      entries.filter((e) => e.platform === name),
      payouts.filter((p) => p.platform === name),
      today,
    ),
  );
  return {
    allTime: totals(entries),
    thisWeek,
    weekStart: monday,
    paidOut: sum(payouts, (p) => p.amountMinor),
    pending: sum(byPlatform, (b) => b.pending),
    overdue: sum(byPlatform, (b) => b.overdue),
    byPlatform,
  };
}
