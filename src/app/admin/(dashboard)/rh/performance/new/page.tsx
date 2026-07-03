'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPerformanceEvaluationAction } from '@/lib/actions/rh'
import { ArrowLeft } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }
const textareaClass = 'w-full rounded-lg border px-3 py-2 text-sm resize-none'

type ScoreField = { label: string; key: string }

const CAT1: ScoreField[] = [
  { label: 'Techniques de travail', key: 'workTechniquesScore' },
  { label: 'Assiduité / Ponctualité', key: 'attendanceScore' },
]
const CAT2: ScoreField[] = [
  { label: 'Rigueur & organisation', key: 'rigorScore' },
  { label: 'Discipline', key: 'disciplineScore' },
  { label: 'Esprit d\'amélioration', key: 'improvementScore' },
  { label: 'Respect SMQ', key: 'smqRespectScore' },
  { label: 'Analyse des risques', key: 'riskAnalysisScore' },
]
const CAT3: ScoreField[] = [
  { label: 'Qualité du travail', key: 'qualityScore' },
  { label: 'Communication', key: 'communicationScore' },
  { label: 'Travail en équipe', key: 'teamworkScore' },
  { label: 'Management / encadrement', key: 'managementScore' },
  { label: 'Capacité d\'apprentissage', key: 'learningScore' },
]
const CAT4: ScoreField[] = [
  { label: 'Intégration', key: 'integrationScore' },
]

function ScoreInput({ field, scores, onChange }: { field: ScoreField; scores: Record<string, number>; onChange: (k: string, v: number) => void }) {
  const val = scores[field.key] ?? 0
  const max = 4
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <span className="text-sm" style={{ color: 'var(--admin-fg)' }}>{field.label}</span>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(n => (
          <button key={n} type="button" onClick={() => onChange(field.key, n)}
            className="w-8 h-8 rounded-full text-xs font-bold transition-colors"
            style={{
              background: val >= n ? 'var(--green)' : 'var(--admin-bg)',
              color: val >= n ? 'var(--ivory)' : 'var(--admin-muted)',
              border: '1px solid var(--admin-border)',
            }}>
            {n}
          </button>
        ))}
        <span className="text-xs w-8 text-center" style={{ color: 'var(--admin-muted)' }}>{val}/{max}</span>
      </div>
    </div>
  )
}

export default function NewPerformancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState('')
  const [position, setPosition] = useState('')
  const [evalDate, setEvalDate] = useState('')
  const [seniority, setSeniority] = useState('')
  const [seniorityPos, setSeniorityPos] = useState('')
  const [evalueeNeeds, setEvalueeNeeds] = useState('')
  const [nextObjectives, setNextObjectives] = useState('')
  const [remarks, setRemarks] = useState('')

  const updateScore = (k: string, v: number) => setScores(s => ({ ...s, [k]: v }))

  const allFields = [...CAT1, ...CAT2, ...CAT3, ...CAT4]
  const totalScore = allFields.reduce((s, f) => s + (scores[f.key] ?? 0), 0)
  const maxTotal = allFields.length * 4
  const pct = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data: Record<string, unknown> = {
      userId,
      currentPosition: position,
      evaluationDate: evalDate,
      seniorityCompany: seniority,
      seniorityPosition: seniorityPos,
      globalScore: totalScore,
      globalScorePct: pct,
      evalueeNeeds,
      nextObjectives,
      remarks,
      ...scores,
    }
    const result = await createPerformanceEvaluationAction(data)
    if (result.success) {
      router.push(`/admin/rh/performance/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/performance" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Évaluation de performance</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-03</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>1. Identification</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>ID employé *</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} required className={inputClass} style={inputStyle}
                placeholder="UUID de l'employé" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date d'évaluation *</label>
              <input type="date" value={evalDate} onChange={e => setEvalDate(e.target.value)} required className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Poste actuel</label>
            <input value={position} onChange={e => setPosition(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Ancienneté dans l'entreprise</label>
              <input value={seniority} onChange={e => setSeniority(e.target.value)} className={inputClass} style={inputStyle} placeholder="Ex: 3 ans" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Ancienneté dans le poste</label>
              <input value={seniorityPos} onChange={e => setSeniorityPos(e.target.value)} className={inputClass} style={inputStyle} placeholder="Ex: 1 an" />
            </div>
          </div>
        </div>

        {/* Score global indicator */}
        <div className="rounded-xl border p-4 flex items-center gap-6" style={{ borderColor: 'var(--green)', background: 'var(--admin-surface)' }}>
          <div>
            <div className="text-3xl font-bold" style={{ color: 'var(--green)' }}>{pct.toFixed(1)}%</div>
            <div className="text-xs" style={{ color: 'var(--admin-muted)' }}>Score global: {totalScore}/{maxTotal}</div>
          </div>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--green)' }} />
          </div>
        </div>

        {[
          { title: '2. Compétences techniques', fields: CAT1 },
          { title: '3. Comportement & discipline', fields: CAT2 },
          { title: '4. Qualité & communication', fields: CAT3 },
          { title: '5. Intégration', fields: CAT4 },
        ].map(cat => (
          <div key={cat.title} className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>{cat.title}</h2>
            {cat.fields.map(f => <ScoreInput key={f.key} field={f} scores={scores} onChange={updateScore} />)}
          </div>
        ))}

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>6. Commentaires</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Besoins exprimés par l'évalué</label>
            <textarea value={evalueeNeeds} onChange={e => setEvalueeNeeds(e.target.value)} rows={3} className={textareaClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Objectifs pour la prochaine période</label>
            <textarea value={nextObjectives} onChange={e => setNextObjectives(e.target.value)} rows={3} className={textareaClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Remarques</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} className={textareaClass} style={inputStyle} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Enregistrement...' : 'Enregistrer l\'évaluation'}
          </button>
          <Link href="/admin/rh/performance" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
