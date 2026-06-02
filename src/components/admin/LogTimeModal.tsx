'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, SubmitBtn } from './ui'

export default function LogTimeModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    employeeId: '', date: '', hours: '', hourlyRate: '', description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const computed = form.hours && form.hourlyRate
    ? (Number(form.hours) * Number(form.hourlyRate)).toFixed(3)
    : null

  function validate() {
    const e: Record<string, string> = {}
    if (!form.employeeId.trim()) e.employeeId = 'Requis'
    if (!form.date) e.date = 'Requis'
    if (!form.hours || isNaN(Number(form.hours))) e.hours = 'Requis'
    if (!form.hourlyRate || isNaN(Number(form.hourlyRate))) e.hourlyRate = 'Requis'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hours: Number(form.hours), hourlyRate: Number(form.hourlyRate) }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onSuccess(); onClose()
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Saisie de temps" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Employé (ID ou nom)" error={errors.employeeId}>
          <input className={inputCls} value={form.employeeId} onChange={e => set('employeeId', e.target.value)} placeholder="ID employé" />
        </Field>
        <Field label="Date" error={errors.date}>
          <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Heures" error={errors.hours}>
            <input type="number" step="0.5" min="0" className={inputCls}
              value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="8" />
          </Field>
          <Field label="Taux horaire (TND)" error={errors.hourlyRate}>
            <input type="number" step="0.001" min="0" className={inputCls}
              value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} placeholder="35.000" />
          </Field>
        </div>
        {computed && (
          <div className="bg-green/5 border border-green/20 rounded-lg px-4 py-2.5 text-sm font-sans text-green">
            Montant calculé : <strong>{computed} TND</strong>
          </div>
        )}
        <Field label="Description (optionnel)">
          <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Plantation phase 1" />
        </Field>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} label="Enregistrer le temps" />
      </form>
    </Modal>
  )
}
