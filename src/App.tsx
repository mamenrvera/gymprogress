import { Component, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import { Layout, ScrollToTop } from './components/Layout'
import { ToastViewport } from './components/ToastViewport'
import { HomePage } from './pages/HomePage'
import { NutritionPage } from './pages/NutritionPage'
import { TrainingPage } from './pages/TrainingPage'
import { WorkoutEditorPage } from './pages/WorkoutEditorPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute'
import { Button } from './components/ui/Button'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz en GymProgress', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="card max-w-md p-6 text-center">
            <h1 className="font-display text-2xl font-semibold text-fg">Algo no ha ido bien</h1>
            <p className="mt-2 text-sm text-muted">
              La aplicación ha encontrado un error inesperado. Tus datos siguen guardados en este dispositivo.
            </p>
            <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-left text-xs text-faint">
              {this.state.error.message}
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Recargar la aplicación
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-semibold text-line">404</p>
      <h1 className="mt-2 text-xl font-semibold">Esta página no existe</h1>
      <p className="mt-1 text-sm text-muted">Vuelve al inicio para seguir con tu progreso.</p>
      <Link to="/" className="btn-primary mt-6">
        Ir al inicio
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Rutas públicas (login, registro, recuperación) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="registro" element={<RegisterPage />} />
            <Route path="recuperar" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Rutas privadas (requieren autenticación) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="alimentacion" element={<NutritionPage />} />
              <Route path="entrenamiento" element={<TrainingPage />} />
              <Route path="entrenamiento/sesion/:id" element={<WorkoutEditorPage />} />
              <Route path="progreso" element={<ProgressPage />} />
              <Route path="ajustes" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          {/* Callback de autenticación (Supabase redirect) */}
          <Route path="auth/callback" element={<AuthCallback />} />
        </Routes>
        <ToastViewport />
      </BrowserRouter>
    </AppErrorBoundary>
  )
}

// Página de callback para confirmación de email / recuperación de contraseña
function AuthCallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10">
          <svg className="h-7 w-7 text-accent animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-fg">Procesando…</h2>
        <p className="mt-2 text-sm text-muted">Completando la autenticación, por favor espera.</p>
      </div>
    </div>
  )
}
