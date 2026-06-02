'use client'

import { useState } from 'react'
import { Modal, Field, inputCls, selectCls, SubmitBtn } from './ui'

export default function AddClientModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ name: '', type: 'Corporate', email: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Requis' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  return (
    <Modal title="Nouveau Client" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom" error={errors.name}>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nom du client" />
        </Field>
        <Field label="Type">
          <select className={selectCls} value={form.type} onChange={e => set('type', e.target.value)}>
            <option>Corporate</option>
            <option>Hotel</option>
            <option>Government</option>
            <option>Private</option>
          </select>
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@client.tn" />
        </Field>
        <Field label="Téléphone">
          <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+216 XX XXX XXX" />
        </Field>
        {errors.form && <p className="text-red-500 text-xs font-sans">{errors.form}</p>}
        <SubmitBtn loading={loading} label="Créer le client" />
      </form>
    </Modal>
  )
}
