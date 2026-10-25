import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Settings, ThemeMode } from '../types'
import { db } from '../lib/db'
import { setTheme as persistTheme } from '../lib/repositories'
import { applyTheme } from '../lib/theme'
import { todayISO } from '../lib/dates'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface AppContextValue {
  settings?: Settings
  selectedDate: string
  setSelectedDate: (date: string) => void
  goToToday: () => void
  theme: ThemeMode
  changeTheme: (theme: ThemeMode) => Promise<void>
  toggleTheme: () => Promise<void>
  toasts: Toast[]
  notify: (message: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem('gymprogress-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage no disponible
  }
  return 'dark'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setThemeState(settings.theme)
    }
  }, [settings?.theme, theme])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      toastId.current += 1
      const id = toastId.current
      setToasts((current) => [...current.slice(-2), { id, message, kind }])
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, 4200)
    },
    [],
  )

  const changeTheme = useCallback(
    async (nextTheme: ThemeMode) => {
      setThemeState(nextTheme)
      applyTheme(nextTheme)
      try {
        await persistTheme(nextTheme)
      } catch {
        notify('No se pudo guardar el tema', 'error')
      }
    },
    [notify],
  )

  const toggleTheme = useCallback(async () => {
    await changeTheme(theme === 'dark' ? 'light' : 'dark')
  }, [changeTheme, theme])

  const goToToday = useCallback(() => setSelectedDate(todayISO()), [])

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      selectedDate,
      setSelectedDate,
      goToToday,
      theme,
      changeTheme,
      toggleTheme,
      toasts,
      notify,
      dismissToast,
    }),
    [settings, selectedDate, goToToday, theme, changeTheme, toggleTheme, toasts, notify, dismissToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider')
  return context
}

export function useSettings(): Settings | undefined {
  return useApp().settings
}
