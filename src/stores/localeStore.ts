import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const supportedLocales = ['pt-BR', 'en-US'] as const;
export type Locale = (typeof supportedLocales)[number];
export const isLocale = (value: unknown): value is Locale => value === 'pt-BR' || value === 'en-US';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      setLocale: (locale) => {
        if (isLocale(locale)) set({ locale });
      },
    }),
    {
      name: 'AutoCareManager-locale',
      storage: createJSONStorage(() => window.localStorage),
      partialize: ({ locale }) => ({ locale }),
      merge: (persisted, current) => {
        const saved = persisted as { locale?: unknown } | undefined;
        return { ...current, locale: isLocale(saved?.locale) ? saved.locale : 'pt-BR' };
      },
    },
  ),
);

export function applyLocale() {
  if (typeof document !== 'undefined')
    document.documentElement.lang = useLocaleStore.getState().locale;
}

useLocaleStore.subscribe(applyLocale);
