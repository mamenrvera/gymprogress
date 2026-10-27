import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Dumbbell } from 'lucide-react'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10">
            <Dumbbell className="h-7 w-7 text-accent" />
          </div>
          <h2 className="font-display text-xl font-semibold text-fg">Restaurando sesión…</h2>
          <p className="mt-2 text-sm text-muted">
            Verificando tu identidad, por favor espera.
          </p>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full w-1/4 bg-gradient-to-r from-lime-600 via-lime-400 to-lime-300 animate-ping" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    // Guardar la ubicación a la que intentaba acceder para redirigir tras login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10">
            <Dumbbell className="h-7 w-7 text-accent" />
          </div>
          <p className="text-sm text-muted">Cargando…</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}