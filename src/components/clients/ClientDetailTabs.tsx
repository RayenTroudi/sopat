'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'
import type { ClientRow, ClientInteractionRow } from '@/lib/db/clients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  espace_public: '#22c55e',
  siege_social: '#3b82f6',
  hotelier_touristique: '#f59e0b',
  residentiel: '#ec4899',
  interieur: '#8b5cf6',
}

const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public: 'Espace public',
  siege_social: 'Siège social',
  hotelier_touristique: 'Hôtelier & touristique',
  residentiel: 'Résidentiel',
  interieur: 'Intérieur',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:       { label: 'Brouillon',   bg: '#f3f4f6', text: '#4b5563' },
  etudes:      { label: 'Études',      bg: '#eff6ff', text: '#1d4ed8' },
  realisation: { label: 'Réalisation', bg: '#fefce8', text: '#a16207' },
  entretien:   { label: 'Entretien',   bg: '#ecfdf5', text: '#047857' },
  completed:   { label: 'Livré',       bg: '#f0fdf4', text: '#15803d' },
  cancelled:   { label: 'Annulé',      bg: '#fef2f2', text: '#b91c1c' },
}

const INTERACTION_CONFIG: Record<string, { label: string; icon: string }> = {
  appel:       { label: 'Appel',       icon: '📞' },
  email:       { label: 'Email',       icon: '📧' },
  reunion:     { label: 'Réunion',     icon: '🤝' },
  visite_site: { label: 'Visite site', icon: '🏗' },
  autre:       { label: 'Autre',       icon: '📋' },
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ score }: { score: number }) {
  const full = Math.round(score)
  return (
    <span className="text-yellow-400">
      {'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}
    </span>
  )
}

const TABS = [
  { key: 'profil', label: 'Profil' },
  { key: 'projets', label: 'Projets' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'satisfaction', label: 'Satisfaction' },
] as const

type Tab = typeof TABS[number]['key']

const inputCls = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none'
const inputSt = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

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
    date: '',
    summary: '',
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  })
  const [localInteractions, setLocalInteractions] = useState(interactions)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const displayName =
    !canSeeFullName && client.clientType === 'residentiel_prive'
      ? client.displayName.split(/\s+/).map((w) => (w[0]?.toUpperCase() ?? '') + '.').join(' ')
      : client.displayName

  const byType = clientProjects.reduce<Record<string, number>>((acc, p) => {
    acc[p.projectType] = (acc[p.projectType] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(byType).map(([k, v]) => ({
    name: TYPE_LABELS[k] ?? k,
    value: v,
    color: TYPE_COLORS[k] ?? '#a3a3a3',
  }))

  const totalRevenue = clientProjects.reduce(
    (s, p) => s + (p.approvedBudget ? parseFloat(p.approvedBudget) : 0),
    0
  )
  const activeProjects = clientProjects.filter(
    (p) => !['completed', 'cancelled'].includes(p.status)
  ).length

  const trendData = [...satisfaction].reverse().map((r, i) => ({ i, score: r.score }))
  const avg =
    satisfaction.length > 0
      ? satisfaction.reduce((s, r) => s + r.score, 0) / satisfaction.length
      : 0

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
        {
          id: data.id,
          clientId: client.id,
          interactionType: intForm.interactionType,
          date: intForm.date,
          summary: intForm.summary,
          outcome: intForm.outcome || null,
          nextAction: intForm.nextAction || null,
          nextActionDate: intForm.nextActionDate || null,
          loggedBy: '',
          loggedByName: null,
          createdAt: new Date(),
        },
        ...localInteractions,
      ])
      setShowInteractionForm(false)
      setIntForm({ interactionType: 'appel', date: '', summary: '', outcome: '', nextAction: '', nextActionDate: '' })
    }
    setSubmitting(false)
  }

  async function handleDeleteInteraction(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/clients/${client.id}/interactions/${id}`, { method: 'DELETE' })
    if (res.ok) setLocalInteractions(localInteractions.filter((i) => i.id !== id))
    setDeleting(null)
  }

  async function handleDeleteClient() {
    if (!confirm(`Supprimer le client "${displayName}" ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    if (res.ok) window.location.href = '/admin/clients'
  }

  const tabLabels: Record<Tab, string> = {
    profil: 'Profil',
    projets: `Projets (${clientProjects.length})`,
    interactions: `Interactions (${localInteractions.length})`,
    satisfaction: `Satisfaction (${satisfaction.length})`,
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t.key ? 'var(--admin-emerald)' : 'transparent',
              color: tab === t.key ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
            }}
          >
            {tabLabels[t.key]}
          </button>
        ))}
      </div>

      {/* ── Profil ── */}
      {tab === 'profil' && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 flex-1 text-sm">
              {([
                ['Raison sociale', client.companyName],
                ["Nom d'affichage", displayName],
                ['Secteur', client.clientType],
                ['Pays', client.country],
                ['Ville', client.city],
                ['Adresse', client.address],
                ['Contact principal', client.primaryContactName],
                ['Titre', client.primaryContactTitle],
                ['Email', client.primaryContactEmail],
                ['Téléphone', client.primaryContactPhone],
                ['Contact secondaire', client.secondaryContactName],
                ['Email secondaire', client.secondaryContactEmail],
              ] as [string, string | null | undefined][]).map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                      {label}
                    </p>
                    <p style={{ color: 'var(--admin-text)' }}>{value}</p>
                  </div>
                ) : null
              )}
            </div>
            {client.logoUrl && (
              <img
                src={client.logoUrl}
                alt={displayName}
                className="w-20 h-20 rounded-xl object-contain border shrink-0"
                style={{ borderColor: 'var(--admin-border)' }}
              />
            )}
          </div>

          {client.notes && (
            <div
              className="rounded-lg p-4 text-sm"
              style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
            >
              {client.notes}
            </div>
          )}

          <div className="flex items-center gap-3">
            {canEdit && (
              <Link
                href={`/admin/clients/${client.id}/edit`}
                className="text-sm font-medium px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                Modifier
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDeleteClient}
                className="text-sm font-medium px-4 py-2 rounded-lg border text-[#2F6F4F] border-[#C2D5C9] hover:bg-[#EDF3EF] transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Projets ── */}
      {tab === 'projets' && (
        <div className="space-y-6">
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="font-semibold text-lg" style={{ color: 'var(--admin-text)' }}>
                {clientProjects.length}
              </span>
              <span className="ml-1" style={{ color: 'var(--admin-text-muted)' }}>projets</span>
            </div>
            <div>
              <span className="font-semibold text-lg" style={{ color: 'var(--admin-text)' }}>
                {activeProjects}
              </span>
              <span className="ml-1" style={{ color: 'var(--admin-text-muted)' }}>actifs</span>
            </div>
            <div>
              <span className="font-semibold text-lg" style={{ color: 'var(--admin-text)' }}>
                {totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)} k` : '—'}
              </span>
              <span className="ml-1" style={{ color: 'var(--admin-text-muted)' }}>TND approuvés</span>
            </div>
          </div>

          {pieData.length > 0 && (
            <div style={{ height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      typeof value === 'number' ? `${value} projet${value !== 1 ? 's' : ''}` : String(value ?? ''),
                      '',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {clientProjects.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun projet associé à ce client.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clientProjects.map((p) => {
                const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft
                return (
                  <Link
                    key={p.id}
                    href={`/admin/projects/${p.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border transition-shadow hover:shadow-sm"
                    style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {p.reference}
                      </p>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                        {p.approvedBudget && (
                          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            {parseFloat(p.approvedBudget).toLocaleString('fr-FR')} {p.currency}
                          </span>
                        )}
                      </div>
                    </div>
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
          {canLogInteraction && (
            <div>
              {!showInteractionForm ? (
                <button
                  onClick={() => setShowInteractionForm(true)}
                  className="text-sm font-medium px-4 py-2 rounded-lg"
                  style={{ background: 'var(--admin-emerald)', color: '#fff' }}
                >
                  + Ajouter une interaction
                </button>
              ) : (
                <div
                  className="rounded-xl border p-4 space-y-3"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={intForm.interactionType}
                      onValueChange={(v) => setIntForm({ ...intForm, interactionType: v })}
                    >
                      <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                        {Object.entries(INTERACTION_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="date"
                      value={intForm.date}
                      onChange={(e) => setIntForm({ ...intForm, date: e.target.value })}
                      className={inputCls}
                      style={inputSt}
                    />
                  </div>
                  <textarea
                    placeholder="Résumé *"
                    value={intForm.summary}
                    onChange={(e) => setIntForm({ ...intForm, summary: e.target.value })}
                    rows={3}
                    className={inputCls}
                    style={inputSt}
                  />
                  <textarea
                    placeholder="Résultat / suite donnée"
                    value={intForm.outcome}
                    onChange={(e) => setIntForm({ ...intForm, outcome: e.target.value })}
                    rows={2}
                    className={inputCls}
                    style={inputSt}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Prochaine action"
                      value={intForm.nextAction}
                      onChange={(e) => setIntForm({ ...intForm, nextAction: e.target.value })}
                      className={inputCls}
                      style={inputSt}
                    />
                    <input
                      type="date"
                      value={intForm.nextActionDate}
                      onChange={(e) => setIntForm({ ...intForm, nextActionDate: e.target.value })}
                      className={inputCls}
                      style={inputSt}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={submitInteraction}
                      disabled={submitting || !intForm.date || !intForm.summary}
                      className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{ background: 'var(--admin-emerald)' }}
                    >
                      {submitting ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => setShowInteractionForm(false)}
                      className="text-sm px-4 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {localInteractions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucune interaction enregistrée.
            </p>
          ) : (
            <div className="relative">
              <div
                className="absolute left-4 top-0 bottom-0 w-px"
                style={{ background: 'var(--admin-border)' }}
              />
              <div className="space-y-4">
                {localInteractions.map((interaction) => {
                  const conf = INTERACTION_CONFIG[interaction.interactionType] ?? INTERACTION_CONFIG.autre
                  const isPastNextAction =
                    interaction.nextActionDate && new Date(interaction.nextActionDate) < new Date()
                  return (
                    <div key={interaction.id} className="relative pl-10">
                      <div
                        className="absolute left-2 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                        style={{
                          background: 'var(--admin-bg)',
                          border: '2px solid var(--admin-border)',
                          top: '6px',
                        }}
                      >
                        {conf.icon}
                      </div>
                      <div
                        className="rounded-xl border p-3 space-y-2"
                        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: 'var(--admin-emerald)' }}>
                              {conf.label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                              {fmtDate(interaction.date)}
                            </span>
                            {interaction.loggedByName && (
                              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                                · {interaction.loggedByName}
                              </span>
                            )}
                          </div>
                          {canDeleteInteraction && (
                            <button
                              onClick={() => handleDeleteInteraction(interaction.id)}
                              disabled={deleting === interaction.id}
                              className="text-xs text-[#4A6A5A] hover:text-[#1C3D2E] disabled:opacity-50"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                          {interaction.summary}
                        </p>
                        {interaction.outcome && (
                          <p className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>
                            {interaction.outcome}
                          </p>
                        )}
                        {interaction.nextAction && (
                          <div
                            className="flex items-center gap-2 text-xs px-2 py-1 rounded-md"
                            style={{
                              background: isPastNextAction ? '#fef2f2' : 'var(--admin-bg)',
                              color: isPastNextAction ? '#b91c1c' : 'var(--admin-text-muted)',
                            }}
                          >
                            <span>→</span>
                            <span>{interaction.nextAction}</span>
                            {interaction.nextActionDate && (
                              <span>· {fmtDate(interaction.nextActionDate)}</span>
                            )}
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
        <div className="space-y-6">
          {satisfaction.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">☆</p>
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                Aucune évaluation de satisfaction pour ce client.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                Les évaluations sont liées depuis les fiches projet.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Stars score={avg} />
                <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {avg.toFixed(1)} / 5
                </span>
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  ({satisfaction.length} évaluation{satisfaction.length !== 1 ? 's' : ''})
                </span>
              </div>

              {trendData.length > 1 && (
                <div style={{ height: 80 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData}>
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="var(--admin-emerald)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <YAxis domain={[0, 5]} hide />
                      <XAxis hide />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-muted)',
                    }}
                  >
                    <th className="text-left py-2 pr-4 text-xs font-medium uppercase tracking-wide">Projet</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium uppercase tracking-wide">Date</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium uppercase tracking-wide">Note</th>
                    <th className="text-left py-2 text-xs font-medium uppercase tracking-wide">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {satisfaction.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-2 pr-4" style={{ color: 'var(--admin-text)' }}>
                        <p className="font-mono text-xs">{r.projectReference}</p>
                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {r.projectName}
                        </p>
                      </td>
                      <td className="py-2 pr-4 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {fmtDate(r.recordedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <Stars score={r.score} />
                      </td>
                      <td className="py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {r.comments ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}
