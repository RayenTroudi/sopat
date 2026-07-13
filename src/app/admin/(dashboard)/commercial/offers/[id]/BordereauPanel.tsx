'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addOfferLineItem, deleteOfferLineItem } from '@/lib/actions/commercial'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

type LineRow = {
  id: string
  designation: string
  unit: string
  quantity: string
  unitPrice: string
  total: string
}

export default function BordereauPanel({
  offerId,
  currency,
  lines,
}: {
  offerId: string
  currency: string
  lines: LineRow[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grandTotal = lines.reduce((s, l) => s + Number(l.total), 0)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const res = await addOfferLineItem({
      offerId,
      designation: fd.get('designation') as string,
      unit: (fd.get('unit') as string) || 'U',
      quantity: fd.get('quantity') as string,
      unitPrice: fd.get('unitPrice') as string,
    })
    if (res.success) {
      form.reset()
      router.refresh()
    } else {
      setError(res.error ?? 'Erreur')
    }
    setLoading(false)
  }

  async function handleDelete(lineId: string) {
    setLoading(true)
    await deleteOfferLineItem(lineId, offerId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Bordereau des prix (FOR-CO-02)
        </h2>
        <p className="text-[13px] font-bold" style={{ color: 'var(--admin-text)' }}>
          Total : {grandTotal.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} {currency}
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-3 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            {['#', 'Désignation', 'Unité', 'Qté', 'P.U.', 'Total', ''].map((h) => (
              <th key={h} className="text-left px-4 py-2 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{i + 1}</td>
              <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--admin-text)' }}>{l.designation}</td>
              <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{l.unit}</td>
              <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--admin-text)' }}>{Number(l.quantity).toLocaleString('fr-FR')}</td>
              <td className="px-4 py-2 text-[13px]" style={{ color: 'var(--admin-text)' }}>{Number(l.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</td>
              <td className="px-4 py-2 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{Number(l.total).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => handleDelete(l.id)}
                  disabled={loading}
                  className="text-xs disabled:opacity-30"
                  style={{ color: 'var(--admin-red)' }}
                  aria-label="Supprimer la ligne"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                Aucune ligne — ajoutez les postes du bordereau ci-dessous.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={handleAdd} className="p-4 grid grid-cols-[1fr_70px_80px_100px_auto] gap-2" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <input name="designation" required placeholder="Désignation" className={inputClass} style={inputStyle} />
        <input name="unit" placeholder="Unité" defaultValue="U" className={inputClass} style={inputStyle} />
        <input name="quantity" type="number" step="0.01" min="0.01" required placeholder="Qté" className={inputClass} style={inputStyle} />
        <input name="unitPrice" type="number" step="0.001" min="0" required placeholder="P.U." className={inputClass} style={inputStyle} />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          Ajouter
        </button>
      </form>
    </div>
  )
}
