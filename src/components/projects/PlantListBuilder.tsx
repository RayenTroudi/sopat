'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlantRow = {
  _key: string            // client-only row identifier
  botanicalName: string
  commonName: string
  category: string
  quantity: string
  unit: string
  unitPriceEstimate: string
  supplierId: string
  notes: string
  plantSpeciesId: string
}

type PlantSpecies = {
  id: string
  botanicalName: string
  commonNameFr: string | null
  category: string
  defaultUnit: string
}

type Supplier = {
  id: string
  name: string
}

type Props = {
  projectId: string
  initialRows?: PlantRow[]
  onSaved?: (rows: PlantRow[]) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'tree', label: 'Arbre' },
  { value: 'palm', label: 'Palmier' },
  { value: 'shrub', label: 'Arbuste' },
  { value: 'ground_cover', label: 'Couvre-sol' },
  { value: 'climber', label: 'Plante grimpante' },
  { value: 'grass', label: 'Gazon' },
  { value: 'aquatic', label: 'Aquatique' },
  { value: 'other', label: 'Autre' },
]

const UNITS = [
  { value: 'unit', label: 'Unité' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'kg', label: 'kg' },
  { value: 'liter', label: 'L' },
  { value: 'ml', label: 'mL' },
]

function emptyRow(): PlantRow {
  return {
    _key: crypto.randomUUID(),
    botanicalName: '',
    commonName: '',
    category: 'tree',
    quantity: '',
    unit: 'unit',
    unitPriceEstimate: '',
    supplierId: '',
    notes: '',
    plantSpeciesId: '',
  }
}

function rowSubtotal(row: PlantRow): number {
  const qty = parseFloat(row.quantity) || 0
  const price = parseFloat(row.unitPriceEstimate) || 0
  return qty * price
}

// ─── Species Typeahead ────────────────────────────────────────────────────────

function SpeciesTypeahead({
  value,
  onChange,
  onSelectSpecies,
}: {
  value: string
  onChange: (v: string) => void
  onSelectSpecies: (s: PlantSpecies) => void
}) {
  const [results, setResults] = useState<PlantSpecies[]>([])
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    if (value.length < 2) { setResults([]); setOpen(false); return }
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/plant-species?q=${encodeURIComponent(value)}`)
      if (res.ok) {
        const data: PlantSpecies[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      }
    }, 220)
    return () => clearTimeout(timeoutRef.current)
  }, [value])

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => value.length >= 2 && results.length > 0 && setOpen(true)}
        placeholder="Nom botanique…"
        className="w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-green/30"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-surface)' }}
      />
      {open && (
        <ul
          className="absolute z-20 left-0 top-full mt-1 w-64 rounded-lg border shadow-lg overflow-hidden"
          style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
        >
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={() => { onSelectSpecies(s); setOpen(false) }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--admin-bg)] transition-colors"
              >
                <p className="text-xs font-medium italic" style={{ color: 'var(--admin-text)' }}>{s.botanicalName}</p>
                {s.commonNameFr && (
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.commonNameFr}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlantListBuilder({ projectId, initialRows = [], onSaved }: Props) {
  const [rows, setRows] = useState<PlantRow[]>(
    initialRows.length > 0 ? initialRows : [emptyRow()]
  )
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/plant-species')
      .then((r) => r.json())
      .catch(() => [])

    fetch(`/api/projects/${projectId}/plant-list`)
      .then((r) => r.json())
      .then((data: Omit<PlantRow, '_key'>[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data.map((r) => ({ ...r, _key: crypto.randomUUID(), quantity: r.quantity ?? '', unitPriceEstimate: r.unitPriceEstimate ?? '', supplierId: r.supplierId ?? '', notes: r.notes ?? '', plantSpeciesId: r.plantSpeciesId ?? '', commonName: r.commonName ?? '' })))
        }
      })
      .catch(() => {})

    fetch('/api/plant-species')
      .then((r) => r.json())
      .catch(() => [])

    // load suppliers
    fetch('/api/suppliers')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSuppliers(data) })
      .catch(() => {})
  }, [projectId])

  function updateRow(key: string, patch: Partial<PlantRow>) {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, ...patch } : r))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(key: string) {
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r._key !== key) : prev)
  }

  function handleSelectSpecies(key: string, species: PlantSpecies) {
    updateRow(key, {
      botanicalName: species.botanicalName,
      commonName: species.commonNameFr ?? '',
      category: species.category,
      unit: species.defaultUnit,
      plantSpeciesId: species.id,
    })
  }

  const total = rows.reduce((sum, r) => sum + rowSubtotal(r), 0)

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const validRows = rows.filter((r) => r.botanicalName.trim())
    const res = await fetch(`/api/projects/${projectId}/plant-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validRows }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedAt(new Date())
      onSaved?.(validRows)
    } else {
      const data = await res.json()
      setSaveError(data.error ?? 'Erreur de sauvegarde')
    }
  }

  const sel = {
    background: 'var(--admin-surface)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }
  const inputCls = 'w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-green/30'

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[860px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {['Espèce (nom botanique)', 'Catégorie', 'Qté', 'Unité', 'Prix unit. (TND)', 'Sous-total', 'Fournisseur', ''].map((h) => (
                <th key={h} className="pb-2 pr-2 text-left font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sub = rowSubtotal(row)
              return (
                <tr key={row._key} className="group">
                  <td className="py-1.5 pr-2 w-52">
                    <SpeciesTypeahead
                      value={row.botanicalName}
                      onChange={(v) => updateRow(row._key, { botanicalName: v, plantSpeciesId: '' })}
                      onSelectSpecies={(s) => handleSelectSpecies(row._key, s)}
                    />
                    {row.commonName && (
                      <p className="text-xs mt-0.5 pl-0.5 italic" style={{ color: 'var(--admin-text-muted)' }}>{row.commonName}</p>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 w-36">
                    <Select value={row.category} onValueChange={(v) => updateRow(row._key, { category: v })}>
                      <SelectTrigger className="h-8 text-xs bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2 w-20">
                    <input type="number" min="0" step="0.01" value={row.quantity} onChange={(e) => updateRow(row._key, { quantity: e.target.value })} className={inputCls} style={sel} placeholder="0" />
                  </td>
                  <td className="py-1.5 pr-2 w-24">
                    <Select value={row.unit} onValueChange={(v) => updateRow(row._key, { unit: v })}>
                      <SelectTrigger className="h-8 text-xs bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2 w-32">
                    <input type="number" min="0" step="0.001" value={row.unitPriceEstimate} onChange={(e) => updateRow(row._key, { unitPriceEstimate: e.target.value })} className={inputCls} style={sel} placeholder="0.000" />
                  </td>
                  <td className="py-1.5 pr-2 w-28 font-medium tabular-nums text-right" style={{ color: sub > 0 ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
                    {sub > 0 ? sub.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '—'}
                  </td>
                  <td className="py-1.5 pr-2 w-36">
                    <Select
                      value={row.supplierId === '' ? '__none__' : row.supplierId}
                      onValueChange={(v) => updateRow(row._key, { supplierId: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        <SelectValue placeholder="— Fournisseur —" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        <SelectItem value="__none__">— Fournisseur —</SelectItem>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 w-8">
                    <button
                      type="button"
                      onClick={() => removeRow(row._key)}
                      disabled={rows.length === 1}
                      className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity hover:bg-[var(--admin-red-dim)]"
                      title="Supprimer"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--admin-red)' }}>
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer row: add + total + save */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--admin-bg)]"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--green)' }}
        >
          + Ajouter une ligne
        </button>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Total estimé</p>
            <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} TND
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
              style={{ background: 'var(--green)' }}
            >
              {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            {savedAt && !saveError && (
              <p className="text-xs" style={{ color: 'var(--admin-emerald)' }}>
                Enregistré à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {saveError && <p className="text-xs text-[#2F6F4F]">{saveError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
