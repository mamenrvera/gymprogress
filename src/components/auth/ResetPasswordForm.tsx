import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

const resetSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type ResetFormValues = z.infer<typeof resetSchema>

export function ResetPasswordForm() {
  const { updatePassword, error: authError, status } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Verificar que hay token en la URL (Supabase lo pasa como hash o query param)
  const hasToken = searchParams.has('access_token') || searchParams.has('token')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const password = watch('password')

  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (!pwd) return { label: '', color: 'bg-line', width: '0%' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    
    if (score <= 2) return { label: 'Débil', color: 'bg-rose-500', width: '33%' }
    if (score <= 3) return { label: 'Media', color: 'bg-amber-500', width: '66%' }
    return { label: 'Fuerte', color: 'bg-lime-500', width: '100%' }
  }

  const strength = getPasswordStrength(password)

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      await updatePassword(values.password)
      setStep('success')
    } catch {
      // Error manejado en updatePassword
    } finally {
      setIsSubmitting(false)
    }
  })

  if (!hasToken && step === 'form') {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
          <Lock className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-fg">Enlace inválido o expirado</h2>
        <p className="mt-2 text-sm text-muted">
          Este enlace de recuperación no es válido o ha expirado.
          Solicita uno nuevo desde la página de recuperación.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => navigate('/recuperar')}>
          Solicitar nuevo enlace
        </Button>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lime-400/10">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="font-display text-xl font-semibold text-fg">Contraseña actualizada</h2>
        <p className="mt-2 text-sm text-muted">
          Tu contraseña se ha cambiado correctamente.
          Ya puedes iniciar sesión con la nueva contraseña.
        </p>
        <Button className="mt-6" onClick={() => navigate('/login')}>
          <ArrowRight className="h-4 w-4 mr-2" />
          Ir al inicio de sesión
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
        <h2 className="font-display text-xl font-semibold text-fg">Nueva contraseña</h2>
        <p className="mt-1 text-sm text-muted">
          Introduce tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="password" className="label">
          Nueva contraseña
        </label>
        <div className="relative mt-1">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className={cn('input pl-9 pr-10', errors.password && 'input-error')}
            disabled={isSubmitting || status === 'loading'}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="field-error">{errors.password.message}</p>}
        
        {password && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-faint">Fortaleza:</span>
              <span className={`font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: strength.width }}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">
          Confirmar nueva contraseña
        </label>
        <div className="relative mt-1">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            className={cn('input pl-9', errors.confirmPassword && 'input-error')}
            disabled={isSubmitting || status === 'loading'}
            {...register('confirmPassword')}
          />
        </div>
        {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting || status === 'loading'} disabled={status === 'loading'}>
        <span className="flex items-center justify-center gap-2">
          Actualizar contraseña
          <ArrowRight className="h-4 w-4" />
        </span>
      </Button>

      <p className="text-center text-sm text-muted">
        <a href="/login" className="font-medium text-accent hover:underline">
          Volver al inicio de sesión
        </a>
      </p>
    </form>
  )
}