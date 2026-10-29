import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HeartPulse } from 'lucide-react'
import {
  cardioSessionSchema,
  type CardioSessionFormValues,
  ACTIVITY_TYPES,
  MODALITIES,
  CALORIES_SOURCES,
} from '../../lib/cardioValidators'
import { ACTIVITY_LABELS, ACTIVITY_CATEGORY, CATEGORY_LABELS, ACTIVITY_CATEGORY_ORDER, hasField, CARDIO_INTENSITIES, MODALITY_LABELS, CALORIES_SOURCE_LABELS } from '../../lib/cardio'
import { saveCardioSession } from '../../lib/repositories'
import { useApp } from '../../context/AppContext'
import { cn } from '../../lib/cn'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface Props {
  open: boolean
  session?: import('../../lib/cardio').CardioSession
  defaultDate: string
  onClose: () => void
  onSaved?: (session: import('../../lib/cardio').CardioSession) => void
}

export function CardioFormModal({ open, session, defaultDate, onClose, onSaved }: Props) {
  const { notify } = useApp()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = Boolean(session)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CardioSessionFormValues>({
    resolver: zodResolver(cardioSessionSchema),
    defaultValues: {
      activityType: session?.activityType ?? 'cinta_correr',
      customName: session?.customName ?? '',
      date: session?.date ?? defaultDate,
      startTime: session?.startTime ?? '',
      durationHours: session ? Math.floor(session.durationMin / 60) : 0,
      durationMinutes: session ? session.durationMin % 60 : 30,
      intensity: session?.intensity ?? 'moderada',
      rpe: session?.rpe ?? undefined,
      distanceKm: session?.distanceKm ?? undefined,
      avgSpeedKmh: session?.avgSpeedKmh ?? undefined,
      maxSpeedKmh: session?.maxSpeedKmh ?? undefined,
      avgInclinePct: session?.avgInclinePct ?? undefined,
      maxInclinePct: session?.maxInclinePct ?? undefined,
      runMin: session?.runMin ?? undefined,
      walkMin: session?.walkMin ?? undefined,
      warmupMin: session?.warmupMin ?? undefined,
      cooldownMin: session?.cooldownMin ?? undefined,
      resistance: session?.resistance ?? undefined,
      cadenceRpm: session?.cadenceRpm ?? undefined,
      elevationGainM: session?.elevationGainM ?? undefined,
      surface: session?.surface ?? '',
      modality: session?.modality ?? '',
      sets: session?.sets ?? undefined,
      result: session?.result ?? '',
      calories: session?.calories ?? undefined,
      caloriesSource: session?.caloriesSource ?? '',
      hrAvg: session?.hrAvg ?? undefined,
      hrMax: session?.hrMax ?? undefined,
      notes: session?.notes ?? '',
    },
  })

  const activityType = useWatch({ control, name: 'activityType' }) as import('../../lib/cardio').ActivityType

  useEffect(() => {
    if (!open) return
    reset({
      activityType: session?.activityType ?? 'cinta_correr',
      customName: session?.customName ?? '',
      date: session?.date ?? defaultDate,
      startTime: session?.startTime ?? '',
      durationHours: session ? Math.floor(session.durationMin / 60) : 0,
      durationMinutes: session ? session.durationMin % 60 : 30,
      intensity: session?.intensity ?? 'moderada',
      rpe: session?.rpe ?? undefined,
      distanceKm: session?.distanceKm ?? undefined,
      avgSpeedKmh: session?.avgSpeedKmh ?? undefined,
      maxSpeedKmh: session?.maxSpeedKmh ?? undefined,
      avgInclinePct: session?.avgInclinePct ?? undefined,
      maxInclinePct: session?.maxInclinePct ?? undefined,
      runMin: session?.runMin ?? undefined,
      walkMin: session?.walkMin ?? undefined,
      warmupMin: session?.warmupMin ?? undefined,
      cooldownMin: session?.cooldownMin ?? undefined,
      resistance: session?.resistance ?? undefined,
      cadenceRpm: session?.cadenceRpm ?? undefined,
      elevationGainM: session?.elevationGainM ?? undefined,
      surface: session?.surface ?? '',
      modality: session?.modality ?? '',
      sets: session?.sets ?? undefined,
      result: session?.result ?? '',
      calories: session?.calories ?? undefined,
      caloriesSource: session?.caloriesSource ?? '',
      hrAvg: session?.hrAvg ?? undefined,
      hrMax: session?.hrMax ?? undefined,
      notes: session?.notes ?? '',
    })
  }, [open, session, defaultDate, reset])

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      const saved = await saveCardioSession(values, session?.id)
      notify(isEditing ? 'Actividad actualizada' : 'Actividad registrada')
      onSaved?.(saved)
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar la actividad', 'error')
    } finally {
      setIsSubmitting(false)
    }
  })

  const show = (field: string) => hasField(activityType, field as any)

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar actividad' : 'Nueva actividad de cardio o deporte'} icon={<HeartPulse className="h-4 w-4" />} size="sm">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="cardio-type">Tipo de actividad</label>
          <select id="cardio-type" className="input" {...register('activityType')}>
            {ACTIVITY_CATEGORY_ORDER.map((cat) => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {ACTIVITY_TYPES.filter((t) => ACTIVITY_CATEGORY[t] === cat).map((t) => (
                  <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {activityType === 'personalizado' && (
          <div>
            <label className="label" htmlFor="cardio-custom">Nombre de la actividad</label>
            <input id="cardio-custom" className={cn('input', errors.customName && 'input-error')} placeholder="Ej. Remo en máquina" {...register('customName')} />
            {errors.customName && <p className="field-error">{errors.customName.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cardio-date">Fecha</label>
            <input id="cardio-date" type="date" className={cn('input', errors.date && 'input-error')} {...register('date')} />
            {errors.date && <p className="field-error">{errors.date.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="cardio-start">Hora de inicio (opcional)</label>
            <input id="cardio-start" type="time" className="input" {...register('startTime')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cardio-h">Duración (horas)</label>
            <input id="cardio-h" type="number" min={0} max={24} className={cn('input', errors.durationMinutes && 'input-error')} {...register('durationHours')} />
          </div>
          <div>
            <label className="label" htmlFor="cardio-m">Duración (minutos)</label>
            <input id="cardio-m" type="number" min={0} max={59} className={cn('input', errors.durationMinutes && 'input-error')} {...register('durationMinutes')} />
            {errors.durationMinutes && <p className="field-error">{errors.durationMinutes.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cardio-intensity">Intensidad</label>
            <select id="cardio-intensity" className="input" {...register('intensity')}>
              {CARDIO_INTENSITIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cardio-rpe">RPE (1-10, opcional)</label>
            <input id="cardio-rpe" type="number" min={1} max={10} className={cn('input', errors.rpe && 'input-error')} {...register('rpe')} />
            {errors.rpe && <p className="field-error">{errors.rpe.message}</p>}
          </div>
        </div>

        {show('distance') && (
          <div>
            <label className="label" htmlFor="cardio-dist">Distancia (km, opcional)</label>
            <input id="cardio-dist" type="number" step="0.01" min={0} className={cn('input', errors.distanceKm && 'input-error')} {...register('distanceKm')} />
            {errors.distanceKm && <p className="field-error">{errors.distanceKm.message}</p>}
          </div>
        )}

        {show('avgSpeed') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cardio-avgspeed">Velocidad media (km/h)</label>
              <input id="cardio-avgspeed" type="number" step="0.1" min={0} className={cn('input', errors.avgSpeedKmh && 'input-error')} {...register('avgSpeedKmh')} />
              {errors.avgSpeedKmh && <p className="field-error">{errors.avgSpeedKmh.message}</p>}
            </div>
            {show('maxSpeed') && (
              <div>
                <label className="label" htmlFor="cardio-maxspeed">Velocidad máxima (km/h)</label>
                <input id="cardio-maxspeed" type="number" step="0.1" min={0} className={cn('input', errors.maxSpeedKmh && 'input-error')} {...register('maxSpeedKmh')} />
                {errors.maxSpeedKmh && <p className="field-error">{errors.maxSpeedKmh.message}</p>}
              </div>
            )}
          </div>
        )}

        {show('avgIncline') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cardio-avginc">Inclinación media (%)</label>
              <input id="cardio-avginc" type="number" step="0.5" min={0} className={cn('input', errors.avgInclinePct && 'input-error')} {...register('avgInclinePct')} />
              {errors.avgInclinePct && <p className="field-error">{errors.avgInclinePct.message}</p>}
            </div>
            {show('maxIncline') && (
              <div>
                <label className="label" htmlFor="cardio-maxinc">Inclinación máxima (%)</label>
                <input id="cardio-maxinc" type="number" step="0.5" min={0} className={cn('input', errors.maxInclinePct && 'input-error')} {...register('maxInclinePct')} />
                {errors.maxInclinePct && <p className="field-error">{errors.maxInclinePct.message}</p>}
              </div>
            )}
          </div>
        )}

        {show('runWalk') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cardio-run">Tiempo corriendo (min)</label>
              <input id="cardio-run" type="number" min={0} className={cn('input', errors.runMin && 'input-error')} {...register('runMin')} />
              {errors.runMin && <p className="field-error">{errors.runMin.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="cardio-walk">Tiempo andando (min)</label>
              <input id="cardio-walk" type="number" min={0} className={cn('input', errors.walkMin && 'input-error')} {...register('walkMin')} />
              {errors.walkMin && <p className="field-error">{errors.walkMin.message}</p>}
            </div>
          </div>
        )}

        {show('warmupCooldown') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cardio-warmup">Calentamiento (min, opcional)</label>
              <input id="cardio-warmup" type="number" min={0} className={cn('input', errors.warmupMin && 'input-error')} {...register('warmupMin')} />
            </div>
            <div>
              <label className="label" htmlFor="cardio-cooldown">Enfriamiento (min, opcional)</label>
              <input id="cardio-cooldown" type="number" min={0} className={cn('input', errors.cooldownMin && 'input-error')} {...register('cooldownMin')} />
            </div>
          </div>
        )}

        {show('resistance') && (
          <div>
            <label className="label" htmlFor="cardio-res">Resistencia / nivel (opcional)</label>
            <input id="cardio-res" type="number" step="0.5" min={0} className={cn('input', errors.resistance && 'input-error')} {...register('resistance')} />
            {errors.resistance && <p className="field-error">{errors.resistance.message}</p>}
          </div>
        )}

        {show('cadence') && (
          <div>
            <label className="label" htmlFor="cardio-cad">Cadencia (rpm/spm, opcional)</label>
            <input id="cardio-cad" type="number" min={0} className={cn('input', errors.cadenceRpm && 'input-error')} {...register('cadenceRpm')} />
            {errors.cadenceRpm && <p className="field-error">{errors.cadenceRpm.message}</p>}
          </div>
        )}

        {show('elevation') && (
          <div>
            <label className="label" htmlFor="cardio-elev">Desnivel positivo (m, opcional)</label>
            <input id="cardio-elev" type="number" min={0} className={cn('input', errors.elevationGainM && 'input-error')} {...register('elevationGainM')} />
            {errors.elevationGainM && <p className="field-error">{errors.elevationGainM.message}</p>}
          </div>
        )}

        {show('surface') && (
          <div>
            <label className="label" htmlFor="cardio-surface">Superficie / ruta (opcional)</label>
            <input id="cardio-surface" className="input" placeholder="Asfalto, tierra, pista..." {...register('surface')} />
          </div>
        )}

        {show('modality') && (
          <div>
            <label className="label" htmlFor="cardio-mod">Modalidad</label>
            <select id="cardio-mod" className="input" {...register('modality')}>
              <option value="">—</option>
              {MODALITIES.map((m) => <option key={m} value={m}>{MODALITY_LABELS[m]}</option>)}
            </select>
          </div>
        )}

        {show('sets') && (
          <div>
            <label className="label" htmlFor="cardio-sets">Número de sets (opcional)</label>
            <input id="cardio-sets" type="number" min={0} className={cn('input', errors.sets && 'input-error')} {...register('sets')} />
            {errors.sets && <p className="field-error">{errors.sets.message}</p>}
          </div>
        )}

        {show('result') && (
          <div>
            <label className="label" htmlFor="cardio-result">Resultado (opcional)</label>
            <input id="cardio-result" className="input" placeholder="Ej. 6-4, 6-3" {...register('result')} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cardio-cal">Calorías (opcional)</label>
            <input id="cardio-cal" type="number" min={0} className={cn('input', errors.calories && 'input-error')} {...register('calories')} />
            {errors.calories && <p className="field-error">{errors.calories.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="cardio-calsrc">Fuente de calorías</label>
            <select id="cardio-calsrc" className="input" {...register('caloriesSource')}>
              <option value="">—</option>
              {CALORIES_SOURCES.map((c) => <option key={c} value={c}>{CALORIES_SOURCE_LABELS[c]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cardio-hravg">FC media (opcional)</label>
            <input id="cardio-hravg" type="number" min={30} max={250} className={cn('input', errors.hrAvg && 'input-error')} {...register('hrAvg')} />
            {errors.hrAvg && <p className="field-error">{errors.hrAvg.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="cardio-hrmax">FC máxima (opcional)</label>
            <input id="cardio-hrmax" type="number" min={30} max={250} className={cn('input', errors.hrMax && 'input-error')} {...register('hrMax')} />
            {errors.hrMax && <p className="field-error">{errors.hrMax.message}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cardio-notes">Notas (opcional)</label>
          <textarea id="cardio-notes" rows={2} className="input resize-none" placeholder="Sensaciones, ritmo, clima..." {...register('notes')} />
          {errors.notes && <p className="field-error">{errors.notes.message}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEditing ? 'Guardar cambios' : 'Registrar actividad'}</Button>
        </div>
      </form>
    </Modal>
  )
}