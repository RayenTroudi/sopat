'use client'

import { useState } from 'react'
import type { WizardDraft } from '../EventWizard'

const TEAMS = [
  { value: 'rse', label: 'RSE' },
  { value: 'rh_communication', label: 'RH & Communication' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'communication_marketing', label: 'Communication' },
  { value: 'direction', label: 'Direction' },
]

type Task = {
  taskDescription: string
  deadline: string
  assignedTeam: string
  status: string
  notes: string
}

const emptyTask = (): Task => ({
  taskDescription: '',
  deadline: '',
  assignedTeam: '',
  status: 'a_faire',
  notes: '',
})

export function Step4Retroplanning({
  draft,
  onBack,
  onNext,
}: {
  draft: WizardDraft
  onBack: () => void
  onNext: (data: Partial<WizardDraft>) => void
}) {
  const [tasks, setTasks] = useState<Task[]>(
    (draft.retroplanning ?? []) as Task[]
  )

  function updateTask(idx: number, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  function removeTask(idx: number) {
    setTasks((prev) => prev.filter((_, i) => i !== idx))
  }

  const fieldStyle = {
    background: 'var(--admin-bg)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
        Étape 4 — Rétro-planning
      </h2>

      {tasks.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Aucune tâche. Cliquez sur &quot;+ Ajouter une tâche&quot; pour commencer.
        </p>
      )}

      {tasks.map((task, idx) => (
        <div
          key={idx}
          className="rounded-lg border p-3 space-y-3"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Tâche {idx + 1}</span>
            <button
              onClick={() => removeTask(idx)}
              className="text-xs"
              style={{ color: 'var(--admin-red)' }}
            >
              Supprimer
            </button>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Description *</label>
            <input
              value={task.taskDescription}
              onChange={(e) => updateTask(idx, { taskDescription: e.target.value })}
              className="w-full px-2 py-1.5 rounded border text-sm"
              style={fieldStyle}
              placeholder="Ex: Réserver le matériel"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Échéance</label>
              <input
                type="date"
                value={task.deadline}
                onChange={(e) => updateTask(idx, { deadline: e.target.value })}
                className="w-full px-2 py-1.5 rounded border text-sm"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Équipe responsable</label>
              <select
                value={task.assignedTeam}
                onChange={(e) => updateTask(idx, { assignedTeam: e.target.value })}
                className="w-full px-2 py-1.5 rounded border text-sm"
                style={fieldStyle}
              >
                <option value="">Aucune</option>
                {TEAMS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => setTasks((prev) => [...prev, emptyTask()])}
        className="w-full py-2 rounded-lg border text-sm font-medium border-dashed"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
      >
        + Ajouter une tâche
      </button>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext({ retroplanning: tasks })}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
