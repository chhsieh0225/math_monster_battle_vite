/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import zhTW from './locales/zh-TW';

export type LocaleCode = "zh-TW" | "en-US";
type Dict = Record<string, string>;
type Params = Record<string, string | number>;

const STORAGE_KEY = "mathMonsterBattle_locale";
const FALLBACK_LOCALE: LocaleCode = "zh-TW";

/** Eagerly-loaded default dict; other locales are loaded on demand. */
const loadedDicts: Record<string, Dict> = {
  "zh-TW": zhTW,
};

const LOCALE_LOADERS: Record<LocaleCode, (() => Promise<{ default: Dict }>) | null> = {
  "zh-TW": null, // already loaded
  "en-US": () => import('./locales/en-US'),
};

function normalizeLocale(input: unknown): LocaleCode {
  if (input === "zh-TW" || input === "en-US") return input;
  return FALLBACK_LOCALE;
}

function formatMsg(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, key: string) => String(params[key] ?? ""));
}

function resolveDict(locale: LocaleCode): Dict {
  return loadedDicts[locale] || loadedDicts[FALLBACK_LOCALE];
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

  // Bump this to force re-render after async dict load
  const [dictVersion, setDictVersion] = useState(0);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(normalizeLocale(next));
  }, []);

  // Load non-default locale dict on demand
  const loadingRef = useRef<string | null>(null);
  useEffect(() => {
    if (loadedDicts[locale] || loadingRef.current === locale) return;
    const loader = LOCALE_LOADERS[locale];
    if (!loader) return;
    loadingRef.current = locale;
    loader().then((mod) => {
      loadedDicts[locale] = mod.default;
      loadingRef.current = null;
      setDictVersion((v) => v + 1);
    }).catch(() => {
      loadingRef.current = null;
    });
  }, [locale]);

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
    const dict = resolveDict(locale);
    const fallbackDict = loadedDicts[FALLBACK_LOCALE];
    const msg = dict[key] || fallbackDict[key] || fallback;
    return formatMsg(msg, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, dictVersion]);

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
