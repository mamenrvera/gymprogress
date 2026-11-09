import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './index.css'
import App from './App'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'

async function checkVersionAndClearCache() {
  if (!import.meta.env.PROD) return
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    if (!res.ok) return
    const { version, buildTime } = await res.json()
    const key = 'gymprogress-deployed-version'
    const last = localStorage.getItem(key)
    const current = `${version}|${buildTime}`
    if (last && last !== current) {
      // New deployment: clear caches and reload once
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      localStorage.setItem(key, current)
      window.location.reload()
      return true
    }
    localStorage.setItem(key, current)
  } catch {
    // ignore
  }
  return false
}

async function bootstrap() {
  const reloaded = await checkVersionAndClearCache()
  if (reloaded) return
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('No se encontró el elemento raíz')

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </React.StrictMode>,
  )

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const { registerSW } = await import('virtual:pwa-register')

    // Detectar si había un service worker controlando la página antes de esta carga.
    // Si lo había, es una actualización (no la primera instalación).
    const hadController = !!navigator.serviceWorker.controller
    let refreshing = false

    // Recargar la página cuando un nuevo service worker toma el control,
    // pero solo si ya había uno anterior (actualización, no primera instalación).
    // Evita recargar si el usuario está escribiendo en un formulario.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      if (!hadController) return
      const active = document.activeElement
      const isEditing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      if (isEditing) {
        // Defer reload until the input loses focus
        const onDone = () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        }
        active?.addEventListener('blur', onDone, { once: true })
        // Fallback: reload after 5 minutes if still editing
        setTimeout(() => {
          if (!refreshing) onDone()
        }, 5 * 60 * 1000)
        return
      }
      refreshing = true
      window.location.reload()
    })

    const updateSW = registerSW({
      immediate: true,
      onRegistered(registration) {
        if (registration) {
          if (registration.waiting) {
            updateSW(true)
          }
          // Comprobar actualizaciones periódicamente (cada hora)
          // para PWAs instaladas que permanecen abiertas.
          setInterval(() => {
            registration.update().catch(() => {
              // Silenciar errores de red en la comprobación de actualizaciones
            })
          }, 60 * 60 * 1000)
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Error al registrar el service worker:', error)
      },
    })

    // Activar un SW en espera si lo hubiera
    // (registerSW con autoUpdate ya lo hace, esto es defensivo)
    // Recuperacion: si falla la carga de un recurso tras una actualizacion,
    // recargar una sola vez para intentar recuperar la version actual.
    let recovered = false
    window.addEventListener('error', (event) => {
      const target = event.target as (HTMLElement & { src?: string; href?: string }) | null
      const url = target?.src || target?.href
      if (!url || recovered) return
      if (url.includes('/assets/') && (url.endsWith('.js') || url.endsWith('.css'))) {
        recovered = true
        console.warn('[PWA] Error cargando recurso, recargando para recuperar:', url)
        setTimeout(() => window.location.reload(), 300)
      }
    }, true)
  }
}

void bootstrap()
