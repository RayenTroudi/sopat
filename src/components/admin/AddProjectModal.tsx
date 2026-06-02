'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, selectCls, SubmitBtn } from './ui'
import { STAGES } from '@/lib/stages'

interface Client { id: string; name: string }

export default function AddProjectModal({
  clients,
  onClose,
  onSuccess,
}: {
  clients: Client[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    clientId: '', name: '', status: 'Active', currency: 'TND', startDate: '', endDate: '', stage: '1',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.clientId) e.clientId = 'Requis'
    if (!form.name.trim()) e.name = 'Requis'
    if (!form.startDate) e.startDate = 'Requis'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, stage: parseInt(form.stage) }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setLoading(false)
    }
  }

  const selectedStage = parseInt(form.stage)

  return (
    <Modal title="Nouveau Projet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Client" error={errors.clientId}>
          <select className={selectCls} value={form.clientId} onChange={e => set('clientId', e.target.value)}>
            <option value="">Sélectionner…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Nom du projet" error={errors.name}>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Jardin Hotel Laico" />
        </Field>
        <Field label="Étape initiale">
          <select className={selectCls} value={form.stage} onChange={e => set('stage', e.target.value)}>
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>{n}. {STAGES[n].name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
            {STAGES[selectedStage]?.description}
          </p>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Statut">
            <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="Active">Actif</option>
              <option value="Pending">En attente</option>
              <option value="Closed">Clôturé</option>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date début" error={errors.startDate}>
            <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </Field>
          <Field label="Date fin">
            <input type="date" className={inputCls} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </Field>
        </div>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} label="Créer le projet" />
      </form>
    </Modal>
  )
}
