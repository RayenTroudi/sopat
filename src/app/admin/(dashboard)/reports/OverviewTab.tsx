'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts'
import type { PlatformOverview } from '@/lib/db/reports-overview'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtTnd = (n: number) => `${FMT.format(n)} TND`

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', etudes: 'Études', realisation: 'Réalisation',
  entretien: 'Entretien', completed: 'Terminé', cancelled: 'Annulé',
}
const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale', espace_public: 'Espace public',
  siege_social: 'Siège social', hotelier_touristique: 'Hôtelier & touristique',
  residentiel: 'Résidentiel', interieur: 'Intérieur',
}
const OFFER_LABELS: Record<string, string> = {
  en_preparation: 'En préparation', envoyee: 'Envoyée', en_negociation: 'En négociation',
  gagnee: 'Gagnée', perdue: 'Perdue', annulee: 'Annulée',
}
const OFFER_COLORS: Record<string, string> = {
  en_preparation: '#94A3B8', envoyee: '#2563EB', en_negociation: '#D97706',
  gagnee: '#1C7A48', perdue: '#DC2626', annulee: '#64748B',
}
const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8', etudes: '#2D5A27', realisation: '#D97706',
  entretien: '#2563EB', completed: '#16A34A', cancelled: '#64748B',
}

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      {children}
    </div>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1" style={{ color: color ?? 'var(--admin-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{sub}</p>}
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function OverviewTab({ overview, year }: { overview: PlatformOverview; year: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const { projects, money, monthlySpend, offersByStatus } = overview

  const currentYear = new Date().getFullYear()
  const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const statusData = projects.byStatus.map((r) => ({
    name: STATUS_LABELS[r.status] ?? r.status, count: r.count, color: STATUS_COLORS[r.status] ?? '#94A3B8',
  }))
  const typeData = projects.byType.map((r) => ({
    name: TYPE_LABELS[r.projectType] ?? r.projectType, count: r.count,
  }))
  const spendData = monthlySpend.map((r, i) => ({ name: MONTH_SHORT[i], total: r.total }))
  const offerData = offersByStatus.map((r) => ({
    name: OFFER_LABELS[r.status] ?? r.status, count: r.count, amount: r.amount,
    color: OFFER_COLORS[r.status] ?? '#94A3B8',
  }))

  return (
    <div className="space-y-5">
      {/* Projets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Projets (total)" value={String(projects.total)} sub="cumul" />
        <Kpi label="Projets actifs" value={String(projects.active)} sub="études · réalisation · entretien" color="var(--admin-amber)" />
        <Kpi label="Projets terminés" value={String(projects.completed)} color="var(--admin-emerald)" />
        <Kpi label="Projets annulés" value={String(projects.cancelled)} color="var(--admin-text-muted)" />
      </div>

      {/* Argent — trois lectures distinctes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Contracté" value={fmtTnd(money.contracted)} sub="Σ budgets approuvés · cumul" />
        <Kpi label="Facturé" value={fmtTnd(money.invoiced)} sub="factures − avoirs · cumul" />
        <Kpi label="Encaissé" value={fmtTnd(money.collected)} sub="encaissements clients · cumul" color="var(--admin-emerald)" />
        <Kpi
          label="Offres gagnées" value={fmtTnd(money.offersWon)}
          sub={money.winRatePct !== null ? `taux de réussite ${money.winRatePct}%` : 'aucune offre décidée'}
        />
        <Kpi label="Dépensé" value={fmtTnd(money.spent)} sub="bons d'achat + extra dépenses · cumul" color="var(--admin-red)" />
        <Kpi
          label="Marge brute"
          value={money.margin !== null ? fmtTnd(money.margin) : '—'}
          sub={money.marginPct !== null ? `${money.marginPct}% du contracté` : 'budget contracté requis'}
          color={money.margin !== null && money.margin < 0 ? 'var(--admin-red)' : 'var(--admin-emerald)'}
        />
      </div>

      {/* Sélecteur d'année (dépenses mensuelles) */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Année des graphiques :</span>
        <Select value={String(year)} onValueChange={(v) => router.push(`${pathname}?year=${v}`)}>
          <SelectTrigger className="text-xs h-8 w-28 bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`Dépenses mensuelles ${year}`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={spendData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtTnd(Number(v))} />
              <Line type="monotone" dataKey="total" name="Dépenses" stroke="#2D5A27" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Offres commerciales par statut (cumul)">
          {offerData.length === 0 ? (
            <p className="text-sm text-center py-16" style={{ color: 'var(--admin-text-muted)' }}>
              Aucune offre commerciale enregistrée.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={offerData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
                <Tooltip formatter={(v, name) => name === 'Montant' ? fmtTnd(Number(v)) : v} />
                <Bar dataKey="count" name="Nombre">
                  {offerData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Projets par statut">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip />
              <Bar dataKey="count" name="Projets">
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Projets par type">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip />
              <Bar dataKey="count" name="Projets" fill="#2D5A27" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
