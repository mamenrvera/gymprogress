import { ChevronDown, ChevronUp, Clock, Plus, Trash2 } from 'lucide-react'
import type { FoodEntry, MealBlock, MealType } from '../../types'
import { sumEntries } from '../../lib/calculations'
import { formatGrams, formatKcal } from '../../lib/format'
import { scoreFood, scoreMeal, dailyScoreLabel } from '../../lib/nutritionScore'
import { Button } from '../ui/Button'

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
  snack: 'Snacks',
}

const MEAL_ICONS: Record<MealType, string> = {
  desayuno: '☕',
  almuerzo: '🍎',
  comida: '🍽️',
  merienda: '🍪',
  cena: '🌙',
  snack: '🍪',
}

interface Props {
  block: MealBlock
  entries: FoodEntry[]
  collapsed?: boolean
  onToggle: () => void
  onAdd: () => void
  onEditEntry: (entry: FoodEntry) => void
  onDeleteEntry: (entry: FoodEntry) => void
  onDeleteBlock: () => void
  onFinalize: () => void
  finalizing?: boolean
}

export function MealBlockCard({ block, entries, collapsed, onToggle, onAdd, onEditEntry, onDeleteEntry, onDeleteBlock, onFinalize, finalizing }: Props) {
  const totals = sumEntries(entries)
  const label = block.title || MEAL_LABELS[block.mealType]
  const time = new Date(block.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const finalized = !!block.finishedAt && block.qualityScore != null
  const mealScore = finalized ? null : scoreMeal(entries.map((e) => ({ foodName: e.foodName, grams: e.grams, per100: e.per100, foodScore: scoreFood({ per100: e.per100 }).score })))

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-raised/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-accent text-base">
          {MEAL_ICONS[block.mealType]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">{label}</h3>
            <p className="shrink-0 text-xs font-semibold tabular text-fg">
              {formatKcal(totals.calories)} <span className="font-normal text-faint">kcal</span>
            </p>
            {finalized && block.qualityScore != null ? (
              <span className="chip shrink-0">{block.qualityScore.toFixed(1)}/10</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[10px] tabular text-faint">
            <Clock className="inline h-3 w-3 mr-1" />
            {time} · {entries.length === 0 ? 'Sin alimentos' : `P ${formatGrams(totals.protein)} · C ${formatGrams(totals.carbs)} · G ${formatGrams(totals.fat)} g`}
          </p>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-faint" /> : <ChevronUp className="h-4 w-4 text-faint" />}
      </button>

      {!collapsed && (
        <>
          {entries.length === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-[11px] text-faint transition hover:bg-raised/60 hover:text-muted"
            >
              <Plus className="h-3 w-3" /> Añadir alimento
            </button>
          ) : (
            <ul className="divide-y divide-line/70">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div className="group flex w-full items-center gap-3 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onEditEntry(entry)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[13px] font-medium text-fg">
                        {entry.foodName}
                        {entry.brand ? <span className="font-normal text-faint"> · {entry.brand}</span> : null}
                      </p>
                      <p className="mt-0.5 text-[10px] tabular text-faint">
                        {formatGrams(entry.grams)} g · P {formatGrams(entry.protein)} · C {formatGrams(entry.carbs)} · G {formatGrams(entry.fat)}
                      </p>
                    </button>
                    <span className="shrink-0 text-xs font-semibold tabular text-fg">
                      {formatKcal(entry.caloriesDeclared)} <span className="font-normal text-faint">kcal</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry)}
                      className="btn-icon h-7 w-7 shrink-0 hover:text-rose-400"
                      aria-label={`Eliminar ${entry.foodName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {finalized && block.qualityScore != null ? (
            <div className="border-t border-line px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-fg">Finalizada · {block.qualityScore.toFixed(1)}/10</p>
                <span className="chip">{dailyScoreLabel(block.qualityScore)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-surface/0"
                  style={{ width: `${(block.qualityScore / 10) * 100}%`, boxShadow: 'inset -2px 0 0 0 rgba(0,0,0,0.4)' }}
                />
              </div>
              <div className="relative h-1 -mt-3">
                <div
                  className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface bg-fg"
                  style={{ left: `${(block.qualityScore / 10) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="border-t border-line px-4 py-2.5 flex items-center justify-between gap-2">
              <p className="text-[10px] text-faint">
                {entries.length === 0 ? 'Añade alimentos y finaliza la comida.' : `Puntuación estimada: ${mealScore?.score.toFixed(1) ?? '—'}/10`}
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={onFinalize}
                loading={finalizing}
                disabled={entries.length === 0 || finalizing}
              >
                Finalizar comida
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <Button size="sm" variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" /> Añadir alimento
            </Button>
            <button
              type="button"
              onClick={onDeleteBlock}
              className="btn-ghost px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300"
              aria-label="Eliminar comida"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar comida
            </button>
          </div>
        </>
      )}
    </section>
  )
}