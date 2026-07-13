'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDeliveryNote } from '@/lib/actions/achat'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

type ItemRow = { designation: string; unit: string; quantity: string; observation: string }

const emptyItem = (): ItemRow => ({ designation: '', unit: 'U', quantity: '', observation: '' })

export default function NewDeliveryNoteForm({
  projects,
  suppliers,
}: {
  projects: { id: string; name: string }[]
  suppliers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRow[]>([emptyItem()])

  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const validItems = items
      .filter((it) => it.designation.trim() && it.quantity)
      .map((it) => ({
        designation: it.designation.trim(),
        unit: it.unit || 'U',
        quantity: Number(it.quantity),
        observation: it.observation || undefined,
      }))

    if (!validItems.length) {
      setError('Ajoutez au moins un article avec désignation et quantité.')
      setLoading(false)
      return
    }

    const result = await createDeliveryNote({
      noteType: fd.get('noteType') as 'livraison' | 'retour',
      noteDate: fd.get('noteDate') as string,
      projectId: (fd.get('projectId') as string) || undefined,
      supplierId: (fd.get('supplierId') as string) || undefined,
      counterparty: (fd.get('counterparty') as string) || undefined,
      items: validItems,
      driverName: (fd.get('driverName') as string) || undefined,
      receiverName: (fd.get('receiverName') as string) || undefined,
      observations: (fd.get('observations') as string) || undefined,
    })

    if (result.success && 'id' in result) {
      router.push(`/admin/achat/delivery-notes/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/achat/delivery-notes" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouveau bon de livraison / retour
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        FOR-AC-06 (livraison) / FOR-AC-05 (retour)
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Type *</label>
              <select name="noteType" required defaultValue="livraison" className={inputClass} style={inputStyle}>
                <option value="livraison">Bon de livraison</option>
                <option value="retour">Bon de retour</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Date *</label>
              <input type="date" name="noteDate" required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Projet</label>
              <select name="projectId" defaultValue="" className={inputClass} style={inputStyle}>
                <option value="">— Aucun —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Fournisseur</label>
              <select name="supplierId" defaultValue="" className={inputClass} style={inputStyle}>
                <option value="">— Aucun —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Autre destinataire / expéditeur</label>
              <input type="text" name="counterparty" placeholder="Si hors liste fournisseurs" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Articles</h2>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="text-[12px] font-medium px-2.5 py-1 rounded-lg border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
            >
              + Ligne
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_90px_1fr_auto] gap-2 items-center">
                <input
                  placeholder="Désignation"
                  value={it.designation}
                  onChange={(e) => updateItem(idx, 'designation', e.target.value)}
                  className={inputClass} style={inputStyle}
                />
                <input
                  placeholder="Unité"
                  value={it.unit}
                  onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                  className={inputClass} style={inputStyle}
                />
                <input
                  type="number" step="0.01" min="0" placeholder="Qté"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  className={inputClass} style={inputStyle}
                />
                <input
                  placeholder="Observation"
                  value={it.observation}
                  onChange={(e) => updateItem(idx, 'observation', e.target.value)}
                  className={inputClass} style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}
                  className="px-2 py-1.5 rounded-lg border text-xs disabled:opacity-30"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
                  aria-label="Supprimer la ligne"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Chauffeur / livreur</label>
              <input type="text" name="driverName" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Réceptionné par</label>
              <input type="text" name="receiverName" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Observations</label>
            <textarea name="observations" rows={2} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/achat/delivery-notes"
            className="px-4 py-2 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Création…' : 'Créer le bon'}
          </button>
        </div>
      </form>
    </div>
  )
}
