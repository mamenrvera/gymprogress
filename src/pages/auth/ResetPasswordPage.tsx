import { Dumbbell } from 'lucide-react'
import { ResetPasswordForm } from '../../components/auth/ResetPasswordForm'

export function ResetPasswordPage() {
  return (
    <div className="animate-fade-up min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10">
            <Dumbbell className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-fg">Restablecer contraseña</h1>
          <p className="mt-2 text-sm text-muted">Introduce tu nueva contraseña</p>
        </div>

        <div className="card p-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}