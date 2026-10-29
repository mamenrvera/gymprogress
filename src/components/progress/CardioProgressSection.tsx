import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Pie, PieChart, Cell } from 'recharts'
import { HeartPulse } from 'lucide-react'
import { useCardioSessions } from '../../hooks/useSupabaseData'
import { cardioPeriodSummary, cardioByWeek, cardioByActivity, cardioRecords, formatDurationMin, formatPace } from '../../lib/cardioCalculations'
import { addDaysISO, startOfWeekISO, todayISO } from '../../lib/dates'
import { cn } from '../../lib/cn'

const COLORS = ['#84cc16', '#22d3ee', '#f59e0b', '#f43f5e', '#a78bfa', '#34d399', '#fb923c']

export function CardioProgressSection() {
  const { data } = useCardioSessions()
  const sessions = data ?? []
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const today = todayISO()
  const weekStart = startOfWeekISO(today)
  const weekEnd = addDaysISO(weekStart, 6)
  const monthStart = today.slice(0, 7) + '-01'
  const monthEnd = today

  const startISO = period === 'week' ? weekStart : monthStart
  const endISO = period === 'week' ? weekEnd : monthEnd

  const summary = useMemo(() => cardioPeriodSummary(sessions, startISO, endISO), [sessions, startISO, endISO])
  const weekly = useMemo(() => cardioByWeek(sessions, today, 8), [sessions, today])
  const byActivity = useMemo(() => cardioByActivity(sessions, startISO, endISO), [sessions, startISO, endISO])
  const records = useMemo(() => cardioRecords(sessions), [sessions])

  if (sessions.length === 0) {
    return (
      <section className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <HeartPulse className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-fg">Cardio y deportes</h2>
        </div>
        <p className="text-xs text-muted">Aún no hay actividades registradas. Añade cardio o deportes desde la sección de Entrenamiento.</p>
      </section>
    )
  }

  const pieData = byActivity.map((a) => ({ name: a.label, value: a.minutes }))

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-fg">Cardio y deportes</h2>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setPeriod('week')} className={cn('chip', period === 'week' && 'border-lime-500/40 text-accent')}>Semana</button>
          <button onClick={() => setPeriod('month')} className={cn('chip', period === 'month' && 'border-lime-500/40 text-accent')}>Mes</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-line bg-raised/60 p-2.5">
          <p className="text-[9px] uppercase tracking-wide text-faint">Sesiones</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">{summary.sessions}</p>
        </div>
        <div className="rounded-xl border border-line bg-raised/60 p-2.5">
          <p className="text-[9px] uppercase tracking-wide text-faint">Tiempo total</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">{formatDurationMin(summary.totalMin)}</p>
        </div>
        <div className="rounded-xl border border-line bg-raised/60 p-2.5">
          <p className="text-[9px] uppercase tracking-wide text-faint">Distancia</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">{summary.totalDistanceKm > 0 ? `${summary.totalDistanceKm} km` : '—'}</p>
        </div>
        <div className="rounded-xl border border-line bg-raised/60 p-2.5">
          <p className="text-[9px] uppercase tracking-wide text-faint">Días activos</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">{summary.activeDays}</p>
        </div>
      </div>

      {summary.avgPaceMinPerKm && (
        <p className="text-xs text-muted">Ritmo medio: {formatPace(summary.avgPaceMinPerKm)} min/km</p>
      )}

      <div>
        <p className="text-xs font-semibold text-fg mb-2">Tiempo por semana (min)</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip contentStyle={{ background: 'rgb(20,22,28)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="minutes" fill="#84cc16" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {byActivity.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-fg mb-2">Sesiones por actividad</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byActivity} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} width={90} />
                  <Tooltip contentStyle={{ background: 'rgb(20,22,28)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="sessions" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-fg mb-2">Distribución del tiempo</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={{ fontSize: 10 }}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgb(20,22,28)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-fg mb-2">Récords personales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {records.slice(0, 12).map((r, i) => (
              <div key={i} className="rounded-xl border border-line bg-raised/60 p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-faint">{r.activityType} · {r.metric}</p>
                <p className="mt-1 text-sm font-semibold text-fg">{r.value} {r.unit}</p>
                <p className="text-[10px] text-faint">{r.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}