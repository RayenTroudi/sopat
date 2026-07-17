'use client'

// Onglet « Achats » de la fiche projet.
// - Barre de consommation budgétaire (BC + dépenses approuvées / budget approuvé).
// - Liste des dépenses extra du projet ; pour celles scannées via l'app mobile,
//   affichage de la photo du justificatif + données extraites (OCR) éditables
//   et enregistrables.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateExtraExpense } from '@/lib/actions/achat'

const FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

type OcrSuggested = {
  amount?: string
  expenseDate?: string
  description?: string
  confidence?: number
} | null

export type AchatExpense = {
  id: string
  reference: string
  expenseDate: string
  category: string | null
  description: string
  amount: string
  currency: string
  status: 'pending' | 'approved' | 'rejected'
  source: string
  ocrRawText: string | null
  ocrSuggested: OcrSuggested
  receiptImageUrl: string | null
  creatorName: string | null
}

type Budget = {
  approvedBudget: number | null
  poTotal: number
  expensesTotal: number
  spent: number
  percentSpent: number | null
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  approved: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  rejected: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
}

export function AchatsTab({
  expenses,
  budget,
  currency,
  canEdit,
}: {
  expenses: AchatExpense[]
  budget: Budget
  currency: string
  canEdit: boolean
}) {
  return (
    <div className="space-y-5">
      <BudgetUsageCard budget={budget} currency={currency} />

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Dépenses du projet ({expenses.length})
          </h3>
        </div>

        {expenses.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune dépense enregistrée pour ce projet.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {expenses.map((e) => (
              <li key={e.id} style={{ borderColor: 'var(--admin-border)' }}>
                <ExpenseRow expense={e} canEdit={canEdit} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BudgetUsageCard({ budget, currency }: { budget: Budget; currency: string }) {
  const { approvedBudget, poTotal, expensesTotal, spent, percentSpent } = budget

  if (approvedBudget === null) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Pas de budget approuvé pour ce projet — la consommation ne peut pas être calculée.
        </p>
      </div>
    )
  }

  const pct = percentSpent ?? 0
  const ratio = Math.min(pct / 100, 1)
  const color = pct >= 100 ? 'var(--admin-red)' : pct >= 90 ? 'var(--admin-amber)' : 'var(--admin-emerald)'

  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
            Budget consommé
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-0.5" style={{ color: 'var(--admin-text)' }}>
            {FMT.format(Math.round(spent))} / {FMT.format(Math.round(approvedBudget))} {currency}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</p>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, background: color }} />
      </div>

      <div className="flex gap-4 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <span>Bons de commande : <strong style={{ color: 'var(--admin-text)' }}>{FMT.format(Math.round(poTotal))} {currency}</strong></span>
        <span>Dépenses approuvées : <strong style={{ color: 'var(--admin-text)' }}>{FMT.format(Math.round(expensesTotal))} {currency}</strong></span>
      </div>
    </div>
  )
}

function ExpenseRow({ expense, canEdit }: { expense: AchatExpense; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const isMobile = expense.source === 'mobile_ocr'

  return (
    <div className="p-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail (mobile OCR only) */}
        {isMobile && expense.receiptImageUrl && (
          <button
            type="button"
            onClick={() => setShowImage(true)}
            className="shrink-0 rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--admin-border)' }}
            title="Agrandir la photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={expense.receiptImageUrl} alt={`Justificatif ${expense.reference}`} className="h-16 w-16 object-cover" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
            >
              {expense.reference}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[expense.status]}`}>
              {STATUS_LABEL[expense.status]}
            </span>
            {isMobile && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}>
                📱 Scan mobile
              </span>
            )}
          </div>

          <p className="text-sm font-medium mt-1.5 truncate" style={{ color: 'var(--admin-text)' }}>
            {expense.description}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {new Date(expense.expenseDate).toLocaleDateString('fr-FR')}
            {expense.category ? ` · ${expense.category}` : ''}
            {expense.creatorName ? ` · ${expense.creatorName}` : ''}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {Number(expense.amount).toLocaleString('fr-FR')} {expense.currency}
          </p>
          {canEdit && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors hover:bg-[var(--admin-bg)]"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
            >
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* Extracted OCR data (read-only display when not editing) */}
      {isMobile && !editing && (expense.ocrSuggested || expense.ocrRawText) && (
        <ExtractedDataSummary ocrSuggested={expense.ocrSuggested} ocrRawText={expense.ocrRawText} />
      )}

      {/* Edit form */}
      {editing && (
        <ExpenseEditForm expense={expense} onDone={() => setEditing(false)} />
      )}

      {/* Full image modal */}
      {showImage && expense.receiptImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowImage(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expense.receiptImageUrl}
            alt={`Justificatif ${expense.reference}`}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(ev) => ev.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function ExtractedDataSummary({ ocrSuggested, ocrRawText }: { ocrSuggested: OcrSuggested; ocrRawText: string | null }) {
  const [showRaw, setShowRaw] = useState(false)
  return (
    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
      <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
        Données extraites de la photo (OCR)
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--admin-text)' }}>
        <span>Montant : <strong>{ocrSuggested?.amount ?? '—'}</strong></span>
        <span>Date : <strong>{ocrSuggested?.expenseDate ?? '—'}</strong></span>
        <span>Libellé : <strong>{ocrSuggested?.description ?? '—'}</strong></span>
      </div>
      {ocrRawText && (
        <>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="mt-2 text-[11px] hover:underline"
            style={{ color: 'var(--admin-accent)' }}
          >
            {showRaw ? 'Masquer' : 'Afficher'} le texte OCR brut
          </button>
          {showRaw && (
            <pre
              className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border p-2 text-[11px]"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
            >
              {ocrRawText}
            </pre>
          )}
        </>
      )}
    </div>
  )
}

function ExpenseEditForm({ expense, onDone }: { expense: AchatExpense; onDone: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [expenseDate, setExpenseDate] = useState(expense.expenseDate.slice(0, 10))
  const [category, setCategory] = useState(expense.category ?? '')
  const [description, setDescription] = useState(expense.description)
  const [amount, setAmount] = useState(expense.amount)

  // Données extraites éditables (mobile OCR)
  const isMobile = expense.source === 'mobile_ocr'
  const [ocrAmount, setOcrAmount] = useState(expense.ocrSuggested?.amount ?? '')
  const [ocrDate, setOcrDate] = useState(expense.ocrSuggested?.expenseDate ?? '')
  const [ocrDescription, setOcrDescription] = useState(expense.ocrSuggested?.description ?? '')

  function save() {
    setError(null)
    startTransition(async () => {
      const ocrSuggested = isMobile
        ? {
            ...(ocrAmount ? { amount: ocrAmount } : {}),
            ...(ocrDate ? { expenseDate: ocrDate } : {}),
            ...(ocrDescription ? { description: ocrDescription } : {}),
            ...(expense.ocrSuggested?.confidence !== undefined
              ? { confidence: expense.ocrSuggested.confidence }
              : {}),
          }
        : undefined
      const res = await updateExtraExpense(expense.id, {
        expenseDate,
        category: category || undefined,
        description,
        amount,
        ocrSuggested,
      })
      if (!res.success) {
        setError(res.error ?? 'Échec de l’enregistrement')
        return
      }
      router.refresh()
      onDone()
    })
  }

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm'
  const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }
  const labelCls = 'text-[11px] font-medium uppercase tracking-wide'
  const labelStyle = { color: 'var(--admin-text-muted)' }

  return (
    <div className="mt-3 rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--admin-accent)', background: 'var(--admin-bg)' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} style={labelStyle}>Date</label>
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Montant ({expense.currency})</label>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} style={labelStyle}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} style={labelStyle}>Catégorie</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} style={inputStyle} placeholder="Optionnel" />
        </div>
      </div>

      {isMobile && (
        <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
          <p className={labelCls} style={labelStyle}>Données extraites de la photo (OCR)</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[11px]" style={labelStyle}>Montant OCR</label>
              <input value={ocrAmount} onChange={(e) => setOcrAmount(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-[11px]" style={labelStyle}>Date OCR</label>
              <input value={ocrDate} onChange={(e) => setOcrDate(e.target.value)} className={inputCls} style={inputStyle} placeholder="AAAA-MM-JJ" />
            </div>
            <div>
              <label className="text-[11px]" style={labelStyle}>Libellé OCR</label>
              <input value={ocrDescription} onChange={(e) => setOcrDescription(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-[var(--admin-surface)]"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
