import { useMemo } from 'react';
import { useLocaleStore, type Locale } from '../stores/localeStore';
import { commonEnglish } from './catalogs/common';
import { authEnglish } from './catalogs/auth';
import { landingEnglish } from './catalogs/landing';
import { navigationEnglish } from './catalogs/navigation';
import { operationsEnglish } from './catalogs/operations';
import { backofficeEnglish } from './catalogs/backoffice';
import { configurationEnglish } from './catalogs/configuration';

export type TranslationParams = Record<string, string | number>;
export const getLocale = () => useLocaleStore.getState().locale;
export const englishCatalog: Readonly<Record<string, string>> = {
  ...commonEnglish,
  ...authEnglish,
  ...landingEnglish,
  ...navigationEnglish,
  ...operationsEnglish,
  ...backofficeEnglish,
  ...configurationEnglish,
};

export function translateForLocale(
  locale: Locale,
  text: string,
  params?: TranslationParams,
): string {
  const key = text.replace(/\s+/g, ' ').trim();
  const message =
    locale === 'en-US' && Object.hasOwn(englishCatalog, key) ? englishCatalog[key] : text;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    params && Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

export function translate(text: string, params?: TranslationParams): string {
  return translateForLocale(useLocaleStore.getState().locale, text, params);
}

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const t = useMemo(
    () => (text: string, params?: TranslationParams) => translateForLocale(locale, text, params),
    [locale],
  );
  return { locale, setLocale, t };
}
