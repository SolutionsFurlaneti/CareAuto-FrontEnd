import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
type Theme = 'dark' | 'light';
export const useThemeStore = create<{ theme: Theme; toggle: () => void }>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { storage: createJSONStorage(() => window.localStorage), name: 'AutoCareManager-theme' },
  ),
);
export function applyTheme() {
  document.documentElement.dataset.theme = useThemeStore.getState().theme;
}
useThemeStore.subscribe(applyTheme);
