'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area,
  LineChart, Line, RadialBarChart, RadialBar, Legend,
} from 'recharts'
import type { RseDashboardData } from '@/lib/db/rse-dashboard'

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = ['#1C7A48', '#2563EB', '#B8870A', '#0D9488', '#DC2626', '#7C3AED', '#0891B2', '#65A30D']
const GREEN   = '#1C7A48'
const TEAL    = '#0D9488'
const BLUE    = '#2563EB'
const AMBER   = '#B8870A'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage:       'Nettoyage plage',
  plantation:            'Plantation',
  sensibilisation:       'Sensibilisation',
  team_building:         'Team building',
  journee_environnement: 'Journée env.',
  autre:                 'Autre',
}

const WASTE_TYPE_LABELS: Record<string, string> = {
  papier_carton:     'Papier/Carton',
  plastique:         'Plastique',
  verre:             'Verre',
  metal:             'Métal',
  dechets_verts:     'Déchets verts',
  dechets_chimiques: 'Chim.',
  electronique:      'Électronique',
  autre:             'Autre',
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel:     'Annuel',
  conge_maladie:    'Maladie',
  conge_maternite:  'Maternité',
  conge_paternite:  'Paternité',
  conge_sans_solde: 'Sans solde',
  jour_ferie:       'Jour férié',
  autre:            'Autre',
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  hotel:        'Hôtel',
  municipalite: 'Municipalité',
  entreprise:   'Entreprise',
  institution:  'Institution',
  autre:        'Autre',
}

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle = {
  background:  'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
}

const tooltip = {
  contentStyle: {
    backgroundColor: 'var(--admin-surface)',
    border: '1px solid var(--admin-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--admin-text)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  cursor: { fill: 'rgba(0,0,0,0.04)' },
}

const axis = { fontSize: 11, fill: 'var(--admin-text-muted)' } as const
const grid = { strokeDasharray: '3 3', stroke: 'var(--admin-border)', vertical: false }

// ─── Rounded top bar ──────────────────────────────────────────────────────────

function RoundedBar(props: any) {
  const { x, y, width, height, fill } = props
  if (!height || height <= 0) return null
  const r = Math.min(4, width / 2)
  return (
    <path
      d={`M${x+r},${y} h${width-2*r} a${r},${r} 0 0 1 ${r},${r} v${height-r} h${-width} v${-(height-r)} a${r},${r} 0 0 1 ${r},${-r}z`}
      fill={fill}
    />
  )
}

function EmptyState({ label = 'Aucune donnée disponible' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-[200px]">
      <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border p-5 ${className}`} style={cardStyle}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Chart 1: Yearly waste trend ──────────────────────────────────────────────

export function WasteYearlyChart({ data }: { data: RseDashboardData['environmental']['yearlyTrends'] }) {
  const d = data.map((r) => ({ year: String(r.year), value: r.wasteKg }))
  return (
    <ChartCard title="Déchets collectés par année (kg)" subtitle="Événements RSE">
      {d.length === 0 ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid {...grid} />
            <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => `${v} kg`} />
            <Tooltip {...tooltip} formatter={(v: number) => [`${v.toLocaleString('fr-FR', {maximumFractionDigits:1})} kg`, 'Déchets']} />
            <Bar dataKey="value" shape={<RoundedBar />}>
              {d.map((_, i) => <Cell key={i} fill={GREEN} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ─── Chart 2: Trees per year ──────────────────────────────────────────────────

export function TreesYearlyChart({ data }: { data: RseDashboardData['environmental']['yearlyTrends'] }) {
  const d = data.map((r) => ({ year: String(r.year), value: r.trees }))
  return (
    <ChartCard title="Arbres plantés par année" subtitle="Événements RSE">
      {d.length === 0 ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid {...grid} />
            <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip {...tooltip} formatter={(v: number) => [`${v} arbres`, 'Plantation']} />
            <Bar dataKey="value" shape={<RoundedBar />}>
              {d.map((_, i) => <Cell key={i} fill={TEAL} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ─── Chart 3: Events by type (donut) ─────────────────────────────────────────

export function EventsByTypeChart({ data }: { data: RseDashboardData['environmental']['eventsByType'] }) {
  const d = data.map((r) => ({
    name:  EVENT_TYPE_LABELS[r.eventType] ?? r.eventType,
    value: r.count,
  }))
  return (
    <ChartCard title="Événements par type">
      {d.length === 0 ? <EmptyState /> : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={d} dataKey="value" cx="50%" cy="50%" outerRadius={82} innerRadius={46} paddingAngle={3} strokeWidth={0}>
                {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip {...tooltip} formatter={(v: number, name: string) => [`${v} evt`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-2 flex-1 min-w-0">
            {d.map((item, i) => (
              <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{item.name}</span>
                </div>
                <span className="tabular-nums font-semibold shrink-0" style={{ color: 'var(--admin-text)' }}>{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}

// ─── Chart 4: Participants trend (area) ───────────────────────────────────────

export function ParticipantsTrendChart({ data }: { data: RseDashboardData['environmental']['yearlyTrends'] }) {
  const d = data.map((r) => ({ year: String(r.year), participants: r.participants, events: r.eventCount }))
  return (
    <ChartCard title="Participants par année" subtitle="Évolution de la mobilisation">
      {d.length === 0 ? <EmptyState /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={d} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="participGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BLUE} stopOpacity={0.18} />
                <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={36} />
            <Tooltip {...tooltip} formatter={(v: number, name: string) => [v, name === 'participants' ? 'Participants' : 'Événements']} />
            <Area type="monotone" dataKey="participants" stroke={BLUE} strokeWidth={2} fill="url(#participGrad)" dot={{ r: 3, fill: BLUE, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ─── Chart 5: Internal waste by type (horizontal bar) ────────────────────────

export function WasteByTypeChart({ data }: { data: RseDashboardData['environmental']['wasteByType'] }) {
  const d = data
    .filter((r) => r.totalKg > 0)
    .map((r) => ({
      name:  WASTE_TYPE_LABELS[r.wasteType] ?? r.wasteType,
      value: r.totalKg,
    }))
  return (
    <ChartCard title="Déchets internes par type" subtitle="Traçabilité FOR-MI-11">
      {d.length === 0 ? <EmptyState label="Aucun enregistrement de déchets" /> : (
        <ResponsiveContainer width="100%" height={Math.max(180, d.length * 32)}>
          <BarChart data={d} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
            <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
            <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={100} />
            <Tooltip {...tooltip} formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Quantité']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ─── Chart 6: Monthly waste this year (line) ─────────────────────────────────

export function WasteMonthlyChart({ data, year }: { data: RseDashboardData['environmental']['wasteMonthlyCurrent']; year: number }) {
  const d = data.map((r) => ({
    month: MONTH_SHORT[r.month - 1] ?? String(r.month),
    value: r.totalKg,
  }))
  return (
    <ChartCard title={`Déchets mensuels ${year}`} subtitle="Déchets internes (kg)">
      {d.length === 0 ? <EmptyState label="Aucune donnée pour cette année" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={d} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v} kg`} />
            <Tooltip {...tooltip} formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Déchets']} />
            <Line type="monotone" dataKey="value" stroke={AMBER} strokeWidth={2} dot={{ r: 3, fill: AMBER, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ─── Chart 7: Training by year ────────────────────────────────────────────────

export function TrainingByYearChart({ data }: { data: RseDashboardData['social']['trainingByYear'] }) {
  const d = data.map((r) => ({
    year:         String(r.year),
    sessions:     r.sessions,
    participants: r.participants,
  }))
  return (
    <ChartCard title="Formations par année" subtitle="Sessions réalisées + participants">
      {d.length === 0 ? <EmptyState label="Aucune formation enregistrée" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid {...grid} />
            <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip {...tooltip} />
            <Bar dataKey="participants" name="Participants" radius={[4, 4, 0, 0]} fill={BLUE} />
            <Bar dataKey="sessions" name="Sessions" radius={[4, 4, 0, 0]} fill={GREEN} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ─── Chart 8: Leave by type (donut) ──────────────────────────────────────────

export function LeaveByTypeChart({ data }: { data: RseDashboardData['social']['leaveByType'] }) {
  const d = data
    .filter((r) => r.totalDays > 0)
    .map((r) => ({
      name:  LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType,
      value: r.totalDays,
    }))
  return (
    <ChartCard title="Congés approuvés par type" subtitle="Jours — tous exercices">
      {d.length === 0 ? <EmptyState label="Aucun congé approuvé" /> : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={d} dataKey="value" cx="50%" cy="50%" outerRadius={82} innerRadius={46} paddingAngle={3} strokeWidth={0}>
                {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip {...tooltip} formatter={(v: number) => [`${v.toFixed(1)} j`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-2 flex-1 min-w-0">
            {d.map((item, i) => (
              <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{item.name}</span>
                </div>
                <span className="tabular-nums font-semibold shrink-0" style={{ color: 'var(--admin-text)' }}>{item.value.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}

// ─── Chart 9: Partners by type ────────────────────────────────────────────────

export function PartnersByTypeChart({ data }: { data: RseDashboardData['partnerships']['partnersByType'] }) {
  const d = data.map((r) => ({
    name:  PARTNER_TYPE_LABELS[r.partnerType] ?? r.partnerType,
    value: r.count,
  }))
  return (
    <ChartCard title="Partenaires par type">
      {d.length === 0 ? <EmptyState label="Aucun partenariat enregistré" /> : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={d} dataKey="value" cx="50%" cy="50%" outerRadius={82} innerRadius={46} paddingAngle={3} strokeWidth={0}>
                {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip {...tooltip} formatter={(v: number) => [`${v} partenaire(s)`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-2 flex-1 min-w-0">
            {d.map((item, i) => (
              <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{item.name}</span>
                </div>
                <span className="tabular-nums font-semibold shrink-0" style={{ color: 'var(--admin-text)' }}>{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}

// ─── Chart 10: Beach cleaned per year (line) ─────────────────────────────────

export function BeachCleanedChart({ data }: { data: RseDashboardData['environmental']['yearlyTrends'] }) {
  const d = data.map((r) => ({ year: String(r.year), value: r.beachCleanedM })).filter((r) => r.value > 0)
  return (
    <ChartCard title="Linéaire de plage nettoyé (m)" subtitle="Par année">
      {d.length === 0 ? <EmptyState label="Aucune donnée de nettoyage de plage" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={d} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="beachGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TEAL} stopOpacity={0.18} />
                <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="year" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${v} m`} />
            <Tooltip {...tooltip} formatter={(v: number) => [`${v.toFixed(1)} m`, 'Plage nettoyée']} />
            <Area type="monotone" dataKey="value" stroke={TEAL} strokeWidth={2} fill="url(#beachGrad)" dot={{ r: 3, fill: TEAL, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
