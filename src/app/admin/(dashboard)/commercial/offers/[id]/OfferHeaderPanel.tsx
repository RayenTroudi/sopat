'use client'

/**
 * L'en-tête commercial d'une offre, modifiable sur place.
 *
 * Ces huit champs s'affichaient en lecture seule : la seule façon de corriger
 * un client ou une date d'envoi était de recréer l'offre. Ils sont maintenant
 * éditables, avec trois réserves qui ne sont pas des détails d'interface.
 *
 * ── 1. « Montant HTVA » est DÉRIVÉ dès qu'un bordereau existe ───────────────
 *
 * `commercial_offers.amount` est la somme HTVA des lignes du bordereau, écrite
 * par `syncOfferTotals` à chaque modification. Le rendre saisissable quand des
 * lignes existent produirait un montant que la prochaine correction de prix
 * écraserait sans prévenir, et qui contredirait le document tant qu'il survit.
 * Il n'est donc saisissable que sur une offre SANS bordereau — le cas d'un
 * devis simple, chiffré d'un seul chiffre.
 *
 * ── 2. L'engagement suit le verrou du bordereau ─────────────────────────────
 *
 * Client, intitulé, type, description, montant, devise, date d'envoi et
 * validité sont ce que le client s'est vu promettre. Tant que le bordereau est
 * approuvé — ou en revue — ils sont figés comme lui, et se rouvrent par le même
 * acte tracé.
 *
 * ── 3. Responsable et notes restent modifiables ─────────────────────────────
 *
 * Ce sont des données d'administration interne : elles ne font pas partie de ce
 * qui a été promis, et les geler empêcherait d'annoter une affaire en cours
 * sans rouvrir un engagement commercial pour rien.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { updateOffer } from '@/lib/actions/commercial'

const inputClass =
  'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
} as const

const muted = { color: 'var(--admin-text-muted)' } as const
const text = { color: 'var(--admin-text)' } as const

export type OfferHeaderValues = {
  clientId: string | null
  clientName: string | null
  clientCompany: string | null
  projectType: string | null
  description: string | null
  amount: string | null
  currency: string
  sentDate: string | null
  validityDate: string | null
  responsible: string | null
  notes: string | null
}

type Draft = {
  clientId: string
  clientName: string
  projectType: string
  description: string
  amount: string
  sentDate: string
  validityDate: string
  responsible: string
  notes: string
}

/** `date` Postgres → `YYYY-MM-DD` pour un `<input type="date">`. */
function isoDay(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function draftFrom(v: OfferHeaderValues): Draft {
  return {
    clientId: v.clientId ?? '',
    clientName: v.clientName ?? '',
    projectType: v.projectType ?? '',
    description: v.description ?? '',
    amount: v.amount ?? '',
    sentDate: isoDay(v.sentDate),
    validityDate: isoDay(v.validityDate),
    responsible: v.responsible ?? '',
    notes: v.notes ?? '',
  }
}

function formatDay(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
}

export default function OfferHeaderPanel({
  offerId,
  values,
  clients,
  canEdit,
  locked,
  lockReason,
  /** Le bordereau porte-t-il des lignes ? Si oui, le montant est calculé. */
  amountIsDerived,
}: {
  offerId: string
  values: OfferHeaderValues
  clients: { id: string; label: string }[]
  canEdit: boolean
  locked: boolean
  lockReason: string | null
  amountIsDerived: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(values))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  function open() {
    setDraft(draftFrom(values))
    setError(null)
    setEditing(true)
  }

  async function save() {
    setBusy(true)
    setError(null)

    // Un montant saisi doit être un nombre : une chaîne libre finirait en
    // `numeric` invalide côté base, ou pire en 0 silencieux.
    let amount: string | undefined
    if (!amountIsDerived && !locked) {
      const raw = draft.amount.trim().replace(',', '.')
      if (raw === '') {
        amount = ''
      } else {
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) {
          setBusy(false)
          setError('Montant HTVA invalide')
          return
        }
        amount = String(n)
      }
    }

    const commitment = locked
      ? {}
      : {
          clientId: draft.clientId || null,
          clientName: draft.clientName.trim(),
          projectType: draft.projectType.trim(),
          description: draft.description.trim(),
          sentDate: draft.sentDate,
          validityDate: draft.validityDate,
          ...(amount !== undefined ? { amount } : {}),
        }

    const res = await updateOffer(offerId, {
      ...commitment,
      responsible: draft.responsible.trim(),
      notes: draft.notes.trim(),
    })
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Enregistrement refusé')
      return
    }
    setEditing(false)
    router.refresh()
  }

  const clientLabel = values.clientCompany ?? values.clientName ?? null

  if (!editing) {
    const rows: { label: string; value: string; hint?: string }[] = [
      { label: 'Client', value: clientLabel || '—' },
      { label: 'Type de projet', value: values.projectType || '—' },
      { label: 'Description', value: values.description || '—' },
      {
        label: 'Montant HTVA',
        value: values.amount != null
          ? `${Number(values.amount).toLocaleString('fr-FR')} ${values.currency}`
          : '—',
        hint: amountIsDerived ? 'calculé depuis le bordereau' : undefined,
      },
      { label: "Date d'envoi", value: formatDay(values.sentDate) },
      { label: 'Validité', value: formatDay(values.validityDate) },
      { label: 'Responsable', value: values.responsible || '—' },
      { label: 'Notes', value: values.notes || '—' },
    ]

    return (
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-[14px] font-semibold" style={text}>Informations commerciales</h2>
          {canEdit && (
            <button
              onClick={open}
              className="px-3 py-1.5 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden />
              Modifier
            </button>
          )}
        </div>
        <dl className="space-y-3">
          {rows.map(({ label, value, hint }) => (
            <div key={label} className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={muted}>{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap" style={text}>
                {value}
                {hint && <span className="ml-2 text-[11px]" style={muted}>({hint})</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <h2 className="text-[14px] font-semibold" style={text}>Informations commerciales</h2>

      {locked && (
        <p
          className="px-3 py-2 rounded-lg text-[12px]"
          style={{ background: 'var(--admin-bg)', color: 'var(--admin-amber)' }}
        >
          {lockReason ?? 'Bordereau verrouillé.'} Client, montant, dates et description
          restent figés ; seuls le responsable et les notes sont modifiables.
        </p>
      )}

      {error && (
        <p
          className="px-3 py-2 rounded-lg text-[12px]"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Client (registre)</span>
          <select
            value={draft.clientId}
            onChange={(e) => set('clientId', e.target.value)}
            disabled={locked}
            className={`${inputClass} disabled:opacity-50`}
            style={inputStyle}
          >
            <option value="">— non référencé —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>
            Client (nom libre)
          </span>
          <input
            value={draft.clientName}
            onChange={(e) => set('clientName', e.target.value)}
            disabled={locked}
            placeholder="Si le client n'est pas au registre"
            className={`${inputClass} disabled:opacity-50`}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Type de projet</span>
          <input
            value={draft.projectType}
            onChange={(e) => set('projectType', e.target.value)}
            disabled={locked}
            className={`${inputClass} disabled:opacity-50`}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>
            Montant HTVA ({values.currency})
          </span>
          <input
            value={amountIsDerived ? (values.amount ?? '') : draft.amount}
            onChange={(e) => set('amount', e.target.value)}
            disabled={locked || amountIsDerived}
            inputMode="decimal"
            className={`${inputClass} disabled:opacity-50`}
            style={inputStyle}
          />
          {amountIsDerived && (
            <span className="block text-[11px] mt-1" style={muted}>
              Calculé depuis le bordereau — corrigez les lignes pour le faire évoluer.
            </span>
          )}
        </label>

        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Date d&apos;envoi</span>
          <input
            type="date"
            value={draft.sentDate}
            onChange={(e) => set('sentDate', e.target.value)}
            disabled={locked}
            className={`${inputClass} disabled:opacity-50`}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Validité</span>
          <input
            type="date"
            value={draft.validityDate}
            onChange={(e) => set('validityDate', e.target.value)}
            disabled={locked}
            className={`${inputClass} disabled:opacity-50`}
            style={inputStyle}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Description</span>
          <textarea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            disabled={locked}
            rows={3}
            className={`${inputClass} resize-y disabled:opacity-50`}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Responsable</span>
          <input
            value={draft.responsible}
            onChange={(e) => set('responsible', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-[12px] font-medium mb-1" style={muted}>Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={() => { setEditing(false); setError(null) }}
          disabled={busy}
          className="px-4 py-2 rounded-lg border text-[13px] disabled:opacity-40"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
