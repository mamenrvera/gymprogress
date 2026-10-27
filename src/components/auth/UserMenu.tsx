import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'

interface UserMenuProps {
  compact?: boolean
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSignOut = async () => {
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
      setOpen(false)
      navigate('/login', { replace: true })
    } catch {
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.')
      setSigningOut(false)
    }
  }

  if (!user) return null

  const displayName = user.email?.split('@')[0] || 'Usuario'

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-line bg-raised px-3 py-2 text-sm font-medium text-fg transition hover:bg-elevated',
          compact && 'px-2 py-1.5',
          open && 'ring-1 ring-lime-500/30 border-lime-500/40',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de usuario: ${user.email}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
          <User className="h-4 w-4" />
        </span>
        <span className="hidden sm:block truncate max-w-[120px] text-left">
          {compact ? displayName : user.email}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menú de usuario"
          className={cn(
            'absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-line bg-surface/95 backdrop-blur-xl shadow-card py-1.5 animate-fade-up',
            compact && 'min-w-[180px]',
          )}
        >
          {/* User info header */}
          <div className="px-3.5 py-2.5 border-b border-line">
            <p className="text-xs font-medium text-fg truncate">{user.email}</p>
            <p className="text-[10px] text-faint mt-0.5">Sesión activa</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-2 my-1 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Menu items */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className={cn(
              'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition',
              'text-rose-400 hover:bg-rose-500/10',
              signingOut && 'opacity-50 cursor-not-allowed',
            )}
          >
            {signingOut ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-400/30 border-t-rose-400" />
                Cerrando sesión…
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}