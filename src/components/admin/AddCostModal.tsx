'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, selectCls, SubmitBtn } from './ui'

export default function AddCostModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    date: '', description: '', amount: '', category: 'Labor', currency: 'TND', glAccount: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.date) e.date = 'Requis'
    if (!form.description.trim()) e.description = 'Requis'
    if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Montant valide requis'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
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
    <Modal title="Ajouter un coût" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date" error={errors.date}>
          <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Description" error={errors.description}>
          <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Fourniture de plantes…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie">
            <select className={selectCls} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="Labor">Main-d'œuvre</option>
              <option value="Materials">Matériaux</option>
              <option value="Equipment">Équipement</option>
              <option value="Subcontractors">Sous-traitants</option>
            </select>
          </Field>
          <Field label="Devise">
            <select className={selectCls} value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option>TND</option>
              <option>EUR</option>
              <option>USD</option>
            </select>
          </Field>
        </div>
        <Field label="Montant" error={errors.amount}>
          <input type="number" step="0.001" min="0" className={inputCls}
            value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.000" />
        </Field>
        <Field label="Compte GL (optionnel)">
          <input className={inputCls} value={form.glAccount} onChange={e => set('glAccount', e.target.value)} placeholder="6100" />
        </Field>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} />
      </form>
    </Modal>
  )
}
