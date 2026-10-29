import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

const forgotSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export function ForgotPasswordForm() {
  const { resetPassword, error: authError, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = (location.state as { email?: string } | null)?.email ?? ''
  const [step, setStep] = useState<'form' | 'sent'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: initialEmail },
  })

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      await resetPassword(values.email)
      setStep('sent')
    } catch {
      // Error manejado en resetPassword
    } finally {
      setIsSubmitting(false)
    }
  })

  if (step === 'sent') {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lime-400/10">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="font-display text-xl font-semibold text-fg">Revisa tu correo</h2>
        <p className="mt-2 text-sm text-muted">
          Hemos enviado un enlace de recuperación a tu bandeja de entrada.
          El enlace expirará en 24 horas.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => navigate('/login')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {authError && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
          {authError}
        </div>
      )}

      <div className="text-center mb-4">
        <h2 className="font-display text-xl font-semibold text-fg">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-muted">
          Introduce tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="label">
          Correo electrónico
        </label>
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tuy@ejemplo.com"
            className={cn('input pl-9', errors.email && 'input-error')}
            disabled={isSubmitting || status === 'loading'}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting || status === 'loading'} disabled={status === 'loading'}>
        Enviar enlace de recuperación
      </Button>

      <p className="text-center text-sm text-muted">
        ¿Recordaste tu contraseña?{' '}
        <a href="/login" className="font-medium text-accent hover:underline">
          Iniciar sesión
        </a>
      </p>
    </form>
  )
}