import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Dumbbell,
  LayoutDashboard,
  Moon,
  Settings,
  Sun,
  TrendingUp,
  Utensils,
  WifiOff,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db } from '../lib/db'
import { sumEntries, progressValue } from '../lib/calculations'
import { formatKcal } from '../lib/format'
import { todayISO } from '../lib/dates'
import { cn } from '../lib/cn'
import { Logo } from './ui/Logo'
import { ProgressBar } from './ui/ProgressBar'
import { GOAL_LABELS } from '../types'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', mobileLabel: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/alimentacion', label: 'Alimentación', mobileLabel: 'Comidas', icon: Utensils, end: false },
  { to: '/entrenamiento', label: 'Entrenamiento', mobileLabel: 'Entrenar', icon: Dumbbell, end: false },
  { to: '/progreso', label: 'Progreso', mobileLabel: 'Progreso', icon: TrendingUp, end: false },
  { to: '/ajustes', label: 'Ajustes', mobileLabel: 'Ajustes', icon: Settings, end: false },
]

function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  return online
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function ThemeToggle({ full = false }: { full?: boolean }) {
  const { theme, toggleTheme } = useApp()
  const dark = theme === 'dark'
  if (full) {
    return (
      <button
        type="button"
        onClick={() => void toggleTheme()}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-raised px-3 py-2.5 text-left transition hover:border-ink-500/60 hover:bg-elevated"
        aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      >
        <span className="flex items-center gap-2 text-xs font-medium text-muted">
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {dark ? 'Modo oscuro' : 'Modo claro'}
        </span>
        <span className="relative h-5 w-9 rounded-full bg-line transition">
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-lime-400 transition-transform',
              dark ? 'translate-x-0.5' : 'translate-x-[18px]',
            )}
          />
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      className="btn-icon"
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

function SidebarLiveSummary() {
  const { settings } = useApp()
  const today = todayISO()
  const entries = useLiveQuery(() => db.entries.where('date').equals(today).toArray(), [today]) ?? []
  const latestWeight = useLiveQuery(() => db.bodyWeights.orderBy('date').last(), [])
  const totals = sumEntries(entries)
  const progress = progressValue(totals.calories, settings?.targets.calories ?? 0)

  if (!settings) return null

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-raised/70 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="eyebrow">Hoy</span>
          <span className="text-[11px] font-semibold tabular text-fg">
            {formatKcal(totals.calories)} <span className="font-normal text-faint">/ {formatKcal(progress.target)} kcal</span>
          </span>
        </div>
        <ProgressBar consumed={totals.calories} target={progress.target} unit="kcal" showRemaining={false} compact />
        <div className="mt-2.5 grid grid-cols-3 gap-1 text-center">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-faint">Prot.</p>
            <p className="text-[11px] font-semibold tabular text-protein">{Math.round(totals.protein)} g</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-faint">Grasa</p>
            <p className="text-[11px] font-semibold tabular text-fat">{Math.round(totals.fat)} g</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-faint">Carb.</p>
            <p className="text-[11px] font-semibold tabular text-carbs">{Math.round(totals.carbs)} g</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-line bg-raised/50 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-faint">Peso actual</p>
          <p className="text-sm font-semibold tabular text-fg">
            {latestWeight ? `${latestWeight.weightKg.toLocaleString('es-ES')} kg` : 'Sin registrar'}
          </p>
        </div>
        <span className="max-w-[110px] text-right text-[10px] leading-tight text-faint">{GOAL_LABELS[settings.profile.goal]}</span>
      </div>
    </div>
  )
}

export function Layout() {
  const { settings } = useApp()
  const online = useOnlineStatus()

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-lime-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/80 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-1">
          <Logo />
        </div>

        {settings ? (
          <div className="mt-4 rounded-xl border border-line bg-raised/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-faint">Objetivo</p>
            <p className="truncate text-xs font-medium text-fg">
              {settings.profile.name ? `${settings.profile.name} · ` : ''}
              {GOAL_LABELS[settings.profile.goal]}
            </p>
          </div>
        ) : null}

        <nav aria-label="Navegación principal" className="mt-6 space-y-1">
          {NAV_ITEMS.filter((item) => item.to !== '/ajustes').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-lime-400/10 text-fg shadow-[inset_2px_0_0_0_#bef264]'
                    : 'text-muted hover:bg-raised hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-[18px] w-[18px]', isActive ? 'text-accent' : 'text-faint group-hover:text-muted')} />
                  <span>{item.label}</span>
                  {isActive ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-400" /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <SidebarLiveSummary />
          <ThemeToggle full />
          <NavLink
            to="/ajustes"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition',
                isActive ? 'bg-raised text-fg' : 'text-muted hover:bg-raised hover:text-fg',
              )
            }
          >
            <Settings className="h-4 w-4" />
            Ajustes y perfil
          </NavLink>
          <p className="px-1 text-[9px] uppercase tracking-[0.18em] text-faint">GymProgress · Datos locales</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-app/85 backdrop-blur-xl lg:hidden">
          <div className="safe-top flex h-14 items-center justify-between gap-2 px-4">
            <Logo />
            <div className="flex items-center gap-1.5">
              {!online ? (
                <span className="chip border-amber-500/30 bg-amber-500/10 text-amber-400" title="Los datos se guardan en tu dispositivo">
                  <WifiOff className="h-3 w-3" /> Sin conexión
                </span>
              ) : null}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {!online ? (
          <div className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-[11px] text-amber-400 lg:hidden">
            <WifiOff className="h-3 w-3" /> Sin conexión: puedes seguir registrando datos, se guardan en el dispositivo.
          </div>
        ) : null}

        <main id="contenido-principal" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-app/95 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-medium transition',
                  isActive ? 'text-accent' : 'text-faint hover:text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-10 items-center justify-center rounded-lg transition',
                      isActive ? 'bg-lime-400/10' : '',
                    )}
                  >
                    <item.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.3 : 2} />
                  </span>
                  <span>{item.mobileLabel}</span>
                  {isActive ? <span className="absolute top-0 h-0.5 w-8 rounded-full bg-lime-400" /> : null}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export { ScrollToTop }
