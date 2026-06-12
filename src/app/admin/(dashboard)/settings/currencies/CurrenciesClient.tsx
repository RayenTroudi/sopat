'use client'

import { useState } from 'react'
import type { ExchangeRateRow } from '@/lib/db/exchange-rates'
import type { Currency } from '@/lib/currency'
import { getCurrencySymbol } from '@/lib/currency'

type Props = {
  currentRates: ExchangeRateRow[]
}

const CURRENCIES: { code: Currency; name: string; flag: string }[] = [
  { code: 'EUR', name: 'Euro',            flag: '🇪🇺' },
  { code: 'OMR', name: 'Rial omanais',    flag: '🇴🇲' },
  { code: 'XOF', name: 'Franc CFA',       flag: '🌍' },
  { code: 'QAR', name: 'Riyal qatari',    flag: '🇶🇦' },
  { code: 'LYD', name: 'Dinar libyen',    flag: '🇱🇾' },
  { code: 'USD', name: 'Dollar US',       flag: '🇺🇸' },
]

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 6 })

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

type HistoryMap = Record<string, ExchangeRateRow[]>

export function CurrenciesClient({ currentRates }: Props) {
  const [editing, setEditing]     = useState<Currency | null>(null)
  const [newRate, setNewRate]      = useState('')
  const [newDate, setNewDate]      = useState(new Date().toISOString().slice(0, 10))
  const [newSource, setNewSource]  = useState('')
  const [saving, setSaving]        = useState(false)
  const [error, setError]          = useState<string | null>(null)
  const [rates, setRates]          = useState<ExchangeRateRow[]>(currentRates)
  const [history, setHistory]      = useState<HistoryMap>({})
  const [loadingHistory, setLoadingHistory] = useState<Currency | null>(null)

  const rateMap: Record<string, ExchangeRateRow> = {}
  for (const r of rates) rateMap[r.fromCurrency] = r

  async function loadHistory(currency: Currency) {
    if (history[currency]) return
    setLoadingHistory(currency)
    try {
      const res = await fetch(`/api/exchange-rates?currency=${currency}`)
      if (res.ok) {
        const data: ExchangeRateRow[] = await res.json()
        setHistory((h) => ({ ...h, [currency]: data }))
      }
    } finally {
      setLoadingHistory(null)
    }
  }

  async function handleSave(currency: Currency) {
    if (!newRate) return
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCurrency:  currency,
          rate:          newRate,
          effectiveDate: newDate,
          source:        newSource || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Erreur lors de la sauvegarde')
        return
      }
      const saved: ExchangeRateRow = await res.json()
      setRates((prev) => {
        const without = prev.filter((r) => r.fromCurrency !== currency)
        // Keep the most recent as current
        const existing = prev.find((r) => r.fromCurrency === currency)
        if (!existing || new Date(saved.effectiveDate) >= new Date(existing.effectiveDate)) {
          return [...without, saved]
        }
        return prev
      })
      // Invalidate history cache for this currency
      setHistory((h) => {
        const next = { ...h }
        delete next[currency]
        return next
      })
      setEditing(null)
      setNewRate('')
      setNewSource('')
      setNewDate(new Date().toISOString().slice(0, 10))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
          Gestion des taux de change
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          Taux de conversion vers le dinar tunisien (TND) — mise à jour manuelle par l'administration
        </p>
      </div>

      {CURRENCIES.map(({ code, name, flag }) => {
        const current = rateMap[code]
        const age = current ? daysSince(current.effectiveDate) : null
        const stale = age !== null && age > 30
        const isEditingThis = editing === code
        const hist = history[code]

        return (
          <div
            key={code}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: stale ? 'var(--admin-amber)' : 'var(--admin-border)', background: 'var(--admin-surface)' }}
          >
            {/* Header row */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{flag}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                    {flag} {getCurrencySymbol(code)} — {name}
                  </p>
                  {current ? (
                    <p className="text-xs mt-0.5" style={{ color: stale ? 'var(--admin-amber)' : 'var(--admin-text-muted)' }}>
                      {stale && '⚠ '}
                      Dernière mise à jour : {fmtDate(current.effectiveDate)}
                      {age !== null && ` (il y a ${age} jours)`}
                      {current.source && ` · Source : ${current.source}`}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-red)' }}>
                      ⚠ Aucun taux enregistré
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {current && (
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      1 {getCurrencySymbol(code)} = {FMT.format(parseFloat(current.rate))} DT
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (isEditingThis) {
                      setEditing(null)
                    } else {
                      setEditing(code)
                      setNewRate('')
                      setNewDate(new Date().toISOString().slice(0, 10))
                      setNewSource('')
                      setError(null)
                      loadHistory(code)
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                >
                  {isEditingThis ? 'Annuler' : 'Mettre à jour'}
                </button>
              </div>
            </div>

            {/* Edit form */}
            {isEditingThis && (
              <div className="px-5 py-4 space-y-3" style={{ background: 'var(--admin-bg)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                  Nouveau taux : 1 {getCurrencySymbol(code)} = ? DT
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Taux (en DT)</label>
                    <input
                      type="text"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      placeholder="ex: 3.380000"
                      className="text-sm px-3 py-2 rounded-lg border w-40"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Date d'effet</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="text-sm px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                    <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Source (optionnel)</label>
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="ex: BCT, Bloomberg…"
                      className="text-sm px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                    />
                  </div>
                  <button
                    onClick={() => handleSave(code)}
                    disabled={saving || !newRate}
                    className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--green)' }}
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
                {error && (
                  <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>
                )}
              </div>
            )}

            {/* Rate history */}
            {(isEditingThis || hist) && (
              <div className="px-5 py-4">
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                  Historique des taux
                </p>
                {loadingHistory === code ? (
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</p>
                ) : hist && hist.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                          {["Date d'effet", 'Taux (DT)', 'Source', 'Enregistré le'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hist.slice(0, 20).map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                            <td className="px-3 py-2 tabular-nums">{fmtDate(r.effectiveDate)}</td>
                            <td className="px-3 py-2 tabular-nums font-medium" style={{ color: 'var(--admin-text)' }}>
                              {FMT.format(parseFloat(r.rate))} DT
                            </td>
                            <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>{r.source ?? '—'}</td>
                            <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                              {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucun historique disponible.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
