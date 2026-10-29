import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

const loginSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const { signIn, error: authError, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const emailValue = watch('email')

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      await signIn(values.email, values.password)
      navigate(from, { replace: true })
    } catch {
      // El error ya se maneja en signIn
    } finally {
      setIsSubmitting(false)
    }
  })

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
            autoComplete="current-password"
            placeholder="••••••••"
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
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="checkbox" />
          <span className="text-sm text-muted">Recordarme</span>
        </label>
        <button
          type="button"
          onClick={() => navigate('/recuperar', { state: { email: emailValue } })}
          className="text-sm font-medium text-accent hover:underline"
        >
          ¿Has olvidado tu contraseña?
        </button>
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting || status === 'loading'} disabled={status === 'loading'}>
        <span className="flex items-center justify-center gap-2">
          Iniciar sesión
          <ArrowRight className="h-4 w-4" />
        </span>
      </Button>

      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <a href="/registro" className="font-medium text-accent hover:underline">
          Crear una
        </a>
      </p>
    </form>
  )
}