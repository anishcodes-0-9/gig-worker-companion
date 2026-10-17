import { beforeEach, describe, expect, it, vi } from "vitest";

// Fresh module per test so the on-demand registry starts empty.
let i18n;
beforeEach(async () => {
  vi.resetModules();
  i18n = await import("@/lib/i18n");
});

describe("on-demand locales", () => {
  it("bundles only English up front and falls back to it before a language loads", () => {
    expect(Object.keys(i18n.STRINGS)).toEqual(["en"]);
    expect(i18n.translate("ta", "retry")).toBe("Retry");
    expect(i18n.translateMessage("ta", "Enter your name")).toBe("Enter your name");
  });

  it("registers a language's strings and messages once loaded", async () => {
    await i18n.loadLocale("ta");
    expect(i18n.translate("ta", "retry")).not.toBe("Retry");
    expect(i18n.translate("ta", "retry")).toMatch(/[஀-௿]/);
    expect(i18n.translateMessage("ta", "Enter your name")).toMatch(/[஀-௿]/);
    expect(Object.keys(i18n.STRINGS).sort()).toEqual(["en", "ta"]);
  });

  it("loads every supported language and ignores unknown or inherited names", async () => {
    await Promise.all(i18n.LANG_CODES.map(i18n.loadLocale));
    expect(Object.keys(i18n.STRINGS).sort()).toEqual([...i18n.LANG_CODES].sort());
    await i18n.loadLocale("fr");
    await i18n.loadLocale("constructor");
    expect(Object.keys(i18n.STRINGS).sort()).toEqual([...i18n.LANG_CODES].sort());
  });
});

describe("language switching", () => {
  // A controllable loader: each call returns a promise the test settles explicitly.
  function fakeLoader() {
    const calls = {};
    const load = (lang) =>
      new Promise((resolve, reject) => {
        calls[lang] = { resolve, reject };
      });
    return { load, calls };
  }
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("lets the latest choice win when a slow Tamil load finishes after a fast Hindi one", async () => {
    const { load, calls } = fakeLoader();
    const apply = vi.fn();
    const onError = vi.fn();
    const choose = i18n.createLanguageSwitcher({ apply, onError, load });

    const tamil = choose("ta"); // slow
    const hindi = choose("hi"); // chosen later, loads first
    calls.hi.resolve();
    await hindi;
    calls.ta.resolve();
    await tamil;

    expect(apply.mock.calls).toEqual([["hi"]]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("ignores an earlier choice even if it finishes first", async () => {
    const { load, calls } = fakeLoader();
    const apply = vi.fn();
    const choose = i18n.createLanguageSwitcher({ apply, onError: vi.fn(), load });

    const tamil = choose("ta");
    const hindi = choose("hi");
    calls.ta.resolve();
    await tamil;
    expect(apply).not.toHaveBeenCalled();
    calls.hi.resolve();
    await hindi;
    expect(apply.mock.calls).toEqual([["hi"]]);
  });

  it("keeps the current language and reports a failed download of the latest choice", async () => {
    const { load, calls } = fakeLoader();
    const apply = vi.fn();
    const onError = vi.fn();
    const choose = i18n.createLanguageSwitcher({ apply, onError, load });

    const tamil = choose("ta");
    calls.ta.reject(new Error("ChunkLoadError"));
    await expect(tamil).resolves.toBeUndefined(); // never throws into the UI
    expect(apply).not.toHaveBeenCalled();
    expect(onError.mock.calls).toEqual([["ta"]]);

    // A later successful choice still works.
    const hindi = choose("hi");
    calls.hi.resolve();
    await hindi;
    expect(apply.mock.calls).toEqual([["hi"]]);
  });

  it("does not report a failure for a choice the user already replaced", async () => {
    const { load, calls } = fakeLoader();
    const apply = vi.fn();
    const onError = vi.fn();
    const choose = i18n.createLanguageSwitcher({ apply, onError, load });

    const tamil = choose("ta");
    const hindi = choose("hi");
    calls.hi.resolve();
    calls.ta.reject(new Error("ChunkLoadError"));
    await Promise.all([tamil, hindi]);
    await flush();
    expect(onError).not.toHaveBeenCalled();
    expect(apply.mock.calls).toEqual([["hi"]]);
  });

  it("ignores invalid saved values without loading anything", async () => {
    const load = vi.fn();
    const apply = vi.fn();
    const choose = i18n.createLanguageSwitcher({ apply, onError: vi.fn(), load });
    for (const bad of [null, "", "fr", "constructor", "__proto__"]) await choose(bad);
    expect(load).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });
});

describe("failed locale import", () => {
  it("leaves the registry unchanged so the app keeps working, and a retry can succeed", async () => {
    vi.resetModules();
    vi.doMock("@/lib/locales/ta.js", () => {
      throw new Error("ChunkLoadError: simulated network failure");
    });
    const failing = await import("@/lib/i18n");
    await expect(failing.loadLocale("ta")).rejects.toThrow();
    expect(Object.keys(failing.STRINGS)).toEqual(["en"]);
    expect(failing.translate("ta", "retry")).toBe("Retry"); // English fallback still renders

    vi.doUnmock("@/lib/locales/ta.js");
    vi.resetModules();
    const recovered = await import("@/lib/i18n");
    await recovered.loadLocale("ta");
    expect(recovered.translate("ta", "retry")).toMatch(/[஀-௿]/);
  });
});
