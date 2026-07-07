'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, AreaChart, DonutChart, BarList } from '@tremor/react'
import { useToast } from '@/components/ui/Toast'
import { PROJECT_TYPE_LABEL_FR, PROJECT_TYPE_VALUES } from '@/lib/design-vocab'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AchievementsPayload = {
  current: {
    parcsUrbains:           number
    espacesVertsPublics:    number
    hotelsResorts:          number
    residencesAppartements: number
    villasPrivees:          number
    siegesSociaux:          number
    projetsInternationaux:  number
    anneesExperience:       number
  }
  previousYear: AchievementsPayload['current']
  rse: {
    wasteCollectedKg:   number
    treesPlanted:       number
    participants:       number
    activePartnerships: number
  }
  quality: {
    onTimeDeliveryRate:  number | null
    satisfactionAverage: number | null
    ncOnTimeClosureRate: number | null
  }
  evolution: { year: number; byType: Record<string, number>; revenueTND: number }[]
  geo: { country: string; continent: string; completedCount: number; activeCount: number; totalValueTND: number }[]
  sectors: { sector: string; count: number }[]
  topClients: { clientName: string; totalValueTND: number; projectCount: number }[]
  retentionRate: number | null
  generatedAt: string
}

const SOPAT_GREEN = '#2D5A27'
const SOPAT_GREEN_LIGHT = '#E8F0E6'
const SECTOR_COLORS = ['#2D5A27', '#5E8C49', '#A3C585', '#D6E5C2', '#8AAD6A', '#3E6B33', '#B7CFA3', '#6F9655']

// ── French number formatting ──
const NF = new Intl.NumberFormat('fr-FR')
const NF_DEC = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 0 })
function fmt(n: number) { return NF.format(Math.round(n)) }
function fmtTND(n: number) { return NF.format(Math.round(n)) + ' DT' }
function fmtPct(n: number | null) { return n === null ? '—' : NF_DEC.format(n) + ' %' }

// ── Country meta ──
const COUNTRY_FR: Record<string, string> = {
  TN: 'Tunisie', LY: 'Libye', SN: 'Sénégal', CI: "Côte d'Ivoire", MA: 'Maroc', DZ: 'Algérie', EG: 'Égypte',
  FR: 'France',  IT: 'Italie', ES: 'Espagne', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  QA: 'Qatar', AE: 'Émirats arabes unis', SA: 'Arabie saoudite', OM: 'Oman', KW: 'Koweït', BH: 'Bahreïn',
}
function flagEmoji(code: string) {
  if (!code || code.length !== 2) return '🏳️'
  const A = 0x1F1E6
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65))
}

// ── Count-up animation ──
function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    let raf = 0
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return value
}

function MetricCard({
  value, label, trend, suffix,
}: {
  value: number
  label: string
  trend?: number  // diff vs last year
  suffix?: string
}) {
  const anim = useCountUp(value)
  const displayValue = Number.isInteger(value) ? Math.round(anim) : anim
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        boxShadow: '0 1px 0 rgba(45,90,39,0.04)',
      }}
    >
      <div className="flex items-baseline gap-1">
        <span className="font-semibold leading-none" style={{ fontSize: 36, color: SOPAT_GREEN }}>
          {fmt(displayValue)}
        </span>
        {suffix && <span className="text-sm" style={{ color: SOPAT_GREEN }}>{suffix}</span>}
      </div>
      <div className="mt-2 text-xs leading-tight" style={{ color: 'var(--admin-text)' }}>{label}</div>
      {trend !== undefined && trend !== 0 && (
        <div
          className="mt-1 text-[11px]"
          style={{ color: trend > 0 ? 'var(--admin-emerald)' : 'var(--admin-red)' }}
        >
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)} vs {new Date().getFullYear() - 1}
        </div>
      )}
    </div>
  )
}

export function AchievementsClient({ initialData }: { initialData: AchievementsPayload }) {
  const toast = useToast()
  const [data, setData] = useState(initialData)
  const [yearFrom, setYearFrom] = useState(2021)
  const [yearTo, setYearTo] = useState(new Date().getFullYear())
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (yearFrom === 2021 && yearTo === new Date().getFullYear()) return
    fetch(`/api/direction/achievements?yearFrom=${yearFrom}&yearTo=${yearTo}`)
      .then((r) => r.json())
      .then((d) => setData((prev) => ({ ...prev, evolution: d.evolution })))
      .catch(() => toast.error('Échec du chargement de la période.'))
  }, [yearFrom, yearTo, toast])

  const { current, previousYear, rse, quality } = data

  const evolutionChart = useMemo(() => {
    return data.evolution.map((y) => ({
      year: y.year,
      ...Object.fromEntries(PROJECT_TYPE_VALUES.map((t) => [t, y.byType[t] ?? 0])),
      revenueTND: y.revenueTND,
    }))
  }, [data.evolution])

  const continents = useMemo(() => {
    const map = new Map<string, typeof data.geo>()
    for (const row of data.geo) {
      const list = map.get(row.continent) ?? []
      list.push(row)
      map.set(row.continent, list)
    }
    return Array.from(map.entries())
  }, [data.geo])

  async function exportKeyFigures() {
    setBusy('key-figures')
    try {
      const res = await fetch('/api/direction/exports/key-figures', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Échec export')
      window.open(j.url, '_blank', 'noopener')
      toast.success('Chiffres clés exportés.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function exportAnnualRse() {
    setBusy('annual-rse')
    try {
      const year = new Date().getFullYear()
      const res = await fetch(`/api/direction/exports/annual-rse?year=${year}`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Échec export')
      window.open(j.url, '_blank', 'noopener')
      toast.success(`Rapport RSE ${year} généré.`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function saveSnapshot() {
    setBusy('snapshot')
    try {
      const res = await fetch('/api/direction/achievements', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Échec sauvegarde')
      toast.success(`Snapshot enregistré (${j.snapshotDate}).`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="space-y-8 -m-6 p-6 min-h-full"
      style={{ background: `linear-gradient(180deg, ${SOPAT_GREEN_LIGHT} 0%, var(--admin-bg) 280px)` }}
    >
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: SOPAT_GREEN }}>
            Réalisations & analytics
          </h1>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Tableau de bord Direction · données générées le {new Date(data.generatedAt).toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={exportKeyFigures} busy={busy === 'key-figures'}>📄 Exporter les chiffres clés</ActionButton>
          <ActionButton onClick={exportAnnualRse} busy={busy === 'annual-rse'}>🌱 Exporter le rapport annuel RSE</ActionButton>
          <ActionButton onClick={saveSnapshot} busy={busy === 'snapshot'}>📸 Mettre à jour les métriques portfolio</ActionButton>
        </div>
      </header>

      {/* SECTION 1 — Réalisations en chiffres */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: SOPAT_GREEN }}>Nos Réalisations en Chiffres</h2>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <MetricCard value={current.parcsUrbains}           label="Parcs urbains"            trend={current.parcsUrbains - previousYear.parcsUrbains} />
          <MetricCard value={current.espacesVertsPublics}    label="Espaces verts publics"    trend={current.espacesVertsPublics - previousYear.espacesVertsPublics} />
          <MetricCard value={current.hotelsResorts}          label="Hôtels & Resorts"         trend={current.hotelsResorts - previousYear.hotelsResorts} />
          <MetricCard value={current.residencesAppartements} label="Résidences & Appartements" trend={current.residencesAppartements - previousYear.residencesAppartements} />
          <MetricCard value={current.villasPrivees}          label="Villas privées"           trend={current.villasPrivees - previousYear.villasPrivees} />
          <MetricCard value={current.siegesSociaux}          label="Sièges sociaux"           trend={current.siegesSociaux - previousYear.siegesSociaux} />
          <MetricCard value={current.projetsInternationaux}  label="Projets internationaux"   trend={current.projetsInternationaux - previousYear.projetsInternationaux} />
          <MetricCard value={current.anneesExperience}       label="Années d'expérience" />
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <MetricCard value={rse.wasteCollectedKg}   label="Kg de déchets collectés"   suffix="kg" />
          <MetricCard value={rse.treesPlanted}       label="Arbres plantés (événements RSE)" />
          <MetricCard value={rse.participants}       label="Participants à nos événements RSE" />
          <MetricCard value={rse.activePartnerships} label="Partenariats RSE actifs" />
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          <RateCard label="Livraison dans les délais" value={quality.onTimeDeliveryRate} />
          <RateCard label="Score satisfaction client moyen" value={quality.satisfactionAverage} unit="" decimals={1} />
          <RateCard label="NC clôturées dans les délais" value={quality.ncOnTimeClosureRate} />
        </div>
      </section>

      {/* SECTION 2 — Évolution par année */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold" style={{ color: SOPAT_GREEN }}>Évolution par année</h2>
          <YearRange yearFrom={yearFrom} yearTo={yearTo} onChange={(f, t) => { setYearFrom(f); setYearTo(t) }} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Projets démarrés par type">
            <BarChart
              data={evolutionChart.map((y) => {
                const row: Record<string, string | number> = { annee: String(y.year) }
                PROJECT_TYPE_VALUES.forEach((t) => { row[PROJECT_TYPE_LABEL_FR[t] ?? t] = (y as Record<string, number>)[t] ?? 0 })
                return row
              })}
              index="annee"
              categories={PROJECT_TYPE_VALUES.map((t) => PROJECT_TYPE_LABEL_FR[t] ?? t)}
              colors={['emerald', 'teal', 'blue', 'amber', 'rose', 'slate', 'violet', 'cyan']}
              valueFormatter={(v) => fmt(v)}
              stack={true}
              showLegend={true}
              showGridLines={false}
              className="h-72"
            />
          </ChartCard>

          <ChartCard title="Chiffre d'affaires (equivalent TND)">
            <AreaChart
              data={evolutionChart.map((y) => ({ annee: String(y.year), CA: y.revenueTND }))}
              index="annee"
              categories={['CA']}
              colors={['emerald']}
              valueFormatter={(v) => fmtTND(v)}
              showLegend={false}
              showGridLines={false}
              className="h-72"
            />
          </ChartCard>
        </div>
      </section>

      {/* SECTION 3 — Présence géographique */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: SOPAT_GREEN }}>Présence géographique</h2>
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          {continents.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun projet enregistré.
            </div>
          )}
          {continents.map(([continent, rows]) => (
            <div key={continent}>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ background: SOPAT_GREEN_LIGHT, color: SOPAT_GREEN }}>
                {continent}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--admin-text-muted)' }}>
                    <th className="text-left px-4 py-2 font-medium">Pays</th>
                    <th className="text-right px-4 py-2 font-medium">Projets livrés</th>
                    <th className="text-right px-4 py-2 font-medium">Projets actifs</th>
                    <th className="text-right px-4 py-2 font-medium">Valeur totale (TND)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.country} style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-2" style={{ color: 'var(--admin-text)' }}>
                        <span className="mr-2">{flagEmoji(r.country)}</span>
                        {COUNTRY_FR[r.country] ?? r.country}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--admin-text)' }}>{fmt(r.completedCount)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--admin-text-muted)' }}>{fmt(r.activeCount)}</td>
                      <td className="px-4 py-2 text-right font-medium" style={{ color: SOPAT_GREEN }}>{fmtTND(r.totalValueTND)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — Clients & secteurs */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: SOPAT_GREEN }}>Clients & Secteurs</h2>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Projets par secteur client">
            {data.sectors.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <DonutChart
                  data={data.sectors.map((s) => ({ name: s.sector, value: s.count }))}
                  category="value"
                  index="name"
                  colors={['emerald', 'teal', 'blue', 'amber', 'rose', 'slate', 'violet', 'cyan']}
                  valueFormatter={(v) => `${fmt(v)} proj.`}
                  showLabel={false}
                  className="h-48 w-48"
                />
                <ul className="w-full space-y-1">
                  {data.sectors.map((s) => (
                    <li key={s.sector} className="flex items-center justify-between text-xs">
                      <span className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{s.sector}</span>
                      <span className="tabular-nums font-medium ml-2" style={{ color: 'var(--admin-text)' }}>{fmt(s.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Top 10 clients par valeur (TND)" className="lg:col-span-2">
            {data.topClients.length === 0 ? (
              <EmptyChart />
            ) : (
              <BarList
                data={data.topClients.map((c) => ({ name: c.clientName, value: c.totalValueTND }))}
                valueFormatter={(v: number) => fmtTND(v)}
                color="emerald"
              />
            )}
          </ChartCard>
        </div>

        <div className="mt-4">
          <div
            className="rounded-lg p-5 inline-flex items-baseline gap-3"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <span className="text-3xl font-semibold" style={{ color: SOPAT_GREEN }}>{fmtPct(data.retentionRate)}</span>
            <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
              Taux de fidélisation client (clients avec 2 projets et plus)
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

function ActionButton({ onClick, busy, children }: { onClick: () => void; busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-sm px-3 py-2 rounded font-medium"
      style={{
        background: SOPAT_GREEN,
        color: '#fff',
        border: '1px solid ' + SOPAT_GREEN,
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? 'En cours…' : children}
    </button>
  )
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={'rounded-lg p-4 ' + (className ?? '')}
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--admin-text-muted)' }}>{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>
      Aucune donnée à afficher.
    </div>
  )
}

function RateCard({ label, value, unit = '%', decimals = 1 }: { label: string; value: number | null; unit?: string; decimals?: number }) {
  return (
    <div className="rounded-lg p-5" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
      <div className="flex items-baseline gap-1">
        <span className="font-semibold leading-none" style={{ fontSize: 32, color: SOPAT_GREEN }}>
          {value === null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(value)}
        </span>
        {value !== null && unit && <span className="text-sm" style={{ color: SOPAT_GREEN }}>{unit}</span>}
      </div>
      <div className="mt-2 text-xs" style={{ color: 'var(--admin-text)' }}>{label}</div>
    </div>
  )
}

function YearRange({ yearFrom, yearTo, onChange }: { yearFrom: number; yearTo: number; onChange: (f: number, t: number) => void }) {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = 2018; y <= currentYear; y++) years.push(y)
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
      <span>De</span>
      <Select value={String(yearFrom)} onValueChange={(v) => onChange(parseInt(v, 10), yearTo)}>
        <SelectTrigger className="h-8 text-xs bg-[#F4F8F5] w-20" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
      <span>à</span>
      <Select value={String(yearTo)} onValueChange={(v) => onChange(yearFrom, parseInt(v, 10))}>
        <SelectTrigger className="h-8 text-xs bg-[#F4F8F5] w-20" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
