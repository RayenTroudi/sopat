'use client'

/**
 * FOR-AC-10 — « Suivi d'approvisionnement de chantier ».
 *
 * The source workbook is a 24-column sheet with merged cells standing in for
 * one-to-many relations. That layout is not reproduced here: a planned line is
 * a row, and its arrivals on site and its purchases are revealed underneath it
 * on demand. The variance columns become badges on the line they belong to,
 * because they describe the line, not any single delivery.
 *
 * Every figure shown comes from `@/lib/supply-calc`, the same module the server
 * and the export use, so the three can never disagree.
 */

import { useMemo, useState } from 'react'
import type { SupplyItemRow, SupplyRegisterRow } from '@/lib/db/supply'
import { SupplyImportPanel } from './SupplyImportPanel'
import {
  computeItem,
  computeRegister,
  formatMoney,
  formatPercent,
  formatQuantity,
  varianceTone,
  type SupplyItemTotals,
} from '@/lib/supply-calc'

type SupplierOption = { id: string; name: string }
type PurchaseOrderOption = { id: string; label: string }

type Props = {
  projectId: string
  canEdit: boolean
  suppliers: SupplierOption[]
  /** Bons de commande of this project, to mark a purchase as already counted. */
  purchaseOrders: PurchaseOrderOption[]
  currency: string
  /**
   * Loaded on the server with the rest of the project page. Passing it in
   * rather than fetching on mount means the register is painted with the first
   * frame, and this component needs no effect at all — every later state change
   * comes from a save, whose response is the new register.
   */
  initialRegister: SupplyRegisterRow | null
}

// ─── Draft shapes (edit mode) ────────────────────────────────────────────────

type DraftDelivery = {
  key: string
  deliveryDate: string
  supplierId: string
  supplierLabel: string
  blNumber: string
  quantity: string
}

type DraftPurchase = {
  key: string
  supplierId: string
  supplierLabel: string
  norme: string
  quantity: string
  unitPriceHtva: string
  /** Entered as a percentage in the form; converted to a fraction on save. */
  vatPercent: string
  purchaseOrderId: string
}

type DraftItem = {
  key: string
  designation: string
  norme: string
  plannedQuantity: string
  plannedUnitPriceHtva: string
  /** Empty string = no override, which the API sends as null. */
  actualUnitPriceHtva: string
  observations: string
  deliveries: DraftDelivery[]
  purchases: DraftPurchase[]
}

let keySeq = 0
const nextKey = () => `k${++keySeq}`

/** Parses a form field. An empty or malformed input reads as 0, never NaN. */
function toNum(v: string): number {
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Trims float noise from a percentage round-trip (0.19 * 100 = 19.000000000000004). */
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4
}

/** A VAT percentage typed by the user, as the fraction the API stores. */
function percentToFraction(v: string): number {
  return round4(toNum(v) / 100)
}

function toNumOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function emptyDelivery(): DraftDelivery {
  return { key: nextKey(), deliveryDate: '', supplierId: '', supplierLabel: '', blNumber: '', quantity: '0' }
}

function emptyPurchase(): DraftPurchase {
  return {
    key: nextKey(), supplierId: '', supplierLabel: '', norme: '',
    quantity: '0', unitPriceHtva: '0', vatPercent: '0', purchaseOrderId: '',
  }
}

function emptyItem(): DraftItem {
  return {
    key: nextKey(),
    designation: '',
    norme: '',
    plannedQuantity: '0',
    plannedUnitPriceHtva: '0',
    actualUnitPriceHtva: '',
    observations: '',
    deliveries: [],
    purchases: [],
  }
}

function toDraft(item: SupplyItemRow): DraftItem {
  return {
    key: nextKey(),
    designation: item.designation,
    norme: item.norme ?? '',
    plannedQuantity: String(item.plannedQuantity),
    plannedUnitPriceHtva: String(item.plannedUnitPriceHtva),
    actualUnitPriceHtva: item.actualUnitPriceHtva === null ? '' : String(item.actualUnitPriceHtva),
    observations: item.observations ?? '',
    deliveries: item.deliveries.map((d) => ({
      key: nextKey(),
      deliveryDate: d.deliveryDate ?? '',
      supplierId: d.supplierId ?? '',
      supplierLabel: d.supplierId ? '' : (d.supplierLabel ?? ''),
      blNumber: d.blNumber ?? '',
      quantity: String(d.quantity),
    })),
    purchases: item.purchases.map((p) => ({
      key: nextKey(),
      supplierId: p.supplierId ?? '',
      supplierLabel: p.supplierId ? '' : (p.supplierLabel ?? ''),
      norme: p.norme ?? '',
      quantity: String(p.quantity),
      unitPriceHtva: String(p.unitPriceHtva),
      // Stored as a fraction, edited as a percentage: 0.19 shows as 19.
      vatPercent: String(round4(p.vatRate * 100)),
      purchaseOrderId: p.purchaseOrderId ?? '',
    })),
  }
}

/** Totals for a draft line, so edit mode shows the same figures as read mode. */
function draftTotals(item: DraftItem): SupplyItemTotals {
  return computeItem({
    plannedQuantity: toNum(item.plannedQuantity),
    plannedUnitPriceHtva: toNum(item.plannedUnitPriceHtva),
    actualUnitPriceHtva: toNumOrNull(item.actualUnitPriceHtva),
    deliveries: item.deliveries.map((d) => ({ quantity: toNum(d.quantity) })),
    purchases: item.purchases.map((p) => ({
      quantity: toNum(p.quantity),
      unitPriceHtva: toNum(p.unitPriceHtva),
      vatRate: percentToFraction(p.vatPercent),
    })),
  })
}

// ─── Styling tokens ──────────────────────────────────────────────────────────

const TONE_COLOR: Record<string, string> = {
  neutral: 'var(--admin-text-muted)',
  over: 'var(--admin-amber)',
  under: 'var(--admin-accent)',
}

const card = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-surface)',
} as const

const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
} as const

function Field(props: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
  ariaLabel: string
}) {
  return (
    <input
      type={props.type ?? 'text'}
      value={props.value}
      aria-label={props.ariaLabel}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      className={`w-full rounded-md border px-2 py-1.5 text-[13px] outline-none focus:ring-1 ${props.className ?? ''}`}
      style={inputStyle}
    />
  )
}

function SupplierPicker(props: {
  suppliers: SupplierOption[]
  supplierId: string
  supplierLabel: string
  onChange: (patch: { supplierId?: string; supplierLabel?: string }) => void
}) {
  const FREE = '__free__'
  const mode = props.supplierId ? props.supplierId : props.supplierLabel ? FREE : ''
  return (
    <div className="space-y-1">
      <select
        value={mode}
        aria-label="Fournisseur"
        onChange={(e) => {
          const v = e.target.value
          if (v === FREE) props.onChange({ supplierId: '', supplierLabel: props.supplierLabel || '' })
          else props.onChange({ supplierId: v, supplierLabel: '' })
        }}
        className="w-full rounded-md border px-2 py-1.5 text-[13px] outline-none"
        style={inputStyle}
      >
        <option value="">—</option>
        {props.suppliers.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
        <option value={FREE}>Autre (saisie libre)…</option>
      </select>
      {mode === FREE && (
        <Field
          ariaLabel="Nom du fournisseur"
          value={props.supplierLabel}
          placeholder="Nom du fournisseur"
          onChange={(v) => props.onChange({ supplierLabel: v })}
        />
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SupplySection({
  projectId, canEdit, suppliers, purchaseOrders, currency, initialRegister,
}: Props) {
  const [register, setRegister] = useState<SupplyRegisterRow | null>(initialRegister)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftItem[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Edit mode recomputes from the draft so the indicators move as you type.
  const draftRegisterTotals = useMemo(
    () => computeRegister(draft.map(draftTotals)),
    [draft]
  )
  const totals = editing ? draftRegisterTotals : register?.totals ?? null

  function startEdit() {
    setDraft(register?.items.length ? register.items.map(toDraft) : [emptyItem()])
    setEditing(true)
    setError(null)
  }

  function patchItem(i: number, patch: Partial<DraftItem>) {
    setDraft((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }

  function patchDelivery(i: number, j: number, patch: Partial<DraftDelivery>) {
    setDraft((d) => d.map((row, idx) => idx !== i ? row : {
      ...row,
      deliveries: row.deliveries.map((x, jdx) => (jdx === j ? { ...x, ...patch } : x)),
    }))
  }

  function patchPurchase(i: number, j: number, patch: Partial<DraftPurchase>) {
    setDraft((d) => d.map((row, idx) => idx !== i ? row : {
      ...row,
      purchases: row.purchases.map((x, jdx) => (jdx === j ? { ...x, ...patch } : x)),
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)

    // Lines with no designation are the empty rows an editor leaves behind;
    // dropping them silently is friendlier than a validation error on a row
    // the user never meant to fill.
    const items = draft
      .filter((it) => it.designation.trim() !== '')
      .map((it) => ({
        designation: it.designation.trim(),
        norme: it.norme.trim() || null,
        plannedQuantity: toNum(it.plannedQuantity),
        plannedUnitPriceHtva: toNum(it.plannedUnitPriceHtva),
        actualUnitPriceHtva: toNumOrNull(it.actualUnitPriceHtva),
        observations: it.observations.trim() || null,
        deliveries: it.deliveries.map((d) => ({
          deliveryDate: d.deliveryDate || null,
          supplierId: d.supplierId || null,
          supplierLabel: d.supplierId ? null : (d.supplierLabel.trim() || null),
          blNumber: d.blNumber.trim() || null,
          quantity: toNum(d.quantity),
        })),
        purchases: it.purchases.map((p) => ({
          supplierId: p.supplierId || null,
          supplierLabel: p.supplierId ? null : (p.supplierLabel.trim() || null),
          norme: p.norme.trim() || null,
          quantity: toNum(p.quantity),
          unitPriceHtva: toNum(p.unitPriceHtva),
          vatRate: percentToFraction(p.vatPercent),
          purchaseOrderId: p.purchaseOrderId || null,
        })),
      }))

    try {
      const res = await fetch(`/api/projects/${projectId}/supply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (res.ok) {
        setRegister((await res.json()) as SupplyRegisterRow)
        setEditing(false)
      } else {
        const body = await res.json().catch(() => null)
        setError((body as { error?: string } | null)?.error ?? 'Enregistrement refusé.')
      }
    } catch {
      setError('Enregistrement impossible.')
    }
    setSaving(false)
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Suivi d&apos;approvisionnement de chantier
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-AC-10 — devis validé, livraisons sur site et achats fournisseurs
            {register?.dmsDocumentCode ? ` · ${register.dmsDocumentCode}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {register && register.items.length > 0 && !editing && (
            <a
              href={`/api/projects/${projectId}/supply/export`}
              className="px-3 py-1.5 rounded-lg border text-[13px] font-medium"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
            >
              Exporter
            </a>
          )}
          {canEdit && !editing && (
            <button
              onClick={startEdit}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium"
              style={{ background: 'var(--admin-text)', color: 'var(--admin-surface)' }}
            >
              {register?.items.length ? 'Modifier' : 'Créer le registre'}
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={() => { setEditing(false); setError(null) }}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
                style={{ background: 'var(--admin-text)', color: 'var(--admin-surface)' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          )}
        </div>
      </header>

      {canEdit && !editing && (
        <SupplyImportPanel projectId={projectId} onImported={setRegister} />
      )}

      {error && (
        <div className="rounded-lg border px-4 py-2.5 text-[13px]"
          style={{ borderColor: 'var(--admin-amber)', color: 'var(--admin-amber)', background: 'var(--admin-surface)' }}>
          {error}
        </div>
      )}

      {totals && (totals.itemCount > 0 || editing) && (
        <Indicators totals={totals} currency={currency} />
      )}

      {!editing && (!register || register.items.length === 0) && (
        <div className="rounded-xl border p-12 text-center" style={card}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun suivi d&apos;approvisionnement pour ce chantier.
          </p>
          {!canEdit && (
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Sa création est réservée aux chefs d&apos;études, de réalisation et à la direction.
            </p>
          )}
        </div>
      )}

      {!editing && register && register.items.length > 0 && (
        <ReadTable
          register={register}
          expanded={expanded}
          onToggle={toggle}
        />
      )}

      {editing && (
        <div className="space-y-3">
          {draft.map((item, i) => (
            <ItemEditor
              key={item.key}
              item={item}
              index={i}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              currency={currency}
              onPatch={(patch) => patchItem(i, patch)}
              onPatchDelivery={(j, patch) => patchDelivery(i, j, patch)}
              onPatchPurchase={(j, patch) => patchPurchase(i, j, patch)}
              onAddDelivery={() => patchItem(i, { deliveries: [...item.deliveries, emptyDelivery()] })}
              onAddPurchase={() => patchItem(i, { purchases: [...item.purchases, emptyPurchase()] })}
              onRemoveDelivery={(j) => patchItem(i, { deliveries: item.deliveries.filter((_, x) => x !== j) })}
              onRemovePurchase={(j) => patchItem(i, { purchases: item.purchases.filter((_, x) => x !== j) })}
              onRemove={() => setDraft((d) => d.filter((_, x) => x !== i))}
            />
          ))}
          <button
            onClick={() => setDraft((d) => [...d, emptyItem()])}
            className="w-full rounded-xl border border-dashed py-3 text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            + Ajouter une ligne du devis
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Indicators (the workbook's header block) ────────────────────────────────

function Indicators({ totals, currency }: {
  totals: ReturnType<typeof computeRegister>
  currency: string
}) {
  const cells: { label: string; value: string; tone?: string; hint?: string }[] = [
    { label: `Coût total prévisionnel (${currency})`, value: formatMoney(totals.plannedTotalHtva) },
    { label: `Coût total réel (${currency})`, value: formatMoney(totals.actualTotalHtva) },
    {
      label: 'Taux de respect du coût',
      value: formatPercent(totals.costComplianceRate, 0),
      tone: totals.costComplianceRate !== null && totals.costComplianceRate > 1 ? 'over' : 'neutral',
      hint: 'Coût réel ÷ coût prévisionnel',
    },
    {
      // Σ livré / Σ prévu on the whole register — NOT the average of the
      // per-line variance percentages. See supply-calc.ts; do not revert.
      label: 'Taux de respect de quantité',
      value: formatPercent(totals.quantityComplianceRate, 2),
      tone: totals.quantityComplianceRate !== null && totals.quantityComplianceRate > 1
        ? 'over' : 'neutral',
      hint: `Σ quantités livrées (${formatQuantity(totals.totalDeliveredQuantity)})`
        + ` ÷ Σ quantités prévues (${formatQuantity(totals.totalPlannedQuantity)})`,
    },
    { label: `Dépenses d'achat HTVA (${currency})`, value: formatMoney(totals.purchaseTotalHtva) },
    {
      label: `Marge brute (${currency})`,
      value: formatMoney(totals.grossMargin),
      tone: totals.grossMargin < 0 ? 'over' : 'neutral',
      hint: "Coût réel facturable moins les achats",
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl border p-4" style={card}>
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
            {c.label}
          </p>
          <p
            className="text-2xl font-bold mt-1 tabular-nums"
            style={{ color: c.tone ? TONE_COLOR[c.tone] : 'var(--admin-text)' }}
          >
            {c.value}
          </p>
          {c.hint && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>{c.hint}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Read view ───────────────────────────────────────────────────────────────

function VarianceBadge({ value, pct, money }: { value: number; pct: number | null; money?: boolean }) {
  const tone = varianceTone(value)
  const sign = value > 0 ? '+' : ''
  return (
    <span className="tabular-nums" style={{ color: TONE_COLOR[tone] }}>
      {sign}{money ? formatMoney(value) : formatQuantity(value)}
      {pct !== null && (
        <span className="opacity-70"> ({sign}{formatPercent(pct, 1)})</span>
      )}
    </span>
  )
}

function ReadTable({ register, expanded, onToggle }: {
  register: SupplyRegisterRow
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={card}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Désignation', 'Norme', 'Qté prévue', 'P.U. HTVA', 'Total prévu',
                'Qté livrée', 'Écart qté', 'P.U. réel', 'Total réel', 'Écart total', ''].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] font-medium whitespace-nowrap"
                  style={{ color: 'var(--admin-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {register.items.map((item) => {
              const t = item.totals
              const open = expanded.has(item.id)
              const detailCount = item.deliveries.length + item.purchases.length
              return (
                <>
                  <tr key={item.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2.5 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
                      {item.designation}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {item.norme ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatQuantity(item.plannedQuantity)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatMoney(item.plannedUnitPriceHtva)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatMoney(t.plannedTotalHtva)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatQuantity(t.deliveredQuantity)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      <VarianceBadge value={t.quantityVariance} pct={t.quantityVariancePct} />
                    </td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatMoney(t.actualUnitPriceHtva)}
                      {t.unitPriceVariance !== 0 && (
                        <span className="text-[11px] ml-1" style={{ color: TONE_COLOR[varianceTone(t.unitPriceVariance)] }}>
                          ({t.unitPriceVariance > 0 ? '+' : ''}{formatMoney(t.unitPriceVariance)}
                          {t.unitPriceVariancePct !== null &&
                            ` · ${t.unitPriceVariance > 0 ? '+' : ''}${formatPercent(t.unitPriceVariancePct, 1)}`})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-medium tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatMoney(t.actualTotalHtva)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      <VarianceBadge value={t.totalVariance} pct={t.totalVariancePct} money />
                    </td>
                    <td className="px-3 py-2.5">
                      {detailCount > 0 && (
                        <button
                          onClick={() => onToggle(item.id)}
                          aria-expanded={open}
                          className="text-[12px] font-medium whitespace-nowrap"
                          style={{ color: 'var(--admin-accent)' }}
                        >
                          {open ? 'Masquer' : `${item.deliveries.length} livr. · ${item.purchases.length} achat`}
                        </button>
                      )}
                    </td>
                  </tr>

                  {open && (
                    <tr key={`${item.id}-detail`} style={{ background: 'var(--admin-bg)' }}>
                      <td colSpan={11} className="px-3 py-3">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <DetailBlock title="Livraisons sur site" empty="Aucune livraison enregistrée.">
                            {item.deliveries.length > 0 && (
                              <table className="w-full text-[12px]">
                                <thead>
                                  <tr style={{ color: 'var(--admin-text-muted)' }}>
                                    <th className="text-left font-medium py-1">Date</th>
                                    <th className="text-left font-medium py-1">Fournisseur</th>
                                    <th className="text-left font-medium py-1">N° BL</th>
                                    <th className="text-right font-medium py-1">Quantité</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.deliveries.map((d) => (
                                    <tr key={d.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                                      <td className="py-1.5" style={{ color: 'var(--admin-text)' }}>
                                        {d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString('fr-FR') : '—'}
                                      </td>
                                      <td className="py-1.5" style={{ color: 'var(--admin-text)' }}>{d.supplierName ?? '—'}</td>
                                      <td className="py-1.5 font-mono" style={{ color: 'var(--admin-text-muted)' }}>{d.blNumber ?? '—'}</td>
                                      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
                                        {formatQuantity(d.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </DetailBlock>

                          <DetailBlock title="Achats fournisseurs" empty="Aucun achat enregistré.">
                            {item.purchases.length > 0 && (
                              <table className="w-full text-[12px]">
                                <thead>
                                  <tr style={{ color: 'var(--admin-text-muted)' }}>
                                    <th className="text-left font-medium py-1">Fournisseur</th>
                                    <th className="text-left font-medium py-1">Norme</th>
                                    <th className="text-right font-medium py-1">Qté</th>
                                    <th className="text-right font-medium py-1">P.U. HTVA</th>
                                    <th className="text-right font-medium py-1">Total HTVA</th>
                                    <th className="text-right font-medium py-1">TVA</th>
                                    <th className="text-right font-medium py-1">Total TTC</th>
                                    <th className="text-left font-medium py-1">Budget</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.purchases.map((p) => (
                                    <tr key={p.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                                      <td className="py-1.5" style={{ color: 'var(--admin-text)' }}>{p.supplierName ?? '—'}</td>
                                      <td className="py-1.5" style={{ color: 'var(--admin-text-muted)' }}>{p.norme ?? '—'}</td>
                                      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatQuantity(p.quantity)}</td>
                                      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatMoney(p.unitPriceHtva)}</td>
                                      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatMoney(p.totalHtva)}</td>
                                      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                                        {formatPercent(p.vatRate, 0)}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums font-medium" style={{ color: 'var(--admin-text)' }}>{formatMoney(p.totalTtc)}</td>
                                      <td className="py-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                                        {p.purchaseOrderId
                                          ? `déjà compté (BC${p.purchaseOrderReference ? ` : ${p.purchaseOrderReference}` : ''})`
                                          : 'compté'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </DetailBlock>
                        </div>

                        {item.observations && (
                          <p className="mt-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                            <span className="font-medium">Observations : </span>{item.observations}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DetailBlock({ title, empty, children }: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-3" style={card}>
      <p className="text-[11px] font-medium uppercase tracking-wide mb-1"
        style={{ color: 'var(--admin-text-muted)' }}>{title}</p>
      {children ?? null}
      {!children && <p className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{empty}</p>}
    </div>
  )
}

// ─── Edit view ───────────────────────────────────────────────────────────────

function ItemEditor(props: {
  item: DraftItem
  index: number
  suppliers: SupplierOption[]
  purchaseOrders: PurchaseOrderOption[]
  currency: string
  onPatch: (patch: Partial<DraftItem>) => void
  onPatchDelivery: (j: number, patch: Partial<DraftDelivery>) => void
  onPatchPurchase: (j: number, patch: Partial<DraftPurchase>) => void
  onAddDelivery: () => void
  onAddPurchase: () => void
  onRemoveDelivery: (j: number) => void
  onRemovePurchase: (j: number) => void
  onRemove: () => void
}) {
  const { item, suppliers, purchaseOrders, currency } = props
  const t = draftTotals(item)

  return (
    <div className="rounded-xl border p-4 space-y-4" style={card}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--admin-text-muted)' }}>
          Ligne {props.index + 1} — devis validé
        </p>
        <button
          onClick={props.onRemove}
          className="text-[12px] font-medium"
          style={{ color: 'var(--admin-amber)' }}
        >
          Supprimer la ligne
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-12">
        <div className="md:col-span-5">
          <Label>Désignation</Label>
          <Field ariaLabel="Désignation" value={item.designation}
            onChange={(v) => props.onPatch({ designation: v })} />
        </div>
        <div className="md:col-span-2">
          <Label>Norme / unité</Label>
          <Field ariaLabel="Norme" value={item.norme} placeholder="m³, Pot 30…"
            onChange={(v) => props.onPatch({ norme: v })} />
        </div>
        <div className="md:col-span-2">
          <Label>Quantité prévue</Label>
          <Field ariaLabel="Quantité prévue" type="number" value={item.plannedQuantity}
            onChange={(v) => props.onPatch({ plannedQuantity: v })} />
        </div>
        <div className="md:col-span-3">
          <Label>P.U. HTVA ({currency})</Label>
          <Field ariaLabel="Prix unitaire prévu" type="number" value={item.plannedUnitPriceHtva}
            onChange={(v) => props.onPatch({ plannedUnitPriceHtva: v })} />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-12">
        <div className="md:col-span-3">
          <Label>P.U. réel — si différent</Label>
          <Field ariaLabel="Prix unitaire réel" type="number" value={item.actualUnitPriceHtva}
            placeholder={`= ${item.plannedUnitPriceHtva || '0'}`}
            onChange={(v) => props.onPatch({ actualUnitPriceHtva: v })} />
        </div>
        <div className="md:col-span-9">
          <Label>Observations</Label>
          <Field ariaLabel="Observations" value={item.observations}
            onChange={(v) => props.onPatch({ observations: v })} />
        </div>
      </div>

      <div className="rounded-lg px-3 py-2 flex gap-x-6 gap-y-1 flex-wrap text-[12px]"
        style={{ background: 'var(--admin-bg)' }}>
        <Stat label="Total prévu" value={formatMoney(t.plannedTotalHtva)} />
        <Stat label="Qté livrée" value={formatQuantity(t.deliveredQuantity)} />
        <Stat label="Écart qté" value={`${t.quantityVariance > 0 ? '+' : ''}${formatQuantity(t.quantityVariance)} (${formatPercent(t.quantityVariancePct, 1)})`}
          tone={varianceTone(t.quantityVariance)} />
        <Stat label="Total réel" value={formatMoney(t.actualTotalHtva)} />
        <Stat label="Écart total" value={`${t.totalVariance > 0 ? '+' : ''}${formatMoney(t.totalVariance)} (${formatPercent(t.totalVariancePct, 1)})`}
          tone={varianceTone(t.totalVariance)} />
        <Stat label="Achats HTVA" value={formatMoney(t.purchaseTotalHtva)} />
        <Stat label="Achats TTC" value={formatMoney(t.purchaseTotalTtc)} />
      </div>

      {/* Livraisons */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--admin-text-muted)' }}>Livraisons sur site</p>
        {item.deliveries.map((d, j) => (
          <div key={d.key} className="grid gap-2 md:grid-cols-12 items-start">
            <div className="md:col-span-3">
              <Field ariaLabel="Date de livraison" type="date" value={d.deliveryDate}
                onChange={(v) => props.onPatchDelivery(j, { deliveryDate: v })} />
            </div>
            <div className="md:col-span-4">
              <SupplierPicker suppliers={suppliers} supplierId={d.supplierId} supplierLabel={d.supplierLabel}
                onChange={(patch) => props.onPatchDelivery(j, patch)} />
            </div>
            <div className="md:col-span-2">
              <Field ariaLabel="Numéro de BL" value={d.blNumber} placeholder="N° BL"
                onChange={(v) => props.onPatchDelivery(j, { blNumber: v })} />
            </div>
            <div className="md:col-span-2">
              <Field ariaLabel="Quantité livrée" type="number" value={d.quantity}
                onChange={(v) => props.onPatchDelivery(j, { quantity: v })} />
            </div>
            <div className="md:col-span-1">
              <button onClick={() => props.onRemoveDelivery(j)}
                aria-label="Supprimer la livraison"
                className="px-2 py-1.5 text-[12px]" style={{ color: 'var(--admin-amber)' }}>
                ✕
              </button>
            </div>
          </div>
        ))}
        <button onClick={props.onAddDelivery}
          className="text-[12px] font-medium" style={{ color: 'var(--admin-accent)' }}>
          + Ajouter une livraison
        </button>
      </div>

      {/* Achats */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--admin-text-muted)' }}>Achats fournisseurs</p>
        {item.purchases.map((p, j) => (
          <div key={p.key} className="grid gap-2 md:grid-cols-12 items-start">
            <div className="md:col-span-3">
              <SupplierPicker suppliers={suppliers} supplierId={p.supplierId} supplierLabel={p.supplierLabel}
                onChange={(patch) => props.onPatchPurchase(j, patch)} />
            </div>
            <div className="md:col-span-2">
              <Field ariaLabel="Norme achetée" value={p.norme} placeholder="Norme"
                onChange={(v) => props.onPatchPurchase(j, { norme: v })} />
            </div>
            <div className="md:col-span-2">
              <Field ariaLabel="Quantité achetée" type="number" value={p.quantity}
                onChange={(v) => props.onPatchPurchase(j, { quantity: v })} />
            </div>
            <div className="md:col-span-2">
              <Field ariaLabel="Prix unitaire d'achat" type="number" value={p.unitPriceHtva}
                onChange={(v) => props.onPatchPurchase(j, { unitPriceHtva: v })} />
            </div>
            <div className="md:col-span-2">
              <Field ariaLabel="Taux de TVA en pourcentage" type="number" value={p.vatPercent}
                placeholder="TVA %"
                onChange={(v) => props.onPatchPurchase(j, { vatPercent: v })} />
            </div>
            <div className="md:col-span-1">
              <button onClick={() => props.onRemovePurchase(j)}
                aria-label="Supprimer l'achat"
                className="px-2 py-1.5 text-[12px]" style={{ color: 'var(--admin-amber)' }}>
                ✕
              </button>
            </div>

            {/* Marking the bon de commande that already carries this amount is
                what keeps it out of budget consumption a second time. */}
            <div className="md:col-span-11">
              <select
                value={p.purchaseOrderId}
                aria-label="Bon de commande déjà comptabilisé"
                onChange={(e) => props.onPatchPurchase(j, { purchaseOrderId: e.target.value })}
                className="w-full rounded-md border px-2 py-1.5 text-[12px] outline-none"
                style={inputStyle}
              >
                <option value="">Dépense propre au registre — comptée dans le budget</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    Déjà couvert par le bon de commande : {po.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1" />
          </div>
        ))}
        <button onClick={props.onAddPurchase}
          className="text-[12px] font-medium" style={{ color: 'var(--admin-accent)' }}>
          + Ajouter un achat
        </button>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>
      {children}
    </span>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span>
      <span style={{ color: 'var(--admin-text-muted)' }}>{label} : </span>
      <span className="font-medium tabular-nums"
        style={{ color: tone ? TONE_COLOR[tone] : 'var(--admin-text)' }}>{value}</span>
    </span>
  )
}
