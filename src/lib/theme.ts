import type { ThemeMode } from '../types'

export const THEME_STORAGE_KEY = 'gymprogress-theme'

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0b0e14' : '#f4f5f7')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Almacenamiento local no disponible.
  }
}
