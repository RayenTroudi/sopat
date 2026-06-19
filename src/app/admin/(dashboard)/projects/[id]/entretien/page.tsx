'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const FREQUENCY_OPTIONS = [
  { value: 'journaliere', label: 'Journalière' },
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'quinzaine', label: 'Par quinzaine' },
] as const

type FrequencyType = 'journaliere' | 'hebdomadaire' | 'quinzaine'

interface ContractData {
  visitFrequency?: string | null
  visitFrequencyType?: FrequencyType | null
  monthlyCost?: string | null
  notes?: string | null
  contractStartDate?: string | null
  contractEndDate?: string | null
}

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition'
const inputStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

export default function EntretienPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [frequencyType, setFrequencyType] = useState<FrequencyType | ''>('')
  const [monthlyCost, setMonthlyCost] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/maintenance-contract`)
        if (res.ok) {
          const data: ContractData = await res.json()
          setContract(data)
          setFrequencyType(data?.visitFrequencyType ?? '')
          setMonthlyCost(data?.monthlyCost ?? '')
          setNotes(data?.notes ?? '')
          setStartDate(data?.contractStartDate ? new Date(data.contractStartDate).toISOString().split('T')[0] : '')
          setEndDate(data?.contractEndDate ? new Date(data.contractEndDate).toISOString().split('T')[0] : '')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = {
      visitFrequencyType: frequencyType || undefined,
      monthlyCost: monthlyCost || undefined,
      notes: notes || undefined,
    }
    if (startDate) body.contractStartDate = new Date(startDate).toISOString()
    if (endDate) body.contractEndDate = new Date(endDate).toISOString()

    const res = await fetch(`/api/projects/${projectId}/maintenance-contract`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la sauvegarde')
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        Chargement…
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Contrat d'entretien</h2>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              Fréquence des visites
            </label>
            <select
              value={frequencyType}
              onChange={e => setFrequencyType(e.target.value as FrequencyType | '')}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">-- Sélectionner --</option>
              {FREQUENCY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              Coût mensuel (TND)
            </label>
            <input
              type="number"
              min={0}
              step="0.001"
              value={monthlyCost}
              onChange={e => setMonthlyCost(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="0.000"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="Remarques sur le contrat d'entretien..."
            />
          </div>
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50"
            style={{ background: 'var(--admin-emerald)', color: '#fff' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {saved && <span className="text-sm" style={{ color: 'var(--admin-emerald)' }}>Enregistré ✓</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}
