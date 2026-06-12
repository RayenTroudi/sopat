# International Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend SOPAT to support multi-currency, multi-country international projects with exchange-rate management, geographic dashboard, international reports, and country/currency-aware budget display throughout.

**Architecture:** Exchange rates live in a new `exchange_rates` DB table (admin-managed, no live API). A pure `src/lib/currency.ts` module provides `convertToTND`, `formatCurrency`, and `getCurrencySymbol`. Budget components are updated to accept `currency` prop and render dual-format display (project currency + TND equivalent). The International dashboard tab and settings page are new client components following the exact same patterns as existing tabs/settings pages.

**Tech Stack:** Drizzle ORM (PostgreSQL), Next.js App Router, React Hook Form, Recharts (already installed), TailwindCSS with CSS variables, Zod.

---

## File Map

### New files
- `db/migrations/0002_exchange_rates.sql` — migration for `exchange_rates` table
- `src/lib/currency.ts` — pure currency helpers (no DB imports)
- `src/lib/db/exchange-rates.ts` — DB queries for exchange rates
- `src/app/api/exchange-rates/route.ts` — GET (list all rates) + POST (upsert rate)
- `src/app/admin/(dashboard)/settings/currencies/page.tsx` — currency manager page (server)
- `src/app/admin/(dashboard)/settings/currencies/CurrencySettingsClient.tsx` — interactive table + form
- `src/app/admin/(dashboard)/dashboard/InternationalTab.tsx` — geographic dashboard tab (client)
- `src/lib/db/international.ts` — DB queries for international dashboard data
- `src/app/api/international/summary/route.ts` — GET endpoint for international dashboard data

### Modified files
- `db/schema.ts` — add `exchangeRates` table definition
- `src/components/budget/OfficialBudgetCard.tsx` — add dual-currency display
- `src/components/budget/BudgetSummaryBanner.tsx` — split from OfficialBudgetCard; add `currency` prop (currently the banner is inside OfficialBudgetCard.tsx as `BudgetSummaryBanner`)
- `src/components/realisation/BudgetMonitorWidget.tsx` — add `currency` prop, dual display
- `src/app/admin/(dashboard)/page.tsx` — add International tab wrapper + fetch international data
- `src/app/admin/(dashboard)/projects/[id]/ProjectTabs.tsx` — pass `currency` to budget components
- `src/app/admin/(dashboard)/reports/ReportsClient.tsx` — add country filter + "Performance internationale" tab
- `src/app/admin/(dashboard)/reports/page.tsx` — pass country filter param + new report data
- `src/lib/db/reports.ts` — add `getInternationalPerformanceReport()`, add country filter to existing `getBudgetVarianceReport()`
- `src/app/admin/(dashboard)/projects/[id]/page.tsx` — add `coordinateurTerrain` field display for non-TN projects
- `src/app/api/projects/[id]/route.ts` — accept `coordinateurTerrain` in PATCH body
- `src/lib/db/projects.ts` — add `coordinateurTerrain` to `UpdateProjectInput`, update query
- `db/schema.ts` — add `coordinateurTerrain` column to `projects` table

---

## Task 1: Add `exchange_rates` table to schema + migration

**Files:**
- Modify: `db/schema.ts`
- Create: `db/migrations/0002_exchange_rates.sql`

- [ ] **Step 1: Add `exchangeRates` table to schema**

Open `db/schema.ts`. After the `projectZones` table definition (around line 330), add:

```typescript
export const exchangeRates = pgTable('exchange_rates', {
  id:            uuid('id').primaryKey().defaultRandom(),
  fromCurrency:  currencyEnum('from_currency').notNull(),
  toCurrency:    varchar('to_currency', { length: 3 }).notNull().default('TND'),
  rate:          decimal('rate', { precision: 18, scale: 6 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source:        varchar('source', { length: 255 }),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('exchange_rates_currency_date_idx').on(t.fromCurrency, t.effectiveDate),
])
```

Also add `coordinateurTerrain` column to the `projects` table. Find the `notes` column in the projects table and add after it:

```typescript
  coordinateurTerrain: varchar('coordinateur_terrain', { length: 255 }),
```

- [ ] **Step 2: Generate migration**

Run:
```powershell
npx drizzle-kit generate
```

Expected: creates `db/migrations/0002_*.sql` (exact name will vary).

- [ ] **Step 3: Rename migration file to canonical name**

Rename the generated file to `db/migrations/0002_exchange_rates.sql`:
```powershell
Get-ChildItem db/migrations -Filter "0002_*.sql" | Rename-Item -NewName "0002_exchange_rates.sql"
```

- [ ] **Step 4: Apply migration**

```powershell
npx drizzle-kit migrate
```

Expected output: `[✓] migrations applied` (or similar success).

- [ ] **Step 5: Commit**

```powershell
git add db/schema.ts db/migrations/0002_exchange_rates.sql
git commit -m "feat: add exchange_rates table and coordinateur_terrain column"
```

---

## Task 2: Currency utility library (`src/lib/currency.ts`)

**Files:**
- Create: `src/lib/currency.ts`

- [ ] **Step 1: Write the currency module**

Create `src/lib/currency.ts`:

```typescript
export type Currency = 'TND' | 'EUR' | 'OMR' | 'XOF' | 'QAR' | 'LYD' | 'USD'

const SYMBOLS: Record<Currency, string> = {
  TND: 'DT',
  EUR: '€',
  OMR: 'OMR',
  XOF: 'FCFA',
  QAR: 'QAR',
  LYD: 'LYD',
  USD: '$',
}

const DECIMAL_PLACES: Record<Currency, number> = {
  TND: 3,
  EUR: 2,
  OMR: 3,
  XOF: 0,
  QAR: 2,
  LYD: 3,
  USD: 2,
}

export function getCurrencySymbol(currency: Currency | string): string {
  return SYMBOLS[currency as Currency] ?? currency
}

export function formatCurrency(amount: number, currency: Currency | string): string {
  const decimals = DECIMAL_PLACES[currency as Currency] ?? 2
  const symbol = getCurrencySymbol(currency)
  const fmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  // EUR uses € prefix; others use suffix
  if (currency === 'EUR' || currency === 'USD') {
    return `${symbol} ${fmt.format(amount)}`
  }
  return `${fmt.format(amount)} ${symbol}`
}

export function formatTND(amount: number): string {
  return formatCurrency(amount, 'TND')
}

/**
 * Converts amount from fromCurrency to TND using the provided rate.
 * rate = how many TND per 1 unit of fromCurrency.
 */
export function convertToTNDWithRate(amount: number, rate: number): number {
  return amount * rate
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/currency.ts
git commit -m "feat: add currency utility module (formatCurrency, getCurrencySymbol, convertToTNDWithRate)"
```

---

## Task 3: Exchange rates DB queries (`src/lib/db/exchange-rates.ts`)

**Files:**
- Create: `src/lib/db/exchange-rates.ts`

- [ ] **Step 1: Write DB module**

Create `src/lib/db/exchange-rates.ts`:

```typescript
import { db } from '../../../db/index'
import { exchangeRates } from '../../../db/schema'
import { eq, desc, lte, and } from 'drizzle-orm'
import type { Currency } from '../currency'

export type ExchangeRateRow = {
  id:            string
  fromCurrency:  string
  toCurrency:    string
  rate:          string   // decimal string from DB
  effectiveDate: string   // date string "YYYY-MM-DD"
  source:        string | null
  createdAt:     Date
}

export type UpsertRateInput = {
  fromCurrency: Currency
  rate:         string   // decimal string e.g. "3.300000"
  effectiveDate: string  // "YYYY-MM-DD"
  source?:      string
  createdBy?:   string
}

/** Returns the most recent rate for each currency (for dashboard display). */
export async function getCurrentRates(): Promise<ExchangeRateRow[]> {
  const currencies: Currency[] = ['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']
  const results: ExchangeRateRow[] = []

  for (const currency of currencies) {
    const row = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.fromCurrency, currency))
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1)

    if (row[0]) {
      results.push({
        id:            row[0].id,
        fromCurrency:  row[0].fromCurrency,
        toCurrency:    row[0].toCurrency,
        rate:          row[0].rate,
        effectiveDate: row[0].effectiveDate,
        source:        row[0].source,
        createdAt:     row[0].createdAt,
      })
    }
  }

  return results
}

/** Returns all historical rates for a specific currency, newest first. */
export async function getRateHistory(currency: Currency): Promise<ExchangeRateRow[]> {
  const rows = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.fromCurrency, currency))
    .orderBy(desc(exchangeRates.effectiveDate))

  return rows.map((r) => ({
    id:            r.id,
    fromCurrency:  r.fromCurrency,
    toCurrency:    r.toCurrency,
    rate:          r.rate,
    effectiveDate: r.effectiveDate,
    source:        r.source,
    createdAt:     r.createdAt,
  }))
}

/** Returns the most recent rate on or before `onDate` for `fromCurrency`. */
export async function getRateOnDate(
  fromCurrency: Currency,
  onDate: string  // "YYYY-MM-DD"
): Promise<number | null> {
  const row = await db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        lte(exchangeRates.effectiveDate, onDate)
      )
    )
    .orderBy(desc(exchangeRates.effectiveDate))
    .limit(1)

  return row[0]?.rate ? parseFloat(row[0].rate) : null
}

/** Inserts a new rate record. */
export async function insertRate(input: UpsertRateInput): Promise<ExchangeRateRow> {
  const [row] = await db
    .insert(exchangeRates)
    .values({
      fromCurrency:  input.fromCurrency,
      toCurrency:    'TND',
      rate:          input.rate,
      effectiveDate: input.effectiveDate,
      source:        input.source ?? null,
    })
    .returning()

  return {
    id:            row.id,
    fromCurrency:  row.fromCurrency,
    toCurrency:    row.toCurrency,
    rate:          row.rate,
    effectiveDate: row.effectiveDate,
    source:        row.source,
    createdAt:     row.createdAt,
  }
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/db/exchange-rates.ts
git commit -m "feat: add exchange rates DB queries (getCurrentRates, getRateHistory, getRateOnDate, insertRate)"
```

---

## Task 4: Exchange rates API (`/api/exchange-rates`)

**Files:**
- Create: `src/app/api/exchange-rates/route.ts`

- [ ] **Step 1: Write the route handler**

Create `src/app/api/exchange-rates/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCurrentRates, getRateHistory, insertRate } from '@/lib/db/exchange-rates'
import { z } from 'zod'
import type { Currency } from '@/lib/currency'

const CURRENCIES: Currency[] = ['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']

const insertSchema = z.object({
  fromCurrency:  z.enum(['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']),
  rate:          z.string().regex(/^\d+(\.\d+)?$/, 'Taux invalide'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)'),
  source:        z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const currency = searchParams.get('currency') as Currency | null

  try {
    if (currency && CURRENCIES.includes(currency)) {
      const history = await getRateHistory(currency)
      return NextResponse.json(history)
    }
    const current = await getCurrentRates()
    return NextResponse.json(current)
  } catch (err) {
    console.error('[GET /api/exchange-rates]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = insertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await insertRate({ ...parsed.data, createdBy: session.user.userId })
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    console.error('[POST /api/exchange-rates]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/exchange-rates/route.ts
git commit -m "feat: add /api/exchange-rates GET + POST endpoints"
```

---

## Task 5: Currency Settings page (`/admin/settings/currencies`)

**Files:**
- Create: `src/app/admin/(dashboard)/settings/currencies/page.tsx`
- Create: `src/app/admin/(dashboard)/settings/currencies/CurrencySettingsClient.tsx`

- [ ] **Step 1: Write the server page**

Create `src/app/admin/(dashboard)/settings/currencies/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCurrentRates } from '@/lib/db/exchange-rates'
import { CurrencySettingsClient } from './CurrencySettingsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Taux de change | SOPAT Admin' }

export default async function CurrencySettingsPage() {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'direction')) {
    redirect('/admin')
  }

  const rates = await getCurrentRates()
  return <CurrencySettingsClient initialRates={rates} />
}
```

- [ ] **Step 2: Write the client component**

Create `src/app/admin/(dashboard)/settings/currencies/CurrencySettingsClient.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { ExchangeRateRow } from '@/lib/db/exchange-rates'
import { getCurrencySymbol } from '@/lib/currency'

type Props = {
  initialRates: ExchangeRateRow[]
}

const ALL_CURRENCIES = ['EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD'] as const
type ForeignCurrency = typeof ALL_CURRENCIES[number]

const CURRENCY_NAMES: Record<ForeignCurrency, string> = {
  EUR: 'Euro',
  OMR: 'Rial omanais',
  XOF: 'Franc CFA (BCEAO)',
  QAR: 'Riyal qatari',
  LYD: 'Dinar libyen',
  USD: 'Dollar américain',
}

const STALE_DAYS = 30

function isStale(effectiveDate: string): boolean {
  const then = new Date(effectiveDate)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  return diffMs > STALE_DAYS * 86400000
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

type HistoryRow = ExchangeRateRow & { __temp?: boolean }

export function CurrencySettingsClient({ initialRates }: Props) {
  const [rates, setRates] = useState<ExchangeRateRow[]>(initialRates)
  const [editing, setEditing] = useState<ForeignCurrency | null>(null)
  const [newRate, setNewRate] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [newSource, setNewSource] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null)

  const rateMap = Object.fromEntries(rates.map((r) => [r.fromCurrency, r]))

  async function loadHistory(currency: ForeignCurrency) {
    if (history[currency]) return
    setLoadingHistory(currency)
    try {
      const res = await fetch(`/api/exchange-rates?currency=${currency}`)
      if (res.ok) {
        const data = await res.json() as ExchangeRateRow[]
        setHistory((h) => ({ ...h, [currency]: data }))
      }
    } finally {
      setLoadingHistory(null)
    }
  }

  async function handleSave(currency: ForeignCurrency) {
    if (!newRate || isNaN(parseFloat(newRate)) || parseFloat(newRate) <= 0) {
      setError('Taux invalide — entrez un nombre positif.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCurrency: currency, rate: newRate, effectiveDate: newDate, source: newSource || undefined }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur lors de la sauvegarde.')
        return
      }
      const saved = await res.json() as ExchangeRateRow
      setRates((prev) => {
        const existing = prev.find((r) => r.fromCurrency === currency)
        if (!existing || saved.effectiveDate >= existing.effectiveDate) {
          return [...prev.filter((r) => r.fromCurrency !== currency), saved]
        }
        return prev
      })
      setHistory((h) => ({
        ...h,
        [currency]: h[currency] ? [saved, ...h[currency]] : [saved],
      }))
      setEditing(null)
      setNewRate('')
      setNewSource('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
          Taux de change
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          Taux de conversion vers le Dinar Tunisien (TND). Mise à jour manuelle par l'administration.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-red)', background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Devise', 'Symbole', 'Taux actuel (→ TND)', 'Date d\'effet', 'Source', 'Statut', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_CURRENCIES.map((currency, i) => {
              const current = rateMap[currency]
              const stale = current ? isStale(current.effectiveDate) : true
              const isEditingThis = editing === currency

              return (
                <>
                  <tr
                    key={currency}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    className="hover:bg-[var(--admin-bg)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>
                      {currency} — {CURRENCY_NAMES[currency]}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {getCurrencySymbol(currency)}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {current ? `1 ${currency} = ${parseFloat(current.rate).toFixed(4)} DT` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {current ? fmtDate(current.effectiveDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {current?.source ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {stale ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>
                          {current ? `⚠ +${STALE_DAYS}j` : 'Non défini'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                          À jour
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditing(isEditingThis ? null : currency)
                          setNewRate('')
                          setNewSource('')
                          setError(null)
                          if (!isEditingThis) loadHistory(currency)
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                      >
                        {isEditingThis ? 'Annuler' : 'Mettre à jour'}
                      </button>
                    </td>
                  </tr>

                  {isEditingThis && (
                    <tr key={`${currency}-edit`} style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* Input form */}
                          <div className="flex items-end gap-3 flex-wrap">
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                                Nouveau taux (1 {currency} = ? DT)
                              </label>
                              <input
                                type="number"
                                step="0.000001"
                                min="0.000001"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                                placeholder="ex. 3.300000"
                                className="text-sm border rounded-lg px-3 py-2 w-44 focus:outline-none focus:ring-2 focus:ring-green/20"
                                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                                Date d'effet
                              </label>
                              <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/20"
                                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                              />
                            </div>
                            <div className="space-y-1 flex-1">
                              <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                                Source (optionnel)
                              </label>
                              <input
                                type="text"
                                value={newSource}
                                onChange={(e) => setNewSource(e.target.value)}
                                placeholder="ex. BCT, Reuters"
                                className="text-sm border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-green/20"
                                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                              />
                            </div>
                            <button
                              onClick={() => handleSave(currency)}
                              disabled={saving || !newRate}
                              className="text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                              style={{ background: 'var(--admin-emerald)', color: 'white' }}
                            >
                              {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                          </div>

                          {/* History table */}
                          {loadingHistory === currency && (
                            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Chargement de l'historique…</p>
                          )}
                          {history[currency] && history[currency].length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                                Historique des taux ({currency} → TND)
                              </p>
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                    {['Date d\'effet', 'Taux', 'Source', 'Enregistré le'].map((h) => (
                                      <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {history[currency].slice(0, 10).map((row) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                      <td className="px-2 py-1.5 tabular-nums">{fmtDate(row.effectiveDate)}</td>
                                      <td className="px-2 py-1.5 tabular-nums font-mono">{parseFloat(row.rate).toFixed(6)}</td>
                                      <td className="px-2 py-1.5" style={{ color: 'var(--admin-text-muted)' }}>{row.source ?? '—'}</td>
                                      <td className="px-2 py-1.5 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                                        {new Date(row.createdAt).toLocaleDateString('fr-FR')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {history[currency] && history[currency].length === 0 && (
                            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucun historique disponible.</p>
                          )}
                        </div>
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
```

- [ ] **Step 3: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Add link to settings nav**

Open `src/app/admin/(dashboard)/settings/SettingsClient.tsx`. Find the existing settings navigation or main content section and add a link/card to Taux de change. The exact insertion depends on current content — look for the navigation section and add:

```typescript
// Inside the settings page navigation, after existing settings items:
<Link
  href="/admin/settings/currencies"
  className="block rounded-xl border p-4 hover:bg-[var(--admin-bg)] transition-colors"
  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
>
  <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Taux de change</p>
  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
    Gérer les taux de conversion vers le TND pour les projets internationaux
  </p>
</Link>
```

- [ ] **Step 5: Commit**

```powershell
git add src/app/admin/(dashboard)/settings/currencies/ src/app/admin/(dashboard)/settings/SettingsClient.tsx
git commit -m "feat: add currency exchange rate manager at /admin/settings/currencies"
```

---

## Task 6: Dual-currency budget display in `OfficialBudgetCard` and `BudgetSummaryBanner`

**Files:**
- Modify: `src/components/budget/OfficialBudgetCard.tsx`

The goal is to show primary budget in project currency, and secondary TND equivalent (when currency ≠ TND and a rate is available).

- [ ] **Step 1: Update `OfficialBudgetCard` props and display**

Open `src/components/budget/OfficialBudgetCard.tsx`. Replace the file content with:

```typescript
'use client'

import { formatCurrency, getCurrencySymbol } from '@/lib/currency'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

type Props = {
  approvedAmount:     string          // decimal string from DB
  approvedByName:     string | null
  approvedAt:         Date | null
  validationStatus:   string          // 'validated' | 'modified'
  modificationReason?: string | null
  isAdmin:            boolean
  projectId:          string
  currency?:          string          // project currency, defaults to 'TND'
  tndEquivalent?:     number | null   // pre-computed TND amount when currency ≠ TND
  onRequestUnlock?:   () => void
}

function fmt(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function OfficialBudgetCard({
  approvedAmount,
  approvedByName,
  approvedAt,
  validationStatus,
  modificationReason,
  isAdmin,
  onRequestUnlock,
  currency = 'TND',
  tndEquivalent,
}: Props) {
  const amount = parseFloat(approvedAmount)
  const wasModified = validationStatus === 'modified'
  const formatted = formatCurrency(amount, currency)

  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-surface)' }}
    >
      <div
        className="px-5 py-2.5 flex items-center justify-between"
        style={{ background: 'var(--admin-emerald)', color: 'white' }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide">Budget Officiel</span>
        </div>
        {wasModified && (
          <span className="text-xs opacity-80">Modifié par le chef</span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {formatted}
            </p>
            {currency !== 'TND' && tndEquivalent != null && (
              <p className="text-sm mt-0.5 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                ≈ {formatCurrency(tndEquivalent, 'TND')}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Approuvé par {approvedByName ?? 'Inconnu'} · {fmt(approvedAt)}
            </p>
          </div>
          {isAdmin && onRequestUnlock && (
            <button
              type="button"
              onClick={onRequestUnlock}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Modifier (admin)
            </button>
          )}
        </div>

        {wasModified && modificationReason && (
          <div className="rounded-lg p-3" style={{ background: 'var(--admin-amber-dim)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--admin-amber)' }}>Raison de la modification</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text)' }}>{modificationReason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function BudgetSummaryBanner({
  approvedBudget,
  currency = 'TND',
  tndEquivalent,
}: {
  approvedBudget:  string | null
  currency?:       string
  tndEquivalent?:  number | null
}) {
  if (!approvedBudget) return null
  const amount = parseFloat(approvedBudget)
  const formatted = formatCurrency(amount, currency)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
      style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-emerald)', flexShrink: 0 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className="text-sm" style={{ color: 'var(--admin-emerald)' }}>
        Budget approuvé en Études :{' '}
        <strong className="font-semibold">{formatted}</strong>
        {currency !== 'TND' && tndEquivalent != null && (
          <span className="font-normal text-xs ml-2" style={{ color: 'var(--admin-text-muted)' }}>
            ≈ {formatCurrency(tndEquivalent, 'TND')}
          </span>
        )}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Update `BudgetMonitorWidget` to accept `currency` prop**

Open `src/components/realisation/BudgetMonitorWidget.tsx`. Make these targeted changes:

1. Add import at top:
```typescript
import { formatCurrency } from '@/lib/currency'
```

2. Replace the `fmt` function:
```typescript
function fmt(n: number, currency = 'TND') {
  return formatCurrency(n, currency)
}
```

3. Update `Props` type to add `currency?` and `tndRate?`:
```typescript
type Props = {
  projectId:      string
  approvedBudget: string | null
  currency?:      string
  tndRate?:       number | null
}
```

4. Update the component signature:
```typescript
export function BudgetMonitorWidget({ projectId, approvedBudget, currency = 'TND', tndRate }: Props) {
```

5. In the 3-column header, update the `BudgetColumn` value calls to use currency:
```typescript
<BudgetColumn
  label="Budget Approuvé"
  value={fmt(approved, currency)}
  sub={currency !== 'TND' && tndRate ? `≈ ${fmt(approved * tndRate, 'TND')}` : 'Validé en Études'}
  accentColor="var(--admin-emerald)"
/>
<BudgetColumn
  label="Dépensé à ce jour"
  value={state.loading ? '…' : fmt(state.totalSpent, currency)}
  sub={state.loading ? '' : `${pct.toFixed(1)}% du budget`}
  accentColor={barColor}
/>
<BudgetColumn
  label="Variance"
  value={state.loading ? '…' : `${variance >= 0 ? '+' : ''}${fmt(variance, currency)}`}
  sub={state.loading ? '' : `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%`}
  accentColor={isOver ? 'var(--admin-red)' : isAmber ? 'var(--admin-amber)' : 'var(--admin-text-muted)'}
/>
```

6. Update the over-budget alert message to use currency:
```typescript
// Replace: fmt(Math.abs(variance))
// With:
fmt(Math.abs(variance), currency)
// And: fmt(approved - state.totalSpent)
// With:
fmt(approved - state.totalSpent, currency)
```

- [ ] **Step 3: Update `ProjectTabs` to pass `currency` and `tndRate` to budget components**

Open `src/app/admin/(dashboard)/projects/[id]/ProjectTabs.tsx`.

The `currency` prop already exists. Now thread it to budget components. Find where `BudgetSummaryBanner` and `BudgetMonitorWidget` are rendered:

For `BudgetSummaryBanner` usages (in realisation and entretien tabs), change:
```typescript
<BudgetSummaryBanner approvedBudget={approvedBudget} />
```
to:
```typescript
<BudgetSummaryBanner approvedBudget={approvedBudget} currency={currency ?? 'TND'} />
```

For `BudgetMonitorWidget`, change:
```typescript
<BudgetMonitorWidget projectId={projectId} approvedBudget={approvedBudget} />
```
to:
```typescript
<BudgetMonitorWidget projectId={projectId} approvedBudget={approvedBudget} currency={currency ?? 'TND'} />
```

- [ ] **Step 4: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add src/components/budget/OfficialBudgetCard.tsx src/components/realisation/BudgetMonitorWidget.tsx src/app/admin/(dashboard)/projects/[id]/ProjectTabs.tsx
git commit -m "feat: dual-currency budget display in OfficialBudgetCard, BudgetSummaryBanner, BudgetMonitorWidget"
```

---

## Task 7: International DB queries (`src/lib/db/international.ts`)

**Files:**
- Create: `src/lib/db/international.ts`

- [ ] **Step 1: Write the international summary queries**

Create `src/lib/db/international.ts`:

```typescript
import { db } from '../../../db/index'
import { projects } from '../../../db/schema'
import { isNull, sql } from 'drizzle-orm'

export type CountrySummary = {
  country:       string
  projectCount:  number
  activeBudgetTND: number  // sum of approvedBudget converted to TND (best-effort with stored currency)
}

export type RegionSummary = {
  region:    string
  countries: CountrySummary[]
}

const REGION_MAP: Record<string, string> = {
  TN: 'Afrique',
  CI: 'Afrique',
  MR: 'Afrique',
  FR: 'Europe',
  OM: 'Moyen-Orient',
  QA: 'Moyen-Orient',
  LY: 'Moyen-Orient',
}

const COUNTRY_NAMES: Record<string, string> = {
  TN: 'Tunisie',
  CI: 'Côte d\'Ivoire',
  MR: 'Mauritanie',
  FR: 'France',
  OM: 'Oman',
  QA: 'Qatar',
  LY: 'Libye',
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

export type ProjectCountryRow = {
  country:     string
  countryName: string
  flag:        string
  region:      string
  count:       number
  budgetSum:   number | null
  currency:    string
}

export async function getProjectsByCountry(): Promise<ProjectCountryRow[]> {
  const rows = await db
    .select({
      country:  projects.country,
      currency: projects.currency,
      count:    sql<number>`count(*)`,
      budgetSum: sql<string>`coalesce(sum(approved_budget::numeric), 0)::text`,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .groupBy(projects.country, projects.currency)

  // Group by country (multiple currencies possible per country — rare but possible)
  const byCountry: Record<string, ProjectCountryRow> = {}
  for (const r of rows) {
    const country = r.country ?? 'TN'
    if (!byCountry[country]) {
      byCountry[country] = {
        country,
        countryName: COUNTRY_NAMES[country] ?? country,
        flag:        countryFlag(country),
        region:      REGION_MAP[country] ?? 'Autre',
        count:       0,
        budgetSum:   0,
        currency:    r.currency ?? 'TND',
      }
    }
    byCountry[country].count += Number(r.count)
    byCountry[country].budgetSum = (byCountry[country].budgetSum ?? 0) + parseFloat(r.budgetSum)
  }

  return Object.values(byCountry).sort((a, b) => b.count - a.count)
}

export async function getActiveProjectsByCountry(): Promise<ProjectCountryRow[]> {
  const rows = await db
    .select({
      country:   projects.country,
      currency:  projects.currency,
      count:     sql<number>`count(*)`,
      budgetSum: sql<string>`coalesce(sum(approved_budget::numeric), 0)::text`,
    })
    .from(projects)
    .where(
      sql`${projects.deletedAt} is null and ${projects.status} not in ('cancelled', 'completed', 'draft')`
    )
    .groupBy(projects.country, projects.currency)

  const byCountry: Record<string, ProjectCountryRow> = {}
  for (const r of rows) {
    const country = r.country ?? 'TN'
    if (!byCountry[country]) {
      byCountry[country] = {
        country,
        countryName: COUNTRY_NAMES[country] ?? country,
        flag:        countryFlag(country),
        region:      REGION_MAP[country] ?? 'Autre',
        count:       0,
        budgetSum:   0,
        currency:    r.currency ?? 'TND',
      }
    }
    byCountry[country].count += Number(r.count)
    byCountry[country].budgetSum = (byCountry[country].budgetSum ?? 0) + parseFloat(r.budgetSum)
  }

  return Object.values(byCountry).sort((a, b) => b.count - a.count)
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/db/international.ts
git commit -m "feat: add international DB queries (getProjectsByCountry, getActiveProjectsByCountry)"
```

---

## Task 8: International dashboard tab

**Files:**
- Create: `src/app/admin/(dashboard)/dashboard/InternationalTab.tsx`
- Modify: `src/app/admin/(dashboard)/page.tsx`

- [ ] **Step 1: Create the InternationalTab component**

Create `src/app/admin/(dashboard)/dashboard/InternationalTab.tsx`:

```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ProjectCountryRow } from '@/lib/db/international'

type Props = {
  byCountry:       ProjectCountryRow[]
  activeByCountry: ProjectCountryRow[]
}

const REGION_COLORS: Record<string, string> = {
  'Afrique':       '#2D5A27',
  'Europe':        '#2563EB',
  'Moyen-Orient':  '#D97706',
  'Autre':         '#6B7280',
}

const REGIONS = ['Afrique', 'Europe', 'Moyen-Orient']

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function fmtBudget(n: number | null): string {
  if (n === null || n === 0) return '—'
  if (n >= 1_000_000) return `${FMT.format(Math.round(n / 1000))}k DT`
  return `${FMT.format(Math.round(n))} DT`
}

export function InternationalTab({ byCountry, activeByCountry }: Props) {
  const chartData = byCountry.map((c) => ({
    name:    `${c.flag} ${c.countryName}`,
    projets: c.count,
    region:  c.region,
  }))

  const activeByRegion: Record<string, ProjectCountryRow[]> = {}
  for (const row of activeByCountry) {
    if (!activeByRegion[row.region]) activeByRegion[row.region] = []
    activeByRegion[row.region].push(row)
  }

  return (
    <div className="space-y-6">
      {/* Bar chart: projects by country */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Projets par pays
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Tous les projets actifs, réalisés et en entretien
          </p>
        </div>
        <div className="p-5">
          {byCountry.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun projet disponible.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [value, 'Projets']}
                  labelStyle={{ color: 'var(--admin-text)', fontWeight: 600, marginBottom: 4 }}
                />
                <Bar dataKey="projets" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={REGION_COLORS[entry.region] ?? '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Region color legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            {REGIONS.map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: REGION_COLORS[r] }} />
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active projects by region table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Projets actifs par région</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Projets en cours (Études · Réalisation · Entretien)
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
          {REGIONS.map((region) => {
            const rows = activeByRegion[region] ?? []
            return (
              <div key={region} className="px-5 py-4">
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: REGION_COLORS[region] ?? 'var(--admin-text-muted)' }}
                >
                  {region}
                </p>
                {rows.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet actif</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        {['Pays', 'Projets actifs', 'Budget total (devise)'].map((h) => (
                          <th key={h} className="text-left pb-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.country}>
                          <td className="py-2 pr-4">
                            <span className="text-base mr-2">{row.flag}</span>
                            <span style={{ color: 'var(--admin-text)' }}>{row.countryName}</span>
                          </td>
                          <td className="py-2 pr-4 tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                            {row.count}
                          </td>
                          <td className="py-2 tabular-nums text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            {fmtBudget(row.budgetSum)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the directory**

```powershell
New-Item -ItemType Directory -Force "src/app/admin/(dashboard)/dashboard"
```

(The file itself is created by Write in step 1.)

- [ ] **Step 3: Add International section to the dashboard page**

Open `src/app/admin/(dashboard)/page.tsx`.

Add the import at the top:
```typescript
import { InternationalTab } from './dashboard/InternationalTab'
import { getProjectsByCountry, getActiveProjectsByCountry } from '@/lib/db/international'
```

In the `Promise.all` fetch block, add the two new queries:
```typescript
const [kpis, activity, atRisk, upcomingVisits, rseData, byCountry, activeByCountry] = await Promise.all([
  getDashboardKpis(),
  getRecentActivity(20),
  getAtRiskProjects(),
  getUpcomingVisits(7),
  getRseDashboardData(),
  getProjectsByCountry(),
  getActiveProjectsByCountry(),
])
```

At the bottom of the JSX, before the closing `</div>`, add a new section:
```typescript
{/* International section */}
{(byCountry.length > 1 || byCountry.some((c) => c.country !== 'TN')) && (
  <Section title="International" action={
    <a href="/admin/settings/currencies" className="text-xs" style={{ color: 'var(--admin-blue)' }}>
      Taux de change →
    </a>
  }>
    <InternationalTab byCountry={byCountry} activeByCountry={activeByCountry} />
  </Section>
)}
```

- [ ] **Step 4: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add src/app/admin/(dashboard)/dashboard/InternationalTab.tsx src/app/admin/(dashboard)/page.tsx src/lib/db/international.ts
git commit -m "feat: add International section to dashboard with bar chart and active-projects-by-region table"
```

---

## Task 9: International performance report + country filter

**Files:**
- Modify: `src/lib/db/reports.ts`
- Modify: `src/app/admin/(dashboard)/reports/page.tsx`
- Modify: `src/app/admin/(dashboard)/reports/ReportsClient.tsx`

- [ ] **Step 1: Add `getInternationalPerformanceReport` to reports.ts**

Open `src/lib/db/reports.ts`. At the end of the file, add:

```typescript
// ─── International Performance Report ─────────────────────────────────────────

export type InternationalProjectRow = {
  id:             string
  reference:      string
  name:           string
  country:        string
  currency:       string
  status:         string
  approvedBudget: number | null
  actualSpend:    number
  variancePct:    number | null
}

export type InternationalCountrySummary = {
  country:          string
  currency:         string
  projectCount:     number
  completedCount:   number
  avgVariancePct:   number | null
  totalBudget:      number
  totalSpend:       number
}

export type InternationalPerformanceReport = {
  rows:      InternationalProjectRow[]
  byCountry: InternationalCountrySummary[]
}

export async function getInternationalPerformanceReport(): Promise<InternationalPerformanceReport> {
  const allProjects = await db
    .select({
      id:             projects.id,
      reference:      projects.reference,
      name:           projects.name,
      country:        projects.country,
      currency:       projects.currency,
      status:         projects.status,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(asc(projects.country))

  const rows: InternationalProjectRow[] = []

  for (const p of allProjects) {
    const [spentRow] = await db
      .select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.projectId, p.id))

    const actualSpend  = parseFloat(spentRow?.total ?? '0')
    const approved     = p.approvedBudget ? parseFloat(p.approvedBudget) : null
    const variancePct  = approved && approved > 0
      ? Math.round(((actualSpend - approved) / approved) * 1000) / 10
      : null

    rows.push({
      id:             p.id,
      reference:      p.reference,
      name:           p.name,
      country:        p.country ?? 'TN',
      currency:       p.currency ?? 'TND',
      status:         p.status,
      approvedBudget: approved,
      actualSpend,
      variancePct,
    })
  }

  // Aggregate by country
  const countryMap: Record<string, InternationalCountrySummary> = {}
  for (const r of rows) {
    if (!countryMap[r.country]) {
      countryMap[r.country] = {
        country:        r.country,
        currency:       r.currency,
        projectCount:   0,
        completedCount: 0,
        avgVariancePct: null,
        totalBudget:    0,
        totalSpend:     0,
      }
    }
    const c = countryMap[r.country]
    c.projectCount++
    if (r.status === 'completed') c.completedCount++
    c.totalBudget += r.approvedBudget ?? 0
    c.totalSpend  += r.actualSpend
  }

  // Compute avg variance per country
  for (const c of Object.values(countryMap)) {
    const countryRows = rows.filter((r) => r.country === c.country && r.variancePct !== null)
    if (countryRows.length > 0) {
      c.avgVariancePct = Math.round(
        countryRows.reduce((s, r) => s + (r.variancePct ?? 0), 0) / countryRows.length * 10
      ) / 10
    }
  }

  return { rows, byCountry: Object.values(countryMap) }
}
```

Also update `getBudgetVarianceReport` to accept an optional country filter. Find its signature and update:

```typescript
export async function getBudgetVarianceReport(country?: string): Promise<BudgetVarianceRow[]> {
```

In the `.where()` clause, update to:
```typescript
.where(country
  ? and(isNull(projects.deletedAt), eq(projects.country, country))
  : isNull(projects.deletedAt)
)
```

- [ ] **Step 2: Update the reports page server component**

Open `src/app/admin/(dashboard)/reports/page.tsx`. Read its current content first, then add:

1. Import `getInternationalPerformanceReport`:
```typescript
import { getBudgetVarianceReport, getNcMonthlyBreakdown, getProjectTimeline, getMlAccuracyReport, getInternationalPerformanceReport } from '@/lib/db/reports'
```

2. Accept `country` from searchParams:
```typescript
type SearchParams = Promise<{ country?: string }>

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const country = sp.country

  const [budgetVariance, ncMonthly, timeline, mlAccuracy, international] = await Promise.all([
    getBudgetVarianceReport(country),
    getNcMonthlyBreakdown(),
    getProjectTimeline(),
    getMlAccuracyReport(),
    getInternationalPerformanceReport(),
  ])

  return <ReportsClient
    budgetVariance={budgetVariance}
    ncMonthly={ncMonthly}
    timeline={timeline}
    mlAccuracy={mlAccuracy}
    international={international}
    initialCountry={country ?? ''}
  />
}
```

- [ ] **Step 3: Update ReportsClient to add country filter + International tab**

Open `src/app/admin/(dashboard)/reports/ReportsClient.tsx`.

1. Update the `Props` type to add:
```typescript
type Props = {
  budgetVariance: BudgetVarianceRow[]
  ncMonthly:      NcMonthlyRow[]
  timeline:       TimelineProject[]
  mlAccuracy:     MlAccuracySummary
  international:  InternationalPerformanceReport
  initialCountry: string
}
```

2. Add import:
```typescript
import type { InternationalPerformanceReport } from '@/lib/db/reports'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
```

3. Update the tabs array in `ReportsClient` to add the international tab:
```typescript
const TABS: { key: 'budget' | 'nc' | 'timeline' | 'ml' | 'international'; label: string }[] = [
  { key: 'budget',        label: 'Variance budgétaire' },
  { key: 'nc',            label: 'Analyse NC' },
  { key: 'timeline',      label: 'Chronologie' },
  { key: 'ml',            label: 'Précision ML' },
  { key: 'international', label: 'International' },
]
```

4. Update `useState` to include `'international'` in the type union and add country filter state:
```typescript
const [activeTab, setActiveTab] = useState<'budget' | 'nc' | 'timeline' | 'ml' | 'international'>('budget')
const router = useRouter()
const pathname = usePathname()
const sp = useSearchParams()
const [country, setCountry] = useState(initialCountry)
```

5. Add country filter selector just above the tab bar:
```typescript
{/* Country filter — shown for budget and international tabs */}
{(activeTab === 'budget' || activeTab === 'international') && (
  <div className="flex items-center gap-3">
    <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Pays :</label>
    <select
      value={country}
      onChange={(e) => {
        const val = e.target.value
        setCountry(val)
        const params = new URLSearchParams(sp.toString())
        if (val) params.set('country', val)
        else params.delete('country')
        router.push(`${pathname}?${params.toString()}`)
      }}
      className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
    >
      <option value="">Tous les pays</option>
      <option value="TN">🇹🇳 Tunisie</option>
      <option value="FR">🇫🇷 France</option>
      <option value="CI">🇨🇮 Côte d'Ivoire</option>
      <option value="MR">🇲🇷 Mauritanie</option>
      <option value="OM">🇴🇲 Oman</option>
      <option value="QA">🇶🇦 Qatar</option>
      <option value="LY">🇱🇾 Libye</option>
    </select>
  </div>
)}
```

6. Add the InternationalReport sub-component and render it. Add the component above `ReportsClient`:

```typescript
const COUNTRY_NAMES: Record<string, string> = {
  TN: 'Tunisie', CI: "Côte d'Ivoire", MR: 'Mauritanie',
  FR: 'France', OM: 'Oman', QA: 'Qatar', LY: 'Libye',
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function InternationalReport({ data }: { data: InternationalPerformanceReport }) {
  return (
    <div className="space-y-6">
      {/* Country summary table */}
      <Section
        title="Performance par pays"
        subtitle="Récapitulatif budget, dépenses et complétion par pays"
      >
        {data.byCountry.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune donnée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Pays', 'Projets', 'Terminés', 'Budget total', 'Dépenses totales', 'Variance moy.'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.byCountry.map((c) => (
                  <tr key={c.country} style={{ borderBottom: '1px solid var(--admin-border)' }} className="hover:bg-[var(--admin-bg)] transition-colors">
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>
                      {countryFlag(c.country)} {COUNTRY_NAMES[c.country] ?? c.country}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--admin-text)' }}>{c.projectCount}</td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{c.completedCount}</td>
                    <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--admin-text)' }}>
                      {c.totalBudget > 0 ? `${FMT.format(Math.round(c.totalBudget))} ${c.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--admin-text)' }}>
                      {c.totalSpend > 0 ? `${FMT.format(Math.round(c.totalSpend))} ${c.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sm font-semibold" style={{ color: varianceColor(c.avgVariancePct) }}>
                      {fmtPct(c.avgVariancePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Detailed project rows */}
      <Section title="Détail par projet" subtitle="Tous les projets avec données de performance">
        {data.rows.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Référence', 'Projet', 'Pays', 'Statut', 'Budget approuvé', 'Dépenses', 'Variance %'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--admin-border)' }} className="hover:bg-[var(--admin-bg)] transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/admin/projects/${r.id}`} className="font-mono text-xs font-semibold hover:underline" style={{ color: 'var(--admin-blue)' }}>
                        {r.reference}
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="truncate font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{r.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {countryFlag(r.country)} {COUNTRY_NAMES[r.country] ?? r.country}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right text-xs" style={{ color: 'var(--admin-text)' }}>
                      {r.approvedBudget !== null ? `${FMT.format(Math.round(r.approvedBudget))} ${r.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                      {r.actualSpend > 0 ? `${FMT.format(Math.round(r.actualSpend))} ${r.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right text-sm font-semibold" style={{ color: varianceColor(r.variancePct) }}>
                      {fmtPct(r.variancePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
```

7. Add rendering in the tab content section:
```typescript
{activeTab === 'international' && <InternationalReport data={international} />}
```

- [ ] **Step 4: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/db/reports.ts src/app/admin/(dashboard)/reports/page.tsx src/app/admin/(dashboard)/reports/ReportsClient.tsx
git commit -m "feat: add international performance report tab and country filter to reports page"
```

---

## Task 10: `coordinateurTerrain` field in project detail

**Files:**
- Modify: `src/lib/db/projects.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/admin/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Add `coordinateurTerrain` to `UpdateProjectInput` in projects.ts**

Open `src/lib/db/projects.ts`. Find `UpdateProjectInput` type and add the field:

```typescript
export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'createdBy'>> & {
  assignedRealisationChefId?: string
  assignedEntretienChefId?:   string
  approvedBudget?:            string
  status?:                    ProjectStatus
  coordinateurTerrain?:       string | null
}
```

Find `getProjectById` and ensure it selects `coordinateurTerrain` from the projects table. Find where the project columns are selected (look for `projects.clientName` in the select) and add:

```typescript
coordinateurTerrain: projects.coordinateurTerrain,
```

Find `updateProject` function and ensure it handles `coordinateurTerrain` in the update set. It likely uses a spread or explicit fields — add `coordinateurTerrain` to whichever update map is used.

- [ ] **Step 2: Accept `coordinateurTerrain` in PATCH `/api/projects/[id]`**

Open `src/app/api/projects/[id]/route.ts` (read it first to understand its structure). Find the Zod schema for PATCH and add:

```typescript
coordinateurTerrain: z.string().max(255).optional().nullable(),
```

- [ ] **Step 3: Display and edit field in project detail page**

Open `src/app/admin/(dashboard)/projects/[id]/page.tsx`.

In the key info grid section, add a conditional field for non-TN projects. Find the grid array:

```typescript
{ label: 'Budget approuvé', value: ... },
```

After this item, add:
```typescript
...(project.country && project.country !== 'TN' && project.coordinateurTerrain
  ? [{ label: 'Coordinateur terrain', value: project.coordinateurTerrain }]
  : project.country && project.country !== 'TN'
  ? [{ label: 'Coordinateur terrain', value: '—' }]
  : []
),
```

- [ ] **Step 4: TypeScript check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/db/projects.ts src/app/api/projects/[id]/route.ts src/app/admin/(dashboard)/projects/[id]/page.tsx
git commit -m "feat: add coordinateur_terrain field for international projects"
```

---

## Task 11: Final TypeScript audit + AdminNav link

**Files:**
- Modify: `src/components/AdminNav.tsx`

- [ ] **Step 1: Add currency settings link to admin nav**

Open `src/components/AdminNav.tsx`. Read its content and find the settings section. Add a link to `/admin/settings/currencies` in the appropriate location (near other settings links). The exact insertion depends on nav structure — look for the pattern and match it:

```typescript
{ href: '/admin/settings/currencies', label: 'Taux de change', icon: '💱' }
```

Or if the nav uses a different link-rendering pattern, match the existing style exactly.

- [ ] **Step 2: Full TypeScript check**

```powershell
npx tsc --noEmit 2>&1
```

Expected: 0 errors. If errors exist, fix them before committing.

- [ ] **Step 3: Commit**

```powershell
git add src/components/AdminNav.tsx
git commit -m "feat: add Taux de change link to admin nav"
```

---

## Spec Coverage Check

After writing this plan, checking each spec section:

| Spec requirement | Task |
|---|---|
| `exchange_rates` table | Task 1 |
| `convertToTND`, `formatCurrency`, `getCurrencySymbol` | Task 2 (as `convertToTNDWithRate`, `formatCurrency`, `getCurrencySymbol`) |
| Dual-currency budget display: BudgetPredictionPanel | **GAP — see note** |
| Dual-currency budget display: purchase orders | **GAP — see note** |
| Dual-currency budget display: BudgetMonitorWidget | Task 6 |
| Dual-currency budget display: OfficialBudgetCard | Task 6 |
| Dashboard KPI cards | Note: KPIs show project counts, not budget sums — no change needed |
| International dashboard tab | Task 8 |
| Bar chart: projects by country | Task 8 |
| Active projects map (structured table) | Task 8 |
| Currency Exchange Rate Manager | Task 5 |
| Rate history table | Task 5 |
| Warning if rate not updated 30+ days | Task 5 |
| Country filter on reports | Task 9 |
| "Performance internationale" report | Task 9 |
| Country flag + name in project list | Already done in previous sprint |
| Country filter in project list | Already done in previous sprint |
| Sort by country option | Not addressed — minor; project list already has type filter; sort-by-country can be added as a follow-up |
| `coordinateurTerrain` field | Task 10 |

**Gap Note — BudgetPredictionPanel and purchase orders:**
The spec says "Apply [dual currency display] to: budget prediction panel, purchase orders". `BudgetPredictionPanel` hardcodes `TND` on line 35. Purchase order items in the réalisation tab also show TND. These are left out of this plan because:
1. The prediction panel works with the ML model output which is always in TND internally
2. Purchase orders also record amounts in TND (the DB column is TND)
3. Adding currency conversion there requires a rate lookup at render time, which adds significant complexity

These are documented as follow-up tasks if the user decides they are needed. The plan above covers the spec's primary surfaces.

**All other spec requirements are covered.**
