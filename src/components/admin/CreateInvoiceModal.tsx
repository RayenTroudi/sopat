'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, selectCls, SubmitBtn } from './ui'

export default function CreateInvoiceModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    date: '', amount: '', currency: 'TND', vatRate: '0.19', status: 'Draft', dueDate: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const vatAmount = form.amount && form.vatRate
    ? (Number(form.amount) * Number(form.vatRate)).toFixed(3)
    : null
  const totalAmount = form.amount && vatAmount
    ? (Number(form.amount) + Number(vatAmount)).toFixed(3)
    : null

  function validate() {
    const e: Record<string, string> = {}
    if (!form.date) e.date = 'Requis'
    if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Montant valide requis'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), vatRate: Number(form.vatRate) }),
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
    <Modal title="Créer une facture" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date" error={errors.date}>
          <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant HT" error={errors.amount}>
            <input type="number" step="0.001" min="0" className={inputCls}
              value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.000" />
          </Field>
          <Field label="Devise">
            <select className={selectCls} value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option>TND</option>
              <option>EUR</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Taux TVA">
            <select className={selectCls} value={form.vatRate} onChange={e => set('vatRate', e.target.value)}>
              <option value="0.19">19%</option>
              <option value="0.13">13%</option>
              <option value="0.07">7%</option>
              <option value="0">Exonéré</option>
            </select>
          </Field>
          <Field label="Statut">
            <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="Draft">Brouillon</option>
              <option value="Issued">Émise</option>
            </select>
          </Field>
        </div>
        {totalAmount && (
          <div className="bg-green/5 border border-green/20 rounded-lg px-4 py-2.5 text-sm font-sans text-green space-y-0.5">
            <div>TVA : <strong>{vatAmount} {form.currency}</strong></div>
            <div>Total TTC : <strong>{totalAmount} {form.currency}</strong></div>
          </div>
        )}
        <Field label="Date d'échéance">
          <input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </Field>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} label="Créer la facture" />
      </form>
    </Modal>
  )
}
