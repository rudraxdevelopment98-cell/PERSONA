"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Dict, type TFn } from "./core";

const Ctx = createContext<{ lang: string; t: TFn }>({ lang: "en", t: makeT(null) });

export function I18nProvider({ lang, dict, children }: { lang: string; dict: Dict | null; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(dict) }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Translator for client components: `const t = useT();` */
export const useT = (): TFn => useContext(Ctx).t;
export const useLang = () => useContext(Ctx).lang;
