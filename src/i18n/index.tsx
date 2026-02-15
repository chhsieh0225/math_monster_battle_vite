/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import zhTW from './locales/zh-TW';
import enUS from './locales/en-US';

export type LocaleCode = "zh-TW" | "en-US";
type Dict = Record<string, string>;
type Params = Record<string, string | number>;

const STORAGE_KEY = "mathMonsterBattle_locale";
const FALLBACK_LOCALE: LocaleCode = "zh-TW";

const LOCALES: Record<LocaleCode, Dict> = {
  "zh-TW": zhTW,
  "en-US": enUS,
};

function normalizeLocale(input: unknown): LocaleCode {
  if (input === "zh-TW" || input === "en-US") return input;
  return FALLBACK_LOCALE;
}

function formatMsg(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, key: string) => String(params[key] ?? ""));
}

type I18nApi = {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
  t: (key: string, fallback?: string, params?: Params) => string;
};

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof window === "undefined") return FALLBACK_LOCALE;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return normalizeLocale(stored);
      return FALLBACK_LOCALE;
    } catch {
      return FALLBACK_LOCALE;
    }
  });

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(normalizeLocale(next));
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // best effort
      }
    }
  }, [locale]);

  const t = useCallback((key: string, fallback = key, params?: Params): string => {
    const msg = LOCALES[locale][key] || LOCALES[FALLBACK_LOCALE][key] || fallback;
    return formatMsg(msg, params);
  }, [locale]);

  const value = useMemo<I18nApi>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}
