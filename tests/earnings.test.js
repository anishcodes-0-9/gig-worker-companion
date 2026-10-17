import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/earnings";

const entry = (date, platform, amountMinor, expensesMinor = 0, hours = 0) => ({
  date, platform, amountMinor, expensesMinor, hours,
});
const payout = (date, platform, amountMinor) => ({ date, platform, amountMinor });

const TODAY = "2026-10-17"; // Saturday; week starts 2026-10-12

describe("summarize", () => {
  it("returns zeros for no data", () => {
    const s = summarize({ entries: [], payouts: [] }, TODAY);
    expect(s.allTime.net).toBe(0);
    expect(s.thisWeek.netPerHour).toBeNull();
    expect(s.byPlatform).toEqual([]);
  });

  it("computes weekly net and net per hour, excluding earlier weeks", () => {
    const s = summarize(
      {
        entries: [
          entry("2026-10-12", "Uber", 100000, 20000, 4),
          entry("2026-10-16", "Uber", 50000, 10000, 4),
          entry("2026-10-11", "Uber", 99999, 0, 10), // previous Sunday
        ],
        payouts: [],
      },
      TODAY,
    );
    expect(s.thisWeek).toMatchObject({ gross: 150000, expenses: 30000, net: 120000, hours: 8 });
    expect(s.thisWeek.netPerHour).toBe(15000);
    expect(s.allTime.gross).toBe(249999);
  });

  it("applies payouts to the oldest earnings first", () => {
    const s = summarize(
      {
        entries: [entry("2026-09-01", "Swiggy", 50000), entry("2026-10-15", "Swiggy", 30000)],
        payouts: [payout("2026-09-10", "Swiggy", 60000)],
      },
      TODAY,
    );
    const [b] = s.byPlatform;
    expect(b).toMatchObject({ earned: 80000, paid: 60000, pending: 20000, surplus: 0 });
    expect(b.oldestUnpaidDate).toBe("2026-10-15");
    expect(b.oldestUnpaidDays).toBe(2);
    expect(b.overdue).toBe(0); // the only unpaid earning is 2 days old
  });

  it("flags earnings unpaid for 7+ days as overdue", () => {
    const s = summarize(
      { entries: [entry("2026-10-10", "Zomato", 40000), entry("2026-10-16", "Zomato", 10000)], payouts: [] },
      TODAY,
    );
    expect(s.byPlatform[0]).toMatchObject({ pending: 50000, overdue: 40000, oldestUnpaidDays: 7 });
    expect(s.overdue).toBe(40000);
  });

  it("keeps platforms separate and reports payout surplus", () => {
    const s = summarize(
      {
        entries: [entry("2026-10-01", "Uber", 10000), entry("2026-10-01", "Ola", 10000)],
        payouts: [payout("2026-10-05", "Uber", 15000)],
      },
      TODAY,
    );
    const uber = s.byPlatform.find((b) => b.platform === "Uber");
    const ola = s.byPlatform.find((b) => b.platform === "Ola");
    expect(uber).toMatchObject({ pending: 0, surplus: 5000, paid: 15000 });
    expect(ola.pending).toBe(10000);
    expect(s.pending).toBe(10000);
    expect(s.paidOut).toBe(15000);
  });
});

describe("edge cases", () => {
  it("does not leak float drift into summed hours", () => {
    const s = summarize(
      { entries: [entry("2026-10-13", "Uber", 1000, 0, 0.1), entry("2026-10-14", "Uber", 1000, 0, 0.2)], payouts: [] },
      TODAY,
    );
    expect(s.thisWeek.hours).toBe(0.3);
  });

  it("treats a fully paid platform as zero pending with no oldest unpaid date", () => {
    const s = summarize(
      { entries: [entry("2026-10-01", "Uber", 5000)], payouts: [payout("2026-10-02", "Uber", 5000)] },
      TODAY,
    );
    expect(s.byPlatform[0]).toMatchObject({ pending: 0, overdue: 0, surplus: 0, oldestUnpaidDate: null, oldestUnpaidDays: null });
  });

  it("handles payouts for a platform with no earnings", () => {
    const s = summarize({ entries: [], payouts: [payout("2026-10-02", "Ola", 700)] }, TODAY);
    expect(s.byPlatform[0]).toMatchObject({ earned: 0, pending: 0, surplus: 700 });
    expect(s.pending).toBe(0);
  });
});
