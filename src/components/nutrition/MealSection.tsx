import type { ComponentType } from 'react'
import { Apple, Coffee, Cookie, Moon, Plus, UtensilsCrossed } from 'lucide-react'
import type { FoodEntry, MealType } from '../../types'
import { sumEntries } from '../../lib/calculations'
import { formatGrams, formatKcal } from '../../lib/format'
import { cn } from '../../lib/cn'

const MEAL_ICONS: Record<MealType, ComponentType<{ className?: string }>> = {
  desayuno: Coffee,
  almuerzo: Apple,
  comida: UtensilsCrossed,
  merienda: Cookie,
  cena: Moon,
  snack: Cookie,
}

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
  snack: 'Snacks',
}

interface MealSectionProps {
  meal: MealType
  entries: FoodEntry[]
  onAdd: () => void
  onEdit: (entry: FoodEntry) => void
}

export function MealSection({ meal, entries, onAdd, onEdit }: MealSectionProps) {
  const Icon = MEAL_ICONS[meal]
  const totals = sumEntries(entries)
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">{MEAL_LABELS[meal]}</h3>
            <p className="shrink-0 text-xs font-semibold tabular text-fg">
              {formatKcal(totals.calories)} <span className="font-normal text-faint">kcal</span>
            </p>
          </div>
          <p className="mt-0.5 text-[10px] tabular text-faint">
            {entries.length === 0
              ? 'Sin alimentos'
              : `P ${formatGrams(totals.protein)} · C ${formatGrams(totals.carbs)} · G ${formatGrams(totals.fat)} g`}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-muted transition hover:border-lime-500/40 hover:text-accent"
          aria-label={`Añadir alimento a ${MEAL_LABELS[meal].toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {entries.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-[11px] text-faint transition hover:bg-raised/60 hover:text-muted"
        >
          <Plus className="h-3 w-3" /> Añadir {MEAL_LABELS[meal].toLowerCase()}
        </button>
      ) : (
        <ul className="divide-y divide-line/70">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-raised/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">
                    {entry.foodName}
                    {entry.brand ? <span className="font-normal text-faint"> · {entry.brand}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[10px] tabular text-faint">
                    {formatGrams(entry.grams)} g · P {formatGrams(entry.protein)} · C {formatGrams(entry.carbs)} · G{' '}
                    {formatGrams(entry.fat)}
                  </p>
                </div>
                <span className={cn('shrink-0 text-xs font-semibold tabular text-fg', 'group-hover:text-accent')}>
                  {formatKcal(entry.caloriesDeclared)} <span className="font-normal text-faint">kcal</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
