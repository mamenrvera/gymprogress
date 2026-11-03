import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Calendar, Play, Pencil } from 'lucide-react'
import type { Exercise, Routine, RoutineSchedule, WorkoutSet } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { ExercisePickerModal } from './ExercisePickerModal'
import { SetRow } from './SetRow'
import { ExercisePhoto } from './ExercisePhoto'
import { fetchRoutines, saveRoutine, deleteRoutine, fetchRoutineExercises, saveRoutineExercise, deleteRoutineExercise, fetchRoutineSets, saveRoutineSet, deleteRoutineSetsByExercise, fetchRoutineSchedules, saveRoutineSchedule, deleteRoutineSchedule, startWorkoutFromRoutine } from '../../lib/repositories'
import { useExercises } from '../../hooks/useSupabaseData'
import { useApp } from '../../context/AppContext'

function newId() { return crypto.randomUUID() }
function addMonths(date: string, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

interface RoutineSetLocal {
  id: string
  setNumber: number
  weightKg: string
  reps: string
  rir: string
  isWarmup: boolean
  completed: boolean
}

interface RoutineItem {
  exercise: Exercise
  sets: RoutineSetLocal[]
  restSeconds: string
  notes: string
}

export function RoutinesTab({ onWorkoutCreated }: { onWorkoutCreated?: (id: string) => void }) {
  const { notify, selectedDate } = useApp()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [schedules, setSchedules] = useState<RoutineSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState<Routine | null>(null)
  const [deleting, setDeleting] = useState<Routine | null>(null)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'unscheduled'>('all')

  const reload = async () => {
    setLoading(true)
    try {
      const [rs, ss] = await Promise.all([fetchRoutines(), fetchRoutineSchedules()])
      setRoutines(rs)
      setSchedules(ss)
    } catch (e: any) {
      console.error('[RoutinesTab] load error:', e?.message, 'code:', e?.code, 'details:', e?.details, 'hint:', e?.hint, e)
      notify('No se pudieron cargar las rutinas', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void reload() }, [])

  const scheduledRoutineIds = useMemo(() => new Set(schedules.map((s) => s.routineId)), [schedules])

  const filtered = routines.filter((r) => {
    if (filter === 'scheduled') return scheduledRoutineIds.has(r.id)
    if (filter === 'unscheduled') return !scheduledRoutineIds.has(r.id)
    return true
  })

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteRoutine(deleting.id)
      for (const s of schedules.filter((x) => x.routineId === deleting.id)) await deleteRoutineSchedule(s.id)
      await reload()
      notify('Rutina eliminada')
    } catch {
      notify('No se pudo eliminar la rutina', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleStart = async (routine: Routine) => {
    try {
      const w = await startWorkoutFromRoutine(routine.id, selectedDate)
      notify('Sesión creada desde la rutina')
      onWorkoutCreated?.(w.id)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo iniciar', 'error')
    }
  }

  if (loading) return <div className="skeleton h-32 w-full" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {(['all', 'scheduled', 'unscheduled'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`chip transition ${filter === f ? 'border-lime-500/50 text-accent' : ''}`}>
              {f === 'all' ? 'Todas' : f === 'scheduled' ? 'Programadas' : 'Sin programar'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setCreateOpen(true) }}>
          <Plus className="h-4 w-4" /> Crear rutina
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Calendar className="h-5 w-5" />} title="Sin rutinas" description="Crea tu primera rutina personalizada." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => {
            const sch = schedules.find((s) => s.routineId === r.id)
            return (
              <div key={r.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-fg truncate">{r.name}</h3>
                    {r.muscleGroup && <p className="text-[10px] text-faint">{r.muscleGroup}</p>}
                    {r.description && <p className="text-[10px] text-muted mt-1">{r.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(r); setCreateOpen(true) }} className="btn-icon h-7 w-7" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setScheduleOpen(r)} className="btn-icon h-7 w-7" aria-label="Programar"><Calendar className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleting(r)} className="btn-icon h-7 w-7 hover:text-rose-400" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {sch && (
                  <p className="text-[10px] text-faint">
                    {sch.scheduleType === 'date' ? `Fecha: ${sch.specificDate}` : `Días: ${sch.weekdays.map((d) => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')}`}
                    {' · '}{sch.startDate} → {sch.endDate}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => void handleStart(r)}><Play className="h-3.5 w-3.5" /> Iniciar entrenamiento</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RoutineEditorModal open={createOpen} routine={editing} onClose={() => { setCreateOpen(false); setEditing(null) }} onSaved={() => { setCreateOpen(false); setEditing(null); void reload() }} />
      <ScheduleModal open={Boolean(scheduleOpen)} routine={scheduleOpen} onClose={() => setScheduleOpen(null)} onSaved={() => { setScheduleOpen(null); void reload() }} />
      <ConfirmDialog open={Boolean(deleting)} title="Eliminar rutina" message={`¿Eliminar «${deleting?.name}»?`} confirmLabel="Eliminar" danger onConfirm={() => void handleDelete()} onClose={() => setDeleting(null)} />
    </div>
  )
}

function RoutineEditorModal({ open, routine, onClose, onSaved }: { open: boolean; routine: Routine | null; onClose: () => void; onSaved: () => void }) {
  const { notify } = useApp()
  const { data: exercisesData } = useExercises()
  const exercises = exercisesData ?? []
  const [name, setName] = useState(routine?.name ?? '')
  const [description, setDescription] = useState(routine?.description ?? '')
  const [muscleGroup, setMuscleGroup] = useState(routine?.muscleGroup ?? '')
  const [items, setItems] = useState<RoutineItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(routine?.name ?? '')
    setDescription(routine?.description ?? '')
    setMuscleGroup(routine?.muscleGroup ?? '')
    setItems([])
    if (routine) {
      fetchRoutineExercises(routine.id).then(async (res) => {
        const mapped = await Promise.all(res.map(async (re) => {
          const ex = exercises.find((e) => e.id === re.exerciseId) ?? { id: re.exerciseId ?? '', name: re.exerciseName, muscleGroup: re.muscleGroup as any, createdAt: '', updatedAt: '' }
          const rsets = await fetchRoutineSets(re.id)
          const sets = rsets.length > 0
            ? rsets.map((rs) => ({ id: rs.id, setNumber: rs.setNumber, weightKg: rs.weightKg ? String(rs.weightKg) : '', reps: rs.reps !== undefined && rs.reps !== null ? String(rs.reps) : '', rir: rs.rir !== undefined ? String(rs.rir) : '', isWarmup: rs.isWarmup, completed: false }))
            : Array.from({ length: re.setsCount || 3 }, (_, i) => ({ id: newId(), setNumber: i + 1, weightKg: re.weightKg ? String(re.weightKg) : '', reps: re.repsTarget ? String(re.repsTarget) : '', rir: '', isWarmup: false, completed: false }))
          return { exercise: ex as Exercise, sets, restSeconds: re.restSeconds ? String(re.restSeconds) : '', notes: re.notes ?? '' }
        }))
        setItems(mapped)
      }).catch(() => notify('No se pudieron cargar los ejercicios', 'error'))
    }
  }, [open, routine])

  const handleAddExercise = (ex: Exercise) => {
    if (items.some((i) => i.exercise.id === ex.id)) { notify('Ya está en la rutina', 'error'); return }
    setItems([...items, { exercise: ex, sets: [{ id: newId(), setNumber: 1, weightKg: '', reps: '', rir: '', isWarmup: false, completed: false }], restSeconds: '', notes: '' }])
    setPickerOpen(false)
  }

  const handleSave = async () => {
    if (!name.trim()) { notify('Introduce un nombre para la rutina', 'error'); return }
    // Validaciones
    const errors: string[] = []
    if (items.length === 0) errors.push('Añade al menos un ejercicio para poder guardar esta rutina')
    items.forEach((it) => {
      if (it.sets.length === 0) errors.push(`${it.exercise.name} necesita al menos una serie`)
      it.sets.forEach((st, si) => {
        const w = st.weightKg.trim()
        const r = st.reps.toString().trim()
        if (w === '') errors.push(`Completa el peso de la serie ${si + 1} de ${it.exercise.name}`)
        else if (!Number.isFinite(Number(w.replace(',', '.'))) || Number(w.replace(',', '.')) < 0) errors.push(`Peso inválido en serie ${si + 1} de ${it.exercise.name}`)
        if (r === '') errors.push(`Introduce las repeticiones de la serie ${si + 1} de ${it.exercise.name}`)
        else {
          const rn = Number(r)
          if (!Number.isFinite(rn) || rn < 1 || !Number.isInteger(rn)) errors.push(`Repeticiones inválidas en serie ${si + 1} de ${it.exercise.name}`)
        }
        if (st.rir.trim() !== '') {
          const rirn = Number(st.rir.replace(',', '.'))
          if (!Number.isFinite(rirn) || rirn < 0 || rirn > 10) errors.push(`RIR inválido en serie ${si + 1} de ${it.exercise.name}`)
        }
      })
    })
    if (errors.length > 0) {
      errors.forEach((e) => notify(e, 'error'))
      return
    }
    setSaving(true)
    try {
      const r: Routine = { id: routine?.id ?? newId(), userId: '', name: name.trim(), description: description.trim() || undefined, muscleGroup: muscleGroup || undefined, createdAt: routine?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() }
      await saveRoutine(r)
      if (routine) {
        const old = await fetchRoutineExercises(routine.id)
        for (const o of old) {
          await deleteRoutineSetsByExercise(o.id)
          await deleteRoutineExercise(o.id)
        }
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const reId = newId()
        await saveRoutineExercise({ id: reId, routineId: r.id, userId: '', exerciseId: it.exercise.id, exerciseName: it.exercise.name, muscleGroup: it.exercise.muscleGroup, order: i, setsCount: it.sets.length, repsTarget: it.sets[0]?.reps ? Number(it.sets[0].reps) : 10, weightKg: it.sets[0]?.weightKg ? Number(it.sets[0].weightKg) : undefined, restSeconds: it.restSeconds ? Number(it.restSeconds) : undefined, notes: it.notes || undefined, createdAt: new Date().toISOString() })
        for (let j = 0; j < it.sets.length; j++) {
          const st = it.sets[j]
          await saveRoutineSet({ id: st.id, routineExerciseId: reId, routineId: r.id, userId: '', setNumber: j + 1, weightKg: st.weightKg ? Number(st.weightKg) : undefined, reps: st.reps ? Number(st.reps) : undefined, rir: st.rir ? Number(st.rir) : undefined, isWarmup: st.isWarmup, restSeconds: it.restSeconds ? Number(it.restSeconds) : undefined, createdAt: new Date().toISOString() })
        }
      }
      onSaved()
      notify('Rutina guardada')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={routine ? 'Editar rutina' : 'Crear rutina'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea className="input resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Grupo muscular / tipo</label>
          <input className="input" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} placeholder="Ej. Glúteos" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-fg">Ejercicios</p>
          {items.map((it, idx) => {
            const setsAsWorkoutSets: WorkoutSet[] = it.sets.map((st, si) => ({
              id: st.id,
              workoutId: 'routine',
              workoutExerciseId: 'routine',
              setNumber: si + 1,
              weightKg: st.weightKg ? Number(st.weightKg) : 0,
              reps: st.reps ? Number(st.reps) : 0,
              rir: st.rir ? Number(st.rir) : undefined,
              isWarmup: st.isWarmup,
              completed: st.completed,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
            const updateSetLocal = (setIndex: number, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'isWarmup' | 'completed'>>) => {
              const n = [...items]
              const sets = [...it.sets]
              sets[setIndex] = {
                ...sets[setIndex],
                weightKg: patch.weightKg !== undefined ? String(patch.weightKg) : sets[setIndex].weightKg,
                reps: patch.reps !== undefined ? String(patch.reps) : sets[setIndex].reps,
                rir: patch.rir !== undefined ? (patch.rir === undefined ? '' : String(patch.rir)) : sets[setIndex].rir,
                isWarmup: patch.isWarmup !== undefined ? patch.isWarmup : sets[setIndex].isWarmup,
                completed: patch.completed !== undefined ? patch.completed : sets[setIndex].completed,
              }
              n[idx] = { ...it, sets }
              setItems(n)
            }
            const deleteSetLocal = (setIndex: number) => {
              const n = [...items]
              let sets = it.sets.filter((_, i) => i !== setIndex)
              if (sets.length === 0) sets = [{ id: newId(), setNumber: 1, weightKg: '', reps: '', rir: '', isWarmup: false, completed: false }]
              sets = sets.map((s, i) => ({ ...s, setNumber: i + 1 }))
              n[idx] = { ...it, sets }
              setItems(n)
            }
            const addSetLocal = () => {
              const n = [...items]
              const last = it.sets[it.sets.length - 1]
              n[idx] = { ...it, sets: [...it.sets, { id: newId(), setNumber: it.sets.length + 1, weightKg: last?.weightKg ?? '', reps: last?.reps ?? '', rir: last?.rir ?? '', isWarmup: false, completed: false }] }
              setItems(n)
            }
            return (
              <div key={it.exercise.id} className="card overflow-hidden">
                <div className="flex items-start gap-2.5 border-b border-line px-3.5 py-3">
                  <ExercisePhoto imagePath={it.exercise.imageUrl} alt={it.exercise.name} size="picker" />
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-raised font-display text-sm font-semibold text-muted">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-fg">{it.exercise.name}</h3>
                      <span className="chip">{it.exercise.muscleGroup}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="btn-icon h-8 w-8 shrink-0 hover:text-rose-400" aria-label={`Quitar ${it.exercise.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-2.5">
                  <div className="grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_44px_28px] gap-1.5 px-1 pb-1.5 text-center text-[9px] uppercase tracking-wide text-faint">
                    <span>Serie</span>
                    <span>kg</span>
                    <span>Reps</span>
                    <span>RIR</span>
                    <span />
                  </div>
                  <div className="space-y-1">
                    {setsAsWorkoutSets.map((set, si) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        exerciseName={it.exercise.name}
                        showCompleted={false}
                        onUpdate={(patch) => updateSetLocal(si, patch)}
                        onDelete={() => deleteSetLocal(si)}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <Button size="sm" variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={addSetLocal}>
                      <Plus className="h-3.5 w-3.5" /> Añadir serie
                    </Button>
                    <span className="text-[10px] tabular text-faint">{it.sets.length} series</span>
                  </div>
                </div>
              </div>
            )
          })}
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}><Plus className="h-3.5 w-3.5" /> Añadir ejercicio</Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} loading={saving}>Guardar rutina</Button>
        </div>
      </div>
      <ExercisePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={handleAddExercise} onRequestCreate={() => {}} existingExerciseIds={items.map((i) => i.exercise.id)} />
    </Modal>
  )
}

function ScheduleModal({ open, routine, onClose, onSaved }: { open: boolean; routine: Routine | null; onClose: () => void; onSaved: () => void }) {
  const { notify } = useApp()
  const [type, setType] = useState<'date' | 'weekly'>('date')
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().slice(0, 10))
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [months, setMonths] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setType('date'); setSpecificDate(new Date().toISOString().slice(0, 10)); setWeekdays([]); setMonths(1)
  }, [open])

  const handleSave = async () => {
    if (!routine) return
    setSaving(true)
    try {
      const start = type === 'date' ? specificDate : new Date().toISOString().slice(0, 10)
      const end = addMonths(start, months)
      const sch: RoutineSchedule = { id: newId(), userId: '', routineId: routine.id, scheduleType: type, specificDate: type === 'date' ? specificDate : undefined, weekdays, startDate: start, endDate: end, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      await saveRoutineSchedule(sch)
      onSaved()
      notify('Programación guardada')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo programar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <Modal open={open} onClose={onClose} title="Programar rutina" size="md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setType('date')} className={`chip transition ${type === 'date' ? 'border-lime-500/50 text-accent' : ''}`}>Fecha concreta</button>
          <button onClick={() => setType('weekly')} className={`chip transition ${type === 'weekly' ? 'border-lime-500/50 text-accent' : ''}`}>Repetición semanal</button>
        </div>
        {type === 'date' ? (
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="label">Días de la semana</label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((d, i) => (
                <button key={i} type="button" onClick={() => setWeekdays(weekdays.includes(i) ? weekdays.filter((x) => x !== i) : [...weekdays, i])} className={`chip transition ${weekdays.includes(i) ? 'border-lime-500/50 text-accent' : ''}`}>{d}</button>
              ))}
            </div>
            <div className="mt-3">
              <label className="label">Duración (meses)</label>
              <select className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[1,2,3,4,5,6,9,12].map((m) => <option key={m} value={m}>{m} mes{m>1?'es':''}</option>)}
              </select>
            </div>
            <p className="text-[10px] text-faint">Inicio: {new Date().toISOString().slice(0,10)} · Fin: {addMonths(new Date().toISOString().slice(0,10), months)}</p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} loading={saving}>Programar</Button>
        </div>
      </div>
    </Modal>
  )
}
