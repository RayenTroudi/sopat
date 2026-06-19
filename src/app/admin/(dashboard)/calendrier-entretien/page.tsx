'use client'

import { useEffect, useState } from 'react'

interface VisitEntry {
  id: string
  visitDate: string
  visitType: string | null
  projectId: string
  projectName: string | null
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  taille: 'Taille',
  arrosage: 'Arrosage',
  traitement_phytosanitaire: 'Traitement',
  fertilisation: 'Fertilisation',
  controle_general: 'Contrôle',
  other: 'Autre',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendrierEntretienPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [visits, setVisits] = useState<VisitEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch('/api/projects/maintenance-visits-all')
      if (res.ok) {
        setVisits(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const visitsByDay: Record<number, VisitEntry[]> = {}
  for (const v of visits) {
    const d = new Date(v.visitDate)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!visitsByDay[day]) visitsByDay[day] = []
      visitsByDay[day].push(v)
    }
  }

  const monthLabel = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          Calendrier d'entretien
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="px-3 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            ‹
          </button>
          <span className="text-sm font-medium capitalize" style={{ color: 'var(--admin-text)', minWidth: 160, textAlign: 'center' }}>
            {monthLabel}
          </span>
          <button
            onClick={next}
            className="px-3 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-r border-b" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayVisits = visitsByDay[day] ?? []
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
              return (
                <div
                  key={day}
                  className="min-h-[80px] border-r border-b p-1"
                  style={{
                    borderColor: 'var(--admin-border)',
                    background: isToday ? 'var(--admin-emerald-dim)' : 'var(--admin-surface)',
                  }}
                >
                  <div className="text-xs font-medium mb-1" style={{ color: isToday ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayVisits.slice(0, 3).map(v => (
                      <div
                        key={v.id}
                        className="text-xs px-1 py-0.5 rounded truncate"
                        style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                        title={`${v.projectName ?? v.projectId} — ${VISIT_TYPE_LABELS[v.visitType ?? ''] ?? v.visitType}`}
                      >
                        {v.projectName ?? v.projectId}
                      </div>
                    ))}
                    {dayVisits.length > 3 && (
                      <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        +{dayVisits.length - 3} autre{dayVisits.length - 3 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
