import { Dumbbell } from 'lucide-react'
import { useExercisePhotoUrl } from '../../hooks/useExercisePhoto'
import { cn } from '../../lib/cn'

interface ExercisePhotoProps {
  imagePath?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'picker'
  className?: string
}

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
  picker: 'h-11 w-11',
}

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  picker: 'h-5 w-5',
}

export function ExercisePhoto({ imagePath, alt, size = 'md', className }: ExercisePhotoProps) {
  const url = useExercisePhotoUrl(imagePath)

  if (!imagePath) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-accent', sizeClasses[size], className)}>
        <Dumbbell className={iconSizes[size]} />
      </div>
    )
  }

  if (!url) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center rounded-xl bg-raised text-faint', sizeClasses[size], className)}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={cn('shrink-0 rounded-xl object-cover', sizeClasses[size], className)}
    />
  )
}