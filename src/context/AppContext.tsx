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
import type { Settings, ThemeMode } from '../types'
import { applyTheme } from '../lib/theme'
import { todayISO } from '../lib/dates'
import { fetchSettingsFromSupabase, upsertSettingsToSupabase } from '../lib/supabase-data'
import { upsertUserPreferences } from '../lib/supabase'
import { useAuth } from './AuthContext'

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
  updateSettings: (values: import('../lib/validators').SettingsFormValues) => Promise<void>
  toasts: Toast[]
  notify: (message: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
  loading: boolean
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
  const { user, status: authStatus } = useAuth()
  const [settings, setSettings] = useState<Settings | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme)
  const [loading, setLoading] = useState(true)

  // Apply theme to DOM
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Load settings from Supabase when authenticated
  useEffect(() => {
    if (authStatus === 'loading') return
    if (!user) {
      setSettings(undefined)
      setLoading(false)
      return
    }

    setLoading(true)
    void (async () => {
      try {
        const remoteSettings = await fetchSettingsFromSupabase(user.id)
        if (remoteSettings) {
          setSettings(remoteSettings)
          setThemeState(remoteSettings.theme)
          applyTheme(remoteSettings.theme)
          localStorage.setItem('gymprogress-theme', remoteSettings.theme)
        } else {
          // No remote settings yet (new user) - use defaults
          const now = new Date().toISOString()
          const defaultSettings: Settings = {
            id: 'app',
            profile: { initialWeightKg: 63, heightCm: 163, goal: 'perder_grasa_ganar_musculo' },
            targets: { calories: 1400, protein: 125, fat: 40, carbs: 90, carbMin: 85, carbMax: 95 },
            theme: 'dark',
            createdAt: now,
            updatedAt: now,
          }
          setSettings(defaultSettings)
          setThemeState('dark')
        }
      } catch (e) {
        console.error('[AppContext] Error loading settings from Supabase:', e)
        // Fallback to defaults
        const now = new Date().toISOString()
        setSettings({
          id: 'app',
          profile: { initialWeightKg: 63, heightCm: 163, goal: 'perder_grasa_ganar_musculo' },
          targets: { calories: 1400, protein: 125, fat: 40, carbs: 90, carbMin: 85, carbMax: 95 },
          theme: 'dark',
          createdAt: now,
          updatedAt: now,
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [user, authStatus])

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
      localStorage.setItem('gymprogress-theme', nextTheme)
      if (user) {
        try {
          await upsertUserPreferences(user.id, nextTheme)
          // Also update settings in Supabase
          if (settings) {
            await upsertSettingsToSupabase({ ...settings, theme: nextTheme }, user.id)
            setSettings(prev => prev ? { ...prev, theme: nextTheme } : prev)
          }
        } catch {
          notify('No se pudo guardar el tema', 'error')
        }
      }
    },
    [user, settings, notify],
  )

  const updateSettings = useCallback(
    async (values: import('../lib/validators').SettingsFormValues) => {
      if (!user) throw new Error('No hay sesión activa')
      try {
        const { saveSettings } = await import('../lib/repositories')
        const updated = await saveSettings(values)
        setSettings(updated)
        notify('Ajustes guardados')
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'No se pudieron guardar los ajustes'
        notify(msg, 'error')
        throw error
      }
    },
    [user, notify],
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
      updateSettings,
      toasts,
      notify,
      dismissToast,
      loading,
    }),
    [settings, selectedDate, goToToday, theme, changeTheme, toggleTheme, updateSettings, toasts, notify, dismissToast, loading],
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