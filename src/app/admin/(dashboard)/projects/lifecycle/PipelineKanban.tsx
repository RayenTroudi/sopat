'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { tnd } from '@/lib/fmt'
import { STAGES } from '@/lib/stages'

type ProjectCard = {
  id: string
  name: string
  clientName: string
  contractValue: number
  margin: number
  daysInStage: number
  stage: number
  stageNotes: string | null
}

type Column = {
  stageNum: number
  name: string
  description: string
  color: string
  projects: ProjectCard[]
  totalValue: number
}

function MarginBadge({ margin }: { margin: number }) {
  const color = margin > 20 ? 'var(--admin-emerald)' : margin >= 5 ? 'var(--admin-amber)' : 'var(--admin-red)'
  const bg = margin > 20 ? 'var(--admin-emerald-dim)' : margin >= 5 ? 'var(--admin-amber-dim)' : 'var(--admin-red-dim)'
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{ color, background: bg, fontFamily: 'var(--font-sans)' }}>
      {margin.toFixed(1)}%
    </span>
  )
}

function ConfirmModal({
  project,
  targetStage,
  onClose,
  onConfirm,
}: {
  project: ProjectCard
  targetStage: number
  onClose: () => void
  onConfirm: (notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const fromName = STAGES[project.stage]?.name ?? `Étape ${project.stage}`
  const toName = STAGES[targetStage]?.name ?? `Étape ${targetStage}`
  const toColor = STAGES[targetStage]?.color ?? 'var(--admin-accent)'

  async function handleConfirm() {
    setLoading(true)
    await onConfirm(notes)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="relative rounded-xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <h3 className="text-base font-semibold mb-4"
          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
          Déplacer vers {toName} ?
        </h3>

        <div className="flex flex-col items-center gap-2 mb-5 py-4 rounded-lg"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
            {fromName}
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: 'var(--admin-text-dim)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: toColor, fontFamily: 'var(--font-sans)' }}>
            {toName}
          </span>
        </div>

        <label className="block mb-1 text-xs font-medium"
          style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Note (optionnel)
        </label>
        <input
          className="admin-input w-full mb-5"
          placeholder="Ajouter une note…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          autoFocus
        />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: toColor, color: '#fff', fontFamily: 'var(--font-sans)' }}>
            {loading ? 'En cours…' : 'Confirmer →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PipelineKanban({ columns: initialColumns }: { columns: Column[] }) {
  const router = useRouter()
  const [columns, setColumns] = useState(initialColumns)
  const [pending, setPending] = useState<{ project: ProjectCard; targetStage: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<number | null>(null)
  const draggingRef = useRef<ProjectCard | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function applyMove(project: ProjectCard, targetStage: number, notes: string) {
    setPending(null)

    // Optimistic update
    setColumns(prev => prev.map(col => {
      if (col.stageNum === project.stage) {
        return { ...col, projects: col.projects.filter(p => p.id !== project.id) }
      }
      if (col.stageNum === targetStage) {
        return { ...col, projects: [{ ...project, stage: targetStage, daysInStage: 0 }, ...col.projects] }
      }
      return col
    }))

    showToast(`Déplacé vers ${STAGES[targetStage]?.name} ✓`)

    const res = await fetch(`/api/admin/projects/${project.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: targetStage, notes: notes || undefined }),
    })

    if (!res.ok) router.refresh()
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, project: ProjectCard) {
    draggingRef.current = project
    e.dataTransfer.effectAllowed = 'move'
    // Ghost image handled by browser; we just dim the card via CSS class
    ;(e.currentTarget as HTMLElement).style.opacity = '0.45'
  }

  function onDragEnd(e: React.DragEvent) {
    ;(e.currentTarget as HTMLElement).style.opacity = '1'
    draggingRef.current = null
    setDragOverStage(null)
  }

  function onDragOver(e: React.DragEvent, stageNum: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageNum)
  }

  function onDragLeave() {
    setDragOverStage(null)
  }

  function onDrop(e: React.DragEvent, targetStage: number) {
    e.preventDefault()
    setDragOverStage(null)
    const project = draggingRef.current
    if (!project || project.stage === targetStage) return
    // Open confirm modal — same flow as the button
    setPending({ project, targetStage })
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4 items-start">
        {columns.map(col => {
          const isOver = dragOverStage === col.stageNum
          return (
            <div
              key={col.stageNum}
              className="rounded-xl overflow-hidden transition-all duration-150"
              style={{
                background: 'var(--admin-card)',
                borderTop: `1px solid ${isOver ? col.color : 'var(--admin-border)'}`,
                borderRight: `1px solid ${isOver ? col.color : 'var(--admin-border)'}`,
                borderBottom: `1px solid ${isOver ? col.color : 'var(--admin-border)'}`,
                borderLeft: `3px solid ${col.color}`,
                boxShadow: isOver ? `0 0 0 2px ${col.color}40` : 'none',
              }}
              onDragOver={e => onDragOver(e, col.stageNum)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, col.stageNum)}
            >
              {/* Column header */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: col.color, fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                    {col.stageNum}. {col.name}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: col.color + '20', color: col.color, fontFamily: 'var(--font-sans)' }}>
                    {col.projects.length}
                  </span>
                </div>
                <p className="text-xs leading-relaxed"
                  style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                  {col.description}
                </p>
                <p className="text-xs mt-1.5 font-medium tabular-nums"
                  style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {tnd(col.totalValue)}
                </p>
              </div>

              {/* Drop zone hint */}
              {isOver && draggingRef.current && draggingRef.current.stage !== col.stageNum && (
                <div className="mx-3 mt-3 rounded-lg border-2 border-dashed py-3 text-center text-xs font-medium"
                  style={{ borderColor: col.color, color: col.color, fontFamily: 'var(--font-sans)' }}>
                  Déposer ici
                </div>
              )}

              {/* Cards */}
              <div className="p-3 space-y-3">
                {col.projects.length === 0 && !isOver && (
                  <div className="py-8 text-center text-xs"
                    style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                    Aucun projet
                  </div>
                )}

                {col.projects.map(p => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={e => onDragStart(e, p)}
                    onDragEnd={onDragEnd}
                    className="rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing"
                    style={{
                      background: 'var(--admin-surface)',
                      border: '1px solid var(--admin-border)',
                      userSelect: 'none',
                    }}
                  >
                    {/* Drag handle hint */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="font-semibold text-sm hover:underline"
                          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}
                          onClick={e => e.stopPropagation()}
                          draggable={false}
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                          {p.clientName}
                        </p>
                      </div>
                      {/* Drag grip icon */}
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
                        style={{ color: 'var(--admin-text-dim)' }}>
                        <circle cx="9" cy="6" r="1.5" fill="currentColor" />
                        <circle cx="15" cy="6" r="1.5" fill="currentColor" />
                        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="9" cy="18" r="1.5" fill="currentColor" />
                        <circle cx="15" cy="18" r="1.5" fill="currentColor" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium tabular-nums"
                        style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                        {tnd(p.contractValue)}
                      </span>
                      <MarginBadge margin={p.margin} />
                    </div>

                    <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                      depuis {p.daysInStage} jour{p.daysInStage !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {pending && (
        <ConfirmModal
          project={pending.project}
          targetStage={pending.targetStage}
          onClose={() => setPending(null)}
          onConfirm={notes => applyMove(pending.project, pending.targetStage, notes)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff', fontFamily: 'var(--font-sans)' }}>
          {toast}
        </div>
      )}
    </>
  )
}
