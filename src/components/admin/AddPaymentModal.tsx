'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, selectCls, SubmitBtn } from './ui'

export default function AddPaymentModal({
  invoiceId,
  totalAmount,
  onClose,
  onSuccess,
}: {
  invoiceId: string
  totalAmount: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ date: '', amount: String(totalAmount.toFixed(3)), method: 'WireTransfer' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.date) errs.date = 'Requis'
    if (!form.amount || isNaN(Number(form.amount))) errs.amount = 'Requis'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/payments`, {
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
    <Modal title="Enregistrer un paiement" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date" error={errors.date}>
          <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="Montant (TND)" error={errors.amount}>
          <input type="number" step="0.001" min="0" className={inputCls}
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </Field>
        <Field label="Méthode">
          <select className={selectCls} value={form.method} onChange={e => set('method', e.target.value)}>
            <option value="WireTransfer">Virement bancaire</option>
            <option value="Cash">Espèces</option>
            <option value="Cheque">Chèque</option>
          </select>
        </Field>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} label="Enregistrer le paiement" />
      </form>
    </Modal>
  )
}
