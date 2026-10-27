import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

const registerSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const { signUp, error: authError, status } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const password = watch('password')

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      await signUp(values.email, values.password)
      // Tras registro exitoso, Supabase envía email de confirmación
      // Redirigimos a login con mensaje
      navigate('/login?registered=true', { replace: true })
    } catch {
      // Error manejado en signUp
    } finally {
      setIsSubmitting(false)
    }
  })

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

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {authError && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
          {authError}
        </div>
      )}

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

      <div>
        <label htmlFor="password" className="label">
          Contraseña
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
          Confirmar contraseña
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

      <p className="text-xs text-faint">
        Al crear tu cuenta, aceptas nuestros{' '}
        <a href="#" className="text-accent hover:underline">Términos de uso</a>
        {' '}y{' '}
        <a href="#" className="text-accent hover:underline">Política de privacidad</a>
        .
      </p>

      <Button type="submit" className="w-full" loading={isSubmitting || status === 'loading'} disabled={status === 'loading'}>
        <span className="flex items-center justify-center gap-2">
          Crear cuenta
          <ArrowRight className="h-4 w-4" />
        </span>
      </Button>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="font-medium text-accent hover:underline">
          Iniciar sesión
        </a>
      </p>
    </form>
  )
}