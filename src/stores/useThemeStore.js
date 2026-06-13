import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyTheme, DEFAULT_THEME, THEME_KEYS } from '@/theme/themes'

/*
 * useThemeStore — the chosen theme, persisted to localStorage (key vf-theme).
 * setTheme writes <html data-theme> immediately; on rehydrate the stored
 * theme is re-applied so the store and DOM never drift.
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (key) => {
        const k = THEME_KEYS.includes(key) ? key : DEFAULT_THEME
        applyTheme(k)
        set({ theme: k })
      },
    }),
    {
      name: 'vf-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
