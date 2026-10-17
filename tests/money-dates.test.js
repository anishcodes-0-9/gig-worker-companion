import { describe, expect, it } from "vitest";
import { formatMinor, parseMoneyToMinor } from "@/lib/money";
import { addDays, diffDays, isIsoDate, weekStart } from "@/lib/dates";

describe("money", () => {
  it("parses amounts into exact paise", () => {
    expect(parseMoneyToMinor("1,250.50")).toBe(125050);
    expect(parseMoneyToMinor("0.1")).toBe(10);
    expect(parseMoneyToMinor(300)).toBe(30000);
    expect(parseMoneyToMinor("19.99")).toBe(1999);
  });
  it("rejects invalid amounts", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e5", null, undefined, "12.", "9999999999"]) {
      expect(parseMoneyToMinor(bad)).toBeNull();
    }
  });
  it("formats paise with Indian grouping", () => {
    expect(formatMinor(125050)).toBe("₹1,250.50");
    expect(formatMinor(10000000)).toBe("₹1,00,000");
    expect(formatMinor(0)).toBe("₹0");
  });
});

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("26-02-28")).toBe(false);
    expect(isIsoDate(20260228)).toBe(false);
  });
  it("does date arithmetic", () => {
    expect(addDays("2026-02-27", 3)).toBe("2026-03-02");
    expect(diffDays("2026-03-01", "2026-03-11")).toBe(10);
  });
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-10-17")).toBe("2026-10-12"); // Saturday
    expect(weekStart("2026-10-12")).toBe("2026-10-12"); // Monday
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // Sunday
  });
});
