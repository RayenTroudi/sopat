'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'
import { Phone, Mail, Users, Building2, MapPin, Pencil, MessageSquare, Calendar, ArrowRight, Star, TrendingUp, X } from 'lucide-react'
import type { ClientRow, ClientInteractionRow } from '@/lib/db/clients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { DeleteButton } from '@/components/ui/DeleteButton'

type ClientProject = {
  id: string
  reference: string
  name: string
  projectType: string
  status: string
  country: string
  approvedBudget: string | null
  currency: string
  estimatedDeliveryDate: Date | null
  createdAt: Date
}

type SatisfactionRecord = {
  id: string
  score: number
  comments: string | null
  recordedAt: Date
  projectName: string
  projectReference: string
}

type Props = {
  client: ClientRow
  clientProjects: ClientProject[]
  interactions: ClientInteractionRow[]
  satisfaction: SatisfactionRecord[]
  canEdit: boolean
  canDelete: boolean
  canLogInteraction: boolean
  canDeleteInteraction: boolean
  canSeeFullName: boolean
}

const TYPE_COLORS: Record<string, string> = {
  ingenierie_territoriale: '#6366f1',
  espace_public:           '#22c55e',
  siege_social:            '#3b82f6',
  hotelier_touristique:    '#f59e0b',
  residentiel:             '#ec4899',
  interieur:               '#8b5cf6',
}

const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier & touristique',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  entreprise:           'Entreprise',
  institution_publique: 'Institution publique',
  promoteur_immobilier: 'Promoteur immobilier',
  residentiel_prive:    'Résidentiel privé',
  autre:                'Autre',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:       { label: 'Brouillon',   bg: '#f3f4f6', text: '#4b5563' },
  etudes:      { label: 'Études',      bg: '#eff6ff', text: '#1d4ed8' },
  realisation: { label: 'Réalisation', bg: '#fefce8', text: '#a16207' },
  entretien:   { label: 'Entretien',   bg: '#ecfdf5', text: '#047857' },
  completed:   { label: 'Livré',       bg: '#f0fdf4', text: '#15803d' },
  cancelled:   { label: 'Annulé',      bg: '#fef2f2', text: '#b91c1c' },
}

const INTERACTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  appel:       { label: 'Appel',        icon: '📞', color: '#3b82f6' },
  email:       { label: 'Email',        icon: '📧', color: '#8b5cf6' },
  reunion:     { label: 'Réunion',      icon: '🤝', color: '#059669' },
  visite_site: { label: 'Visite site',  icon: '🏗',  color: '#d97706' },
  autre:       { label: 'Autre',        icon: '📋', color: '#6b7280' },
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const full = Math.round(score)
  const cls = size === 'lg' ? 'text-xl' : 'text-sm'
  return (
    <span className={cls}>
      {[1,2,3,4,5].map((n) => (
        <span key={n} style={{ color: n <= full ? '#f59e0b' : 'var(--admin-border)' }}>★</span>
      ))}
    </span>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--admin-border)' }}>
      {icon && <span className="mt-0.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide mb-0.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
        <p className="text-sm break-words" style={{ color: 'var(--admin-text)' }}>{value}</p>
      </div>
    </div>
  )
}

const TABS = [
  { key: 'profil',        label: 'Profil',       icon: Building2 },
  { key: 'projets',       label: 'Projets',      icon: TrendingUp },
  { key: 'interactions',  label: 'Interactions', icon: MessageSquare },
  { key: 'satisfaction',  label: 'Satisfaction', icon: Star },
] as const

type Tab = typeof TABS[number]['key']

const inputCls = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--admin-border-light)]'
const inputSt  = { background: 'var(--admin-bg)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

export function ClientDetailTabs({
  client,
  clientProjects,
  interactions,
  satisfaction,
  canEdit,
  canDelete,
  canLogInteraction,
  canDeleteInteraction,
  canSeeFullName,
}: Props) {
  const [tab, setTab] = useState<Tab>('profil')
  const [showInteractionForm, setShowInteractionForm] = useState(false)
  const [intForm, setIntForm] = useState({
    interactionType: 'appel',
    date: '', summary: '', outcome: '', nextAction: '', nextActionDate: '',
  })
  const [localInteractions, setLocalInteractions]   = useState(interactions)
  const [deletingInteraction, setDeletingInteraction] = useState<string | null>(null)
  const [submitting, setSubmitting]                 = useState(false)
  const [showDeleteClient, setShowDeleteClient]     = useState(false)
  const [deletingClient, setDeletingClient]         = useState(false)

  const displayName =
    !canSeeFullName && client.clientType === 'residentiel_prive'
      ? client.displayName.split(/\s+/).map((w) => (w[0]?.toUpperCase() ?? '') + '.').join(' ')
      : client.displayName

  // Stats
  const byType = clientProjects.reduce<Record<string, number>>((acc, p) => {
    acc[p.projectType] = (acc[p.projectType] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(byType).map(([k, v]) => ({
    name: TYPE_LABELS[k] ?? k, value: v, color: TYPE_COLORS[k] ?? '#a3a3a3',
  }))
  const totalRevenue  = clientProjects.reduce((s, p) => s + (p.approvedBudget ? parseFloat(p.approvedBudget) : 0), 0)
  const activeProjects = clientProjects.filter((p) => !['completed', 'cancelled'].includes(p.status)).length
  const trendData = [...satisfaction].reverse().map((r, i) => ({ i, score: r.score }))
  const avg = satisfaction.length > 0 ? satisfaction.reduce((s, r) => s + r.score, 0) / satisfaction.length : 0

  const tabCounts: Record<Tab, number> = {
    profil: 0,
    projets: clientProjects.length,
    interactions: localInteractions.length,
    satisfaction: satisfaction.length,
  }

  async function submitInteraction() {
    if (!intForm.date || !intForm.summary) return
    setSubmitting(true)
    const res = await fetch(`/api/clients/${client.id}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intForm),
    })
    if (res.ok) {
      const data = await res.json()
      setLocalInteractions([
        { id: data.id, clientId: client.id, interactionType: intForm.interactionType,
          date: intForm.date, summary: intForm.summary, outcome: intForm.outcome || null,
          nextAction: intForm.nextAction || null, nextActionDate: intForm.nextActionDate || null,
          loggedBy: '', loggedByName: null, createdAt: new Date() },
        ...localInteractions,
      ])
      setShowInteractionForm(false)
      setIntForm({ interactionType: 'appel', date: '', summary: '', outcome: '', nextAction: '', nextActionDate: '' })
    }
    setSubmitting(false)
  }

  async function handleDeleteInteraction(id: string) {
    setDeletingInteraction(id)
    const res = await fetch(`/api/clients/${client.id}/interactions/${id}`, { method: 'DELETE' })
    if (res.ok) setLocalInteractions((prev) => prev.filter((i) => i.id !== id))
    setDeletingInteraction(null)
  }

  async function handleDeleteClient() {
    setDeletingClient(true)
    const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    if (res.ok) window.location.href = '/admin/clients'
    else { setDeletingClient(false); setShowDeleteClient(false) }
  }

  return (
    <>
      {/* ── Tab bar ── */}
      <div
        className="flex items-center gap-0.5 border-b overflow-x-auto"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        {TABS.map((t) => {
          const active = tab === t.key
          const count  = tabCounts[t.key]
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors shrink-0"
              style={{ color: active ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none"
                  style={{
                    background: active ? 'var(--admin-emerald-dim)' : 'var(--admin-border)',
                    color: active ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                  }}
                >
                  {count}
                </span>
              )}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                  style={{ background: 'var(--admin-emerald)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Profil ── */}
      {tab === 'profil' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identity card */}
            <div
              className="rounded-xl border p-4 space-y-0.5"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                Identité
              </p>
              <InfoRow label="Raison sociale"    value={client.companyName}  icon={<Building2 className="w-3.5 h-3.5" />} />
              <InfoRow label="Nom d'affichage"   value={displayName} />
              <InfoRow label="Secteur"            value={CLIENT_TYPE_LABELS[client.clientType] ?? client.clientType} />
              <InfoRow label="Pays"               value={client.country}      icon={<MapPin className="w-3.5 h-3.5" />} />
              <InfoRow label="Ville"              value={client.city} />
              <InfoRow label="Adresse"            value={client.address} />
            </div>

            {/* Contacts card */}
            <div
              className="rounded-xl border p-4 space-y-0.5"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                Contacts
              </p>
              <InfoRow label="Contact principal"   value={client.primaryContactName}   icon={<Users className="w-3.5 h-3.5" />} />
              <InfoRow label="Titre"               value={client.primaryContactTitle} />
              <InfoRow label="Email"               value={client.primaryContactEmail}  icon={<Mail className="w-3.5 h-3.5" />} />
              <InfoRow label="Téléphone"           value={client.primaryContactPhone}  icon={<Phone className="w-3.5 h-3.5" />} />
              <InfoRow label="Contact secondaire"  value={client.secondaryContactName} />
              <InfoRow label="Email secondaire"    value={client.secondaryContactEmail} />
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div
              className="rounded-xl border p-4 text-sm leading-relaxed"
              style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                Notes internes
              </p>
              {client.notes}
            </div>
          )}

          {/* DMS code */}
          {client.dmsDocumentCode && (
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>Code DMS</span>
              <span
                className="font-mono text-[11px] px-2 py-0.5 rounded border"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
              >
                {client.dmsDocumentCode}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            {canEdit && (
              <Link
                href={`/admin/clients/${client.id}/edit`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-lg border transition-colors hover:bg-[var(--admin-bg)]"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </Link>
            )}
            {canDelete && (
              <DeleteButton variant="outline" onClick={() => setShowDeleteClient(true)} />
            )}
          </div>
        </div>
      )}

      {/* ── Projets ── */}
      {tab === 'projets' && (
        <div className="space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',   value: clientProjects.length, unit: 'projets' },
              { label: 'Actifs',  value: activeProjects,         unit: 'en cours' },
              { label: 'Budget',  value: totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)} k` : '—', unit: 'TND approuvés' },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                className="rounded-xl border p-3 text-center"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>{value}</p>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{unit}</p>
              </div>
            ))}
          </div>

          {pieData.length > 0 && (
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                Répartition par type
              </p>
              <div className="flex items-center gap-4">
                <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} projet${Number(v) !== 1 ? 's' : ''}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="flex-1 truncate" style={{ color: 'var(--admin-text-muted)' }}>{d.name}</span>
                      <span className="font-medium" style={{ color: 'var(--admin-text)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {clientProjects.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun projet associé à ce client.
            </p>
          ) : (
            <div className="space-y-2">
              {clientProjects.map((p) => {
                const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft
                return (
                  <Link
                    key={p.id}
                    href={`/admin/projects/${p.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm group"
                    style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{p.reference}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {p.approvedBudget && (
                        <p className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                          {parseFloat(p.approvedBudget).toLocaleString('fr-FR')} {p.currency}
                        </p>
                      )}
                      {p.estimatedDeliveryDate && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                          {fmtDate(p.estimatedDeliveryDate)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--admin-text-muted)' }} />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Interactions ── */}
      {tab === 'interactions' && (
        <div className="space-y-4">
          {canLogInteraction && !showInteractionForm && (
            <button
              onClick={() => setShowInteractionForm(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-lg text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ajouter une interaction
            </button>
          )}

          {showInteractionForm && (
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>Nouvelle interaction</p>
                <button onClick={() => setShowInteractionForm(false)} style={{ color: 'var(--admin-text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={intForm.interactionType} onValueChange={(v) => setIntForm({ ...intForm, interactionType: v })}>
                  <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    {Object.entries(INTERACTION_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="date" value={intForm.date} onChange={(e) => setIntForm({ ...intForm, date: e.target.value })} className={inputCls} style={inputSt} />
              </div>
              <textarea placeholder="Résumé *" value={intForm.summary} onChange={(e) => setIntForm({ ...intForm, summary: e.target.value })} rows={3} className={`${inputCls} resize-none`} style={inputSt} />
              <textarea placeholder="Résultat / suite donnée" value={intForm.outcome} onChange={(e) => setIntForm({ ...intForm, outcome: e.target.value })} rows={2} className={`${inputCls} resize-none`} style={inputSt} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Prochaine action" value={intForm.nextAction} onChange={(e) => setIntForm({ ...intForm, nextAction: e.target.value })} className={inputCls} style={inputSt} />
                <input type="date" value={intForm.nextActionDate} onChange={(e) => setIntForm({ ...intForm, nextActionDate: e.target.value })} className={inputCls} style={inputSt} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => void submitInteraction()} disabled={submitting || !intForm.date || !intForm.summary} className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button onClick={() => setShowInteractionForm(false)} className="text-sm px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {localInteractions.length === 0 ? (
            <div className="py-10 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--admin-text)' }} />
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune interaction enregistrée.</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px" style={{ background: 'var(--admin-border)' }} />
              <div className="space-y-3">
                {localInteractions.map((interaction) => {
                  const conf = INTERACTION_CONFIG[interaction.interactionType] ?? INTERACTION_CONFIG.autre
                  const isPast = interaction.nextActionDate && new Date(interaction.nextActionDate) < new Date()
                  return (
                    <div key={interaction.id} className="relative">
                      <div
                        className="absolute -left-4 top-3 w-5 h-5 rounded-full flex items-center justify-center text-[11px] border-2 shrink-0"
                        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                      >
                        {conf.icon}
                      </div>
                      <div
                        className="rounded-xl border p-3.5 space-y-2"
                        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-semibold" style={{ color: conf.color }}>{conf.label}</span>
                            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                              <Calendar className="w-3 h-3" />
                              {fmtDate(interaction.date)}
                            </span>
                            {interaction.loggedByName && (
                              <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>· {interaction.loggedByName}</span>
                            )}
                          </div>
                          {canDeleteInteraction && (
                            <button
                              onClick={() => void handleDeleteInteraction(interaction.id)}
                              disabled={deletingInteraction === interaction.id}
                              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--admin-red-dim)] disabled:opacity-40"
                              style={{ color: 'var(--admin-text-muted)' }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>{interaction.summary}</p>
                        {interaction.outcome && (
                          <p className="text-[12px] italic" style={{ color: 'var(--admin-text-muted)' }}>{interaction.outcome}</p>
                        )}
                        {interaction.nextAction && (
                          <div
                            className="flex items-center gap-2 text-[12px] px-2.5 py-1.5 rounded-lg"
                            style={{
                              background: isPast ? 'rgba(185,28,28,0.06)' : 'var(--admin-bg)',
                              color: isPast ? '#b91c1c' : 'var(--admin-text-muted)',
                              border: `1px solid ${isPast ? 'rgba(185,28,28,0.15)' : 'var(--admin-border)'}`,
                            }}
                          >
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span>{interaction.nextAction}</span>
                            {interaction.nextActionDate && <span>· {fmtDate(interaction.nextActionDate)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Satisfaction ── */}
      {tab === 'satisfaction' && (
        <div className="space-y-5">
          {satisfaction.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--admin-text)' }} />
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune évaluation de satisfaction.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Les évaluations sont liées depuis les fiches projet.</p>
            </div>
          ) : (
            <>
              {/* Score summary */}
              <div
                className="rounded-xl border p-4 flex items-center gap-5"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
              >
                <div className="text-center shrink-0">
                  <p className="text-3xl font-bold" style={{ color: 'var(--admin-text)' }}>{avg.toFixed(1)}</p>
                  <Stars score={avg} size="lg" />
                  <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                    {satisfaction.length} évaluation{satisfaction.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {trendData.length > 1 && (
                  <div className="flex-1" style={{ height: 60 }}>
                    <ResponsiveContainer>
                      <LineChart data={trendData}>
                        <Line type="monotone" dataKey="score" stroke="var(--admin-emerald)" strokeWidth={2} dot={false} />
                        <YAxis domain={[0, 5]} hide />
                        <XAxis hide />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {satisfaction.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border p-3.5 flex items-start gap-3"
                    style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{r.projectReference}</span>
                        <Stars score={r.score} />
                        <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{fmtDate(r.recordedAt)}</span>
                      </div>
                      <p className="text-sm mt-0.5 font-medium truncate" style={{ color: 'var(--admin-text)' }}>{r.projectName}</p>
                      {r.comments && <p className="text-[12px] mt-1 italic" style={{ color: 'var(--admin-text-muted)' }}>{r.comments}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete client modal */}
      <DeleteModal
        open={showDeleteClient}
        title="Supprimer le client ?"
        description={<><strong>{displayName}</strong> sera archivé. Ses projets, interactions et évaluations restent accessibles mais ne seront plus modifiables.</>}
        loading={deletingClient}
        onConfirm={() => void handleDeleteClient()}
        onClose={() => setShowDeleteClient(false)}
      />
    </>
  )
}
