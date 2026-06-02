'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, selectCls, SubmitBtn } from './ui'

export default function AddBudgetItemModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [category, setCategory] = useState('Labor')
  const [plannedAmount, setPlannedAmount] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plannedAmount || isNaN(Number(plannedAmount))) {
      setErrors({ plannedAmount: 'Montant valide requis' }); return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, plannedAmount: Number(plannedAmount) }),
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
    <Modal title="Ajouter un poste budget" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Catégorie">
          <select className={selectCls} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="Labor">Main-d'œuvre</option>
            <option value="Materials">Matériaux</option>
            <option value="Equipment">Équipement</option>
            <option value="Subcontractors">Sous-traitants</option>
            <option value="Overhead">Charges indirectes</option>
          </select>
        </Field>
        <Field label="Montant prévu (TND)" error={errors.plannedAmount}>
          <input type="number" step="0.001" min="0" className={inputCls}
            value={plannedAmount} onChange={e => setPlannedAmount(e.target.value)} placeholder="0.000" />
        </Field>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} />
      </form>
    </Modal>
  )
}
