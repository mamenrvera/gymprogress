import { ChevronDown, ChevronUp, Clock, Plus, Trash2 } from 'lucide-react'
import type { Food, FoodEntry, MealBlock, MealType } from '../../types'
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
  desayuno: '\u{1F305}',
  almuerzo: '\u{1F957}',
  comida: '\u{1F37D}\uFE0F',
  merienda: '\u{1F34E}',
  cena: '\u{1F319}',
  snack: '\u{1F36A}',
}

interface Props {
  block: MealBlock
  entries: FoodEntry[]
  foods?: Food[]
  collapsed?: boolean
  onToggle: () => void
  onAdd: () => void
  onEditEntry: (entry: FoodEntry) => void
  onDeleteEntry: (entry: FoodEntry) => void
  onDeleteBlock: () => void
}

export function MealBlockCard({ block, entries, foods, collapsed, onToggle, onAdd, onEditEntry, onDeleteEntry, onDeleteBlock }: Props) {
  const totals = sumEntries(entries)
  const foodMap = new Map((foods ?? []).map((f) => [f.id, f]))
  const resolveNS = (e: FoodEntry) => e.nutriScore ?? (e.foodId ? foodMap.get(e.foodId)?.nutriScore : undefined)
  const label = block.title || MEAL_LABELS[block.mealType]
  const time = new Date(block.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const mealScore = entries.length > 0
    ? scoreMeal(entries.map((e) => ({ foodName: e.foodName, grams: e.grams, per100: e.per100, foodScore: scoreFood({ per100: e.per100, nutriScore: e.nutriScore, novaGroup: e.novaGroup }).score })))
    : null

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
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-fg">{label}</h3>
            <p className="shrink-0 text-xs font-semibold tabular text-fg">
              {formatKcal(totals.calories)} <span className="font-normal text-faint">kcal</span>
            </p>
            {mealScore ? (
              <span className="chip shrink-0">{mealScore.score.toFixed(1)}/10</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[10px] tabular text-faint">
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
                    <div className="flex items-center gap-1.5 min-w-0">
                      {(() => {
                        const ns = resolveNS(entry)
                        const nsColor = ns === 'A' ? '#038141' : ns === 'B' ? '#85BB2F' : ns === 'C' ? '#FECB02' : ns === 'D' ? '#EE8100' : ns === 'E' ? '#E63E11' : null
                        return (
                          <div className="flex shrink-0 items-center gap-1">
                            {ns && nsColor ? (
                              <span
                                className="rounded px-1.5 py-0.5 text-[9px] font-bold leading-none text-white"
                                style={{ backgroundColor: nsColor }}
                                title="Nutri-Score oficial"
                              >
                                {ns}
                              </span>
                            ) : (
                              <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-[9px] font-bold leading-none text-faint" title="Nutri-Score oficial no disponible">
                                NS: Sin datos
                              </span>
                            )}
                            {entry.novaGroup && (
                              <span className="rounded border border-line bg-raised px-1 py-0.5 text-[9px] font-bold leading-none text-faint">
                                N{entry.novaGroup}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      <p className="truncate text-[13px] font-medium text-fg">
                        {entry.foodName}
                        {entry.brand ? <span className="font-normal text-faint"> · {entry.brand}</span> : null}
                      </p>
                    </div>
                      <p className="mt-0.5 truncate text-[10px] tabular text-faint">
                        {formatGrams(entry.grams)} g · P {formatGrams(entry.protein)} · C {formatGrams(entry.carbs)} · G {formatGrams(entry.fat)}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1 min-w-0">
                      {(() => {
                        const p = entry.protein ?? 0
                        const f = entry.fat ?? 0
                        const c = entry.carbs ?? 0
                        const tot = p + f + c
                        const pPct = tot > 0 ? (p / tot) * 100 : 0
                        const fPct = tot > 0 ? (f / tot) * 100 : 0
                        const cPct = tot > 0 ? (c / tot) * 100 : 0
                        return tot > 0 ? (
                          <>
                            <div className="h-1.5 w-20 max-w-full overflow-hidden rounded-full bg-line flex sm:w-24">
                              <div className="h-full" style={{ width: `${pPct}%`, backgroundColor: '#38bdf8' }} />
                              <div className="h-full" style={{ width: `${fPct}%`, backgroundColor: '#fbbf24' }} />
                              <div className="h-full" style={{ width: `${cPct}%`, backgroundColor: '#c084fc' }} />
                            </div>
                            <p className="text-[9px] tabular text-faint leading-none">
                              P {formatGrams(p)} · G {formatGrams(f)} · HC {formatGrams(c)} g
                            </p>
                          </>
                        ) : null
                      })()}
                    </div>
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

          {mealScore ? (
            <div className="border-t border-line px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-fg">Calidad de la comida · {mealScore.score.toFixed(1)}/10</p>
                <span className="chip">{dailyScoreLabel(mealScore.score)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-surface/0"
                  style={{ width: `${(mealScore.score / 10) * 100}%`, boxShadow: 'inset -2px 0 0 0 rgba(0,0,0,0.4)' }}
                />
              </div>
              <div className="relative h-1 -mt-3">
                <div
                  className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface bg-fg"
                  style={{ left: `${(mealScore.score / 10) * 100}%` }}
                />
              </div>
              {mealScore.provisional && (
                <p className="text-[10px] text-amber-400">Puntuación provisional: faltan datos.</p>
              )}
            </div>
          ) : entries.length > 0 ? null : (
            <div className="border-t border-line px-4 py-2.5">
              <p className="text-[10px] text-faint">Añade alimentos para ver la puntuación de la comida.</p>
            </div>
          )}

          {entries.length > 0 && (() => {
            const totalMacroG = totals.protein + totals.fat + totals.carbs
            const pPct = totalMacroG > 0 ? (totals.protein / totalMacroG) * 100 : 0
            const fPct = totalMacroG > 0 ? (totals.fat / totalMacroG) * 100 : 0
            const cPct = totalMacroG > 0 ? (totals.carbs / totalMacroG) * 100 : 0
            return (
              <div className="border-t border-line px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold text-faint uppercase tracking-wide">Macros de esta comida</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-line flex">
                  <div className="h-full transition-[width] duration-500" style={{ width: `${pPct}%`, backgroundColor: '#38bdf8' }} />
                  <div className="h-full transition-[width] duration-500" style={{ width: `${fPct}%`, backgroundColor: '#fbbf24' }} />
                  <div className="h-full transition-[width] duration-500" style={{ width: `${cPct}%`, backgroundColor: '#c084fc' }} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: '#38bdf8' }} />
                    <span className="text-faint">Proteínas</span>
                    <span className="font-medium tabular text-fg">{formatGrams(totals.protein)} g</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
                    <span className="text-faint">Grasas</span>
                    <span className="font-medium tabular text-fg">{formatGrams(totals.fat)} g</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: '#c084fc' }} />
                    <span className="text-faint">Carbohidratos</span>
                    <span className="font-medium tabular text-fg">{formatGrams(totals.carbs)} g</span>
                  </span>
                </div>
              </div>
            )
          })()}

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
