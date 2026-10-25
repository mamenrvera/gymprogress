import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './index.css'
import App from './App'
import { initializeDatabase } from './lib/db'

async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('No se encontró el elemento raíz')

  try {
    await initializeDatabase()
  } catch (error) {
    console.error('No se pudo abrir la base de datos local', error)
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#07090d;color:#e6eaf0;font-family:system-ui,sans-serif">
        <div style="max-width:460px;border:1px solid #232a3a;border-radius:16px;padding:24px;background:#0f131b">
          <h1 style="margin:0 0 8px;font-size:20px">No se pudo abrir el almacenamiento local</h1>
          <p style="margin:0;color:#98a3b6;font-size:14px;line-height:1.6">
            GymProgress necesita IndexedDB para guardar tus datos. Comprueba que no estás en una ventana privada
            con el almacenamiento bloqueado y vuelve a cargar la página.
          </p>
        </div>
      </div>`
    return
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }
}

void bootstrap()
