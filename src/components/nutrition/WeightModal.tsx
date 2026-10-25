import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { Info, Scale } from 'lucide-react'
import { db } from '../../lib/db'
import { bodyWeightSchema, type BodyWeightFormValues } from '../../lib/validators'
import { upsertBodyWeight } from '../../lib/repositories'
import { useApp } from '../../context/AppContext'
import { bmi } from '../../lib/calculations'
import { formatMediumEs, todayISO } from '../../lib/dates'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

interface WeightModalProps {
  open: boolean
  onClose: () => void
  defaultDate?: string
  onSaved?: () => void
}

export function WeightModal({ open, onClose, defaultDate, onSaved }: WeightModalProps) {
  const { notify, settings } = useApp()
  const latest = useLiveQuery(() => db.bodyWeights.orderBy('date').last(), [])
  const fallbackWeight = latest?.weightKg ?? settings?.profile.initialWeightKg ?? 63

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BodyWeightFormValues>({
    resolver: zodResolver(bodyWeightSchema),
    defaultValues: {
      date: defaultDate ?? todayISO(),
      weightKg: fallbackWeight,
      note: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      date: defaultDate ?? todayISO(),
      weightKg: latest?.weightKg ?? settings?.profile.initialWeightKg ?? 63,
      note: '',
    })
  }, [open, defaultDate, latest?.weightKg, settings?.profile.initialWeightKg, reset])

  const weight = Number(watch('weightKg')) || 0
  const height = settings?.profile.heightCm ?? 0
  const currentBmi = weight && height ? bmi(weight, height) : 0
  const bmiLabel =
    currentBmi === 0
      ? ''
      : currentBmi < 18.5
        ? 'Bajo peso'
        : currentBmi < 25
          ? 'Rango saludable'
          : currentBmi < 30
            ? 'Sobrepeso'
            : 'Obesidad'

  const onSubmit = handleSubmit(async (values) => {
    try {
      await upsertBodyWeight(values)
      notify('Peso corporal guardado')
      onSaved?.()
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el peso', 'error')
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar peso corporal"
      description="Un registro por día. Si ya existe, se actualiza."
      icon={<Scale className="h-4 w-4" />}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="weight-date">
              Fecha
            </label>
            <input id="weight-date" type="date" className="input" {...register('date')} />
            {errors.date ? <p className="field-error">{errors.date.message}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="weight-value">
              Peso (kg)
            </label>
            <input
              id="weight-value"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="400"
              className={cn('input text-lg font-semibold tabular', errors.weightKg && 'input-error')}
              {...register('weightKg', { valueAsNumber: true })}
            />
            {errors.weightKg ? <p className="field-error">{errors.weightKg.message}</p> : null}
          </div>
        </div>

        {currentBmi ? (
          <div className="flex items-center justify-between rounded-xl border border-line bg-raised px-3 py-2.5 text-xs">
            <span className="text-muted">
              IMC estimado · {bmiLabel}
            </span>
            <span className="font-semibold tabular text-fg">{currentBmi}</span>
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="weight-note">
            Nota
          </label>
          <input id="weight-note" className="input" placeholder="Opcional: en ayunas, tras viaje…" {...register('note')} />
          {errors.note ? <p className="field-error">{errors.note.message}</p> : null}
        </div>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Pésate siempre en condiciones similares para que la tendencia sea fiable. El IMC es solo una referencia
          general.
        </p>

        <div className="rounded-lg bg-raised px-3 py-2 text-[11px] text-faint">
          {latest ? `Último registro: ${latest.weightKg.toLocaleString('es-ES')} kg · ${formatMediumEs(latest.date)}` : 'Aún no hay registros de peso.'}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Guardar peso
          </Button>
        </div>
      </form>
    </Modal>
  )
}
