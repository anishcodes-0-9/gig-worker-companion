"use client";

import { createContext, useContext } from "react";
import { translate, translateMessage } from "@/lib/i18n";

export const LangContext = createContext("en");

/** Current language plus `t` (UI strings) and `tm` (server messages). */
export function useI18n() {
  const lang = useContext(LangContext);
  return {
    lang,
    t: (key, vars) => translate(lang, key, vars),
    tm: (message) => translateMessage(lang, message),
  };
}
