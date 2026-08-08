'use client'

// Modification d'une extra dépense depuis le registre.
// Réutilise l'action serveur updateExtraExpense, qui revalide la consommation
// budgétaire du projet quand la dépense est déjà approuvée.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { updateExtraExpense } from '@/lib/actions/achat'

export default function ExpenseEditDialog({
  expenseId,
  reference,
  status,
  expenseDate,
  category,
  description,
  amount,
  currency,
}: {
  expenseId: string
  reference: string
  status: 'pending' | 'approved' | 'rejected'
  expenseDate: string
  category: string | null
  description: string
  amount: string
  currency: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(expenseDate.slice(0, 10))
  const [cat, setCat] = useState(category ?? '')
  const [desc, setDesc] = useState(description)
  const [amt, setAmt] = useState(amount)

  function close() {
    setOpen(false)
    setError(null)
    // Repartir des valeurs enregistrées si le formulaire est réouvert.
    setDate(expenseDate.slice(0, 10))
    setCat(category ?? '')
    setDesc(description)
    setAmt(amount)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateExtraExpense(expenseId, {
        expenseDate: date,
        category: cat.trim() || undefined,
        description: desc,
        amount: amt,
      })
      if (!res.success) {
        setError(res.error ?? 'Échec de l’enregistrement')
        return
      }
      router.refresh()
      setOpen(false)
    })
  }

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm'
  const inputStyle = {
    borderColor: 'var(--admin-border)',
    background: 'var(--admin-bg)',
    color: 'var(--admin-text)',
  }
  const labelCls = 'text-[11px] font-medium uppercase tracking-wide'
  const labelStyle = { color: 'var(--admin-text-muted)' }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border p-1.5 transition-colors hover:bg-[var(--admin-bg)]"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        title="Modifier la dépense"
        aria-label={`Modifier la dépense ${reference}`}
      >
        <Pencil style={{ width: 13, height: 13 }} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Modifier la dépense ${reference}`}
        >
          <div
            className="w-full max-w-lg rounded-xl border p-5"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                Modifier {reference}
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded px-2 py-1 text-sm transition-colors hover:bg-[var(--admin-bg)]"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                ✕ Fermer
              </button>
            </div>

            {status === 'approved' && (
              <p
                className="mb-4 rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: 'var(--admin-amber)',
                  background: 'var(--admin-amber-dim)',
                  color: 'var(--admin-amber)',
                }}
              >
                Dépense déjà approuvée : changer le montant modifie la consommation
                budgétaire du projet et peut déclencher une alerte.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Montant ({currency})</label>
                <input
                  inputMode="decimal"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} style={labelStyle}>Description</label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} style={labelStyle}>Catégorie</label>
                <input
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--green)', color: 'var(--ivory)' }}
              >
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-[var(--admin-bg)]"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
