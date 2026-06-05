'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ScheduledVisitRow } from '@/lib/db/entretien'

const VISIT_TYPE_LABELS: Record<string, string> = {
  taille:                    'Taille',
  arrosage:                  'Arrosage',
  traitement_phytosanitaire: 'Traitement',
  fertilisation:             'Fertilisation',
  controle_general:          'Contrôle',
  other:                     'Autre',
}
const VISIT_TYPE_COLORS: Record<string, string> = {
  taille:                    '#16A34A',
  arrosage:                  '#2563EB',
  traitement_phytosanitaire: '#D97706',
  fertilisation:             '#7C3AED',
  controle_general:          '#0891B2',
  other:                     '#6B7280',
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

type Props = {
  visits:       ScheduledVisitRow[]
  onPlanVisit:  () => void
  onVisitClick: (visit: ScheduledVisitRow) => void
}

export function CalendarView({ visits, onPlanVisit, onVisitClick }: Props) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // Build calendar grid
  const firstDay  = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Index visits by day
  const visitsByDay: Record<number, ScheduledVisitRow[]> = {}
  for (const v of visits) {
    const d = new Date(v.visitDate)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!visitsByDay[day]) visitsByDay[day] = []
      visitsByDay[day].push(v)
    }
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg border hover:bg-[var(--admin-bg)]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          ‹
        </button>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          {MONTHS_FR[month]} {year}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg border hover:bg-[var(--admin-bg)]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--admin-text-muted)' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const dayVisits = day ? (visitsByDay[day] ?? []) : []

          return (
            <div
              key={i}
              className={cn(
                'min-h-[60px] rounded-lg p-1 border',
                day ? 'hover:bg-[var(--admin-bg)]' : 'opacity-0 pointer-events-none'
              )}
              style={{
                borderColor: isToday ? 'var(--admin-emerald)' : 'var(--admin-border)',
                background:  isToday ? 'var(--admin-emerald-dim)' : 'transparent',
              }}
            >
              {day && (
                <>
                  <div className={cn('text-xs font-medium mb-1', isToday ? 'font-bold' : '')} style={{ color: isToday ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayVisits.slice(0, 2).map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onVisitClick(v)}
                        className="w-full text-left text-xs px-1 py-0.5 rounded truncate"
                        style={{
                          backgroundColor: VISIT_TYPE_COLORS[v.visitType] + '22',
                          color:           VISIT_TYPE_COLORS[v.visitType],
                        }}
                      >
                        {VISIT_TYPE_LABELS[v.visitType] ?? v.visitType}
                        {v.hasReport && ' ✓'}
                      </button>
                    ))}
                    {dayVisits.length > 2 && (
                      <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        +{dayVisits.length - 2}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {Object.entries(VISIT_TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: VISIT_TYPE_COLORS[key] }} />
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Plan visit CTA */}
      <button
        onClick={onPlanVisit}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed text-sm transition-colors hover:border-[var(--admin-emerald)] hover:text-[var(--admin-emerald)]"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
      >
        <span className="text-base leading-none">+</span>
        Planifier une visite
      </button>
    </div>
  )
}
