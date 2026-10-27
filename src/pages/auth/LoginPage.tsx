import { useSearchParams } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { LoginForm } from '../../components/auth/LoginForm'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const registered = searchParams.get('registered') === 'true'

  return (
    <div className="animate-fade-up min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10">
            <Dumbbell className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-fg">Bienvenido a GymProgress</h1>
          <p className="mt-2 text-sm text-muted">Inicia sesión para sincronizar tus datos</p>
        </div>

        {registered && (
          <div className="mb-6 rounded-xl border border-lime-500/25 bg-lime-500/10 px-3 py-2.5 text-sm text-lime-400">
            Cuenta creada correctamente. Revisa tu correo para confirmar la dirección y luego inicia sesión.
          </div>
        )}

        <div className="card p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}