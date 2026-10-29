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

async function bootstrap() {
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

    registerSW({
      immediate: true,
      onRegistered(registration) {
        if (registration) {
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
  }
}

void bootstrap()
