'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { upsertEmployeeProfileAction } from '@/lib/actions/rh'
import { ArrowLeft } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }
const textareaClass = 'w-full rounded-lg border px-3 py-2 text-sm resize-none'
const selectClass = 'w-full rounded-lg border px-3 py-2 text-sm'

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userId) { setError('L\'ID utilisateur est requis'); return }
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    const data: Record<string, unknown> = {}
    fd.forEach((v, k) => { if (v && k !== 'userId') data[k] = v })
    if (data.leaveBalanceDays) data.leaveBalanceDays = parseFloat(data.leaveBalanceDays as string)
    if (data.leaveBalancePrevious) data.leaveBalancePrevious = parseFloat(data.leaveBalancePrevious as string)
    if (data.plannedDaysPerYear) data.plannedDaysPerYear = parseInt(data.plannedDaysPerYear as string)
    const result = await upsertEmployeeProfileAction(userId, data)
    if (result.success) {
      router.push('/admin/rh/employees')
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/employees" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Profil employé</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>LIS-RH-02</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>1. Liaison avec l'utilisateur</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>ID utilisateur (UUID) *</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} required
              className={inputClass} style={inputStyle}
              placeholder="L'UUID de l'utilisateur dans la base de données" />
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>2. Identification administrative</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Matricule</label>
              <input name="matricule" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>CIN</label>
              <input name="cin" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Matricule CNSS</label>
              <input name="matriculeCnss" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Situation familiale</label>
              <input name="familySituation" className={inputClass} style={inputStyle} placeholder="Ex: Marié(e), Célibataire..." />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Type de contrat</label>
              <select name="contractType" className={selectClass} style={inputStyle}>
                <option value="">— Sélectionner —</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="civp">CIVP</option>
                <option value="stage">Stage</option>
                <option value="interim">Intérim</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date début contrat</label>
              <input name="contractStartDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date fin contrat</label>
              <input name="contractEndDate" type="date" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>3. Poste & congés</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Intitulé du poste</label>
            <input name="jobTitle" className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Solde congés (jours)</label>
              <input name="leaveBalanceDays" type="number" step="0.5" className={inputClass} style={inputStyle} defaultValue={0} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Report année précédente</label>
              <input name="leaveBalancePrevious" type="number" step="0.5" className={inputClass} style={inputStyle} defaultValue={0} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Jours planifiés/an</label>
              <input name="plannedDaysPerYear" type="number" className={inputClass} style={inputStyle} defaultValue={220} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>4. Notes</h2>
          <textarea name="notes" rows={3} className={textareaClass} style={inputStyle} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Enregistrement...' : 'Enregistrer le profil'}
          </button>
          <Link href="/admin/rh/employees" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
