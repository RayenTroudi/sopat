'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/auth-utils'
import type { TeamMemberRow } from '@/lib/db/team'
import type { UserRole } from '@/lib/auth-utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = Object.entries(ROLE_LABELS) as [UserRole, string][]

const TEAM_GROUPS: { label: string; roles: UserRole[] }[] = [
  { label: 'Administration', roles: ['admin', 'direction'] },
  { label: 'Études',         roles: ['etudes_chef', 'etudes_team'] },
  { label: 'Réalisation',    roles: ['realisation_chef', 'realisation_team'] },
  { label: 'Entretien',      roles: ['entretien_chef', 'entretien_team'] },
]

function teamLabel(role: UserRole): string {
  for (const g of TEAM_GROUPS) {
    if (g.roles.includes(role)) return g.label
  }
  return '—'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', autoComplete }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoComplete?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
      className="w-full px-3 py-2 rounded-lg border text-sm"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
    />
  )
}

// ─── Create user form drawer ──────────────────────────────────────────────────

type CreateForm = { name: string; email: string; password: string; role: UserRole; phone: string }
const EMPTY_CREATE: CreateForm = { name: '', email: '', password: '', role: 'etudes_team', phone: '' }

function CreateDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (u: TeamMemberRow) => void }) {
  const [form, setForm]       = useState<CreateForm>(EMPTY_CREATE)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const set = (k: keyof CreateForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    if (!form.email.trim()) { setError("L'email est obligatoire"); return }
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return }
    setSaving(true); setError('')
    const res  = await fetch('/api/team', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role, phone: form.phone || undefined }),
    })
    const data = await res.json() as TeamMemberRow & { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSaving(false); return }
    onCreated(data)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-md flex flex-col shadow-xl" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Nouvel utilisateur</h2>
          <button onClick={onClose} style={{ color: 'var(--admin-text-muted)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <FF label="Nom complet *"><Input value={form.name} onChange={set('name')} placeholder="Prénom Nom" autoComplete="name" /></FF>
          <FF label="Adresse email *"><Input value={form.email} onChange={set('email')} type="email" placeholder="prenom.nom@sopat.tn" autoComplete="email" /></FF>
          <FF label="Mot de passe provisoire *">
            <Input value={form.password} onChange={set('password')} type="password" placeholder="Min. 8 caractères" autoComplete="new-password" />
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>L'utilisateur devra le changer à sa première connexion.</p>
          </FF>
          <FF label="Rôle *">
            <Select value={form.role} onValueChange={(v) => set('role')(v)}>
              <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                {ROLES.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FF>
          <FF label="Téléphone"><Input value={form.phone} onChange={set('phone')} placeholder="+216 xx xxx xxx" /></FF>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>{error}</p>}

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            <button onClick={() => void handleSubmit()} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
              {saving ? 'Création…' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Edit user drawer ─────────────────────────────────────────────────────────

type EditForm = { name: string; role: UserRole; phone: string; isActive: boolean; password: string }

function EditDrawer({ user, onClose, onUpdated }: { user: TeamMemberRow; onClose: () => void; onUpdated: (u: TeamMemberRow) => void }) {
  const [form, setForm]     = useState<EditForm>({ name: user.name, role: user.role, phone: user.phone ?? '', isActive: user.isActive, password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: keyof EditForm) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setSaving(true); setError('')
    const payload: Record<string, unknown> = {
      name:     form.name,
      role:     form.role,
      phone:    form.phone || null,
      isActive: form.isActive,
    }
    if (form.password) payload.password = form.password
    const res  = await fetch(`/api/team/${user.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json() as TeamMemberRow & { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSaving(false); return }
    onUpdated(data)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-md flex flex-col shadow-xl" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Modifier l'utilisateur</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--admin-text-muted)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <FF label="Nom complet"><Input value={form.name} onChange={(v) => set('name')(v)} placeholder="Prénom Nom" /></FF>
          <FF label="Rôle">
            <Select value={form.role} onValueChange={(v) => set('role')(v)}>
              <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                {ROLES.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FF>
          <FF label="Téléphone"><Input value={form.phone} onChange={(v) => set('phone')(v)} placeholder="+216 xx xxx xxx" /></FF>

          {/* Status toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ borderColor: 'var(--admin-border)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Statut du compte</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                Désactiver empêche la connexion mais préserve l'historique (ISO 9001:2015 traçabilité).
              </p>
            </div>
            <button
              onClick={() => set('isActive')(!form.isActive)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: form.isActive ? 'var(--admin-emerald-dim)' : 'var(--admin-red-dim)',
                color:      form.isActive ? 'var(--admin-emerald)'     : 'var(--admin-red)',
              }}
            >
              {form.isActive ? 'Actif' : 'Inactif'}
            </button>
          </div>

          <FF label="Nouveau mot de passe (optionnel)">
            <Input value={form.password} onChange={(v) => set('password')(v)} type="password" placeholder="Laisser vide pour conserver l'actuel" autoComplete="new-password" />
          </FF>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>{error}</p>}

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            <button onClick={() => void handleSubmit()} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
              {saving ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamClient({ initialUsers }: { initialUsers: TeamMemberRow[] }) {
  const [users, setUsers]       = useState<TeamMemberRow[]>(initialUsers)
  const [search, setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]   = useState<TeamMemberRow | null>(null)

  function handleCreated(u: TeamMemberRow) { setUsers((prev) => [u, ...prev]); setShowCreate(false) }
  function handleUpdated(u: TeamMemberRow) { setUsers((prev) => prev.map((p) => p.id === u.id ? u : p)); setEditing(null) }

  const filtered = users.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && u.role !== filterRole) return false
    return true
  })

  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Gestion de l'équipe</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>Accès réservé aux administrateurs</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="text-xs px-4 py-2 rounded-lg font-medium text-white w-full sm:w-auto" style={{ background: 'var(--admin-emerald)' }}>
          + Nouvel utilisateur
        </button>
      </div>

      {/* Team summary pills */}
      <div className="flex flex-wrap gap-2">
        {TEAM_GROUPS.map((g) => {
          const count = users.filter((u) => g.roles.includes(u.role) && u.isActive).length
          return (
            <div key={g.label} className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
              <span style={{ color: 'var(--admin-text)' }}>{g.label}</span>
              <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un membre…"
          className="px-3 py-2 rounded-lg border text-sm w-full lg:w-64"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        />
        <Select value={filterRole === '' ? '__all__' : filterRole} onValueChange={(v) => setFilterRole(v === '__all__' ? '' : v)}>
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous les rôles</SelectItem>
            {ROLES.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterRole) && (
          <button onClick={() => { setSearch(''); setFilterRole('') }} className="text-xs underline sm:col-span-2 lg:col-span-1 text-left lg:self-center" style={{ color: 'var(--admin-text-muted)' }}>Réinitialiser</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {filtered.length} membre{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {filtered.map((u) => (
                <li
                  key={u.id}
                  className={cn('px-4 py-3', !u.isActive ? 'opacity-60' : '')}
                  style={{ borderColor: 'var(--admin-border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{u.name}</p>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-medium"
                          style={{
                            background: u.isActive ? 'var(--admin-emerald-dim)' : 'var(--admin-red-dim)',
                            color:      u.isActive ? 'var(--admin-emerald)'     : 'var(--admin-red)',
                          }}
                        >
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] truncate" style={{ color: 'var(--admin-text-muted)' }}>{u.email}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <div className="min-w-0">
                          <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Rôle</dt>
                          <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{ROLE_LABELS[u.role]}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Équipe</dt>
                          <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{teamLabel(u.role)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Téléphone</dt>
                          <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{u.phone ?? '—'}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Créé le</dt>
                          <dd style={{ color: 'var(--admin-text)' }}>{fmtDate(u.createdAt)}</dd>
                        </div>
                      </dl>
                      <div className="mt-2">
                        <button onClick={() => setEditing(u)} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>Modifier</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Nom', 'Email', 'Rôle', 'Équipe', 'Téléphone', 'Statut', 'Créé le', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className={cn('hover:bg-[var(--admin-bg)] transition-colors', !u.isActive ? 'opacity-50' : '')}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>{u.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.email}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text)' }}>{ROLE_LABELS[u.role]}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{teamLabel(u.role)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          background: u.isActive ? 'var(--admin-emerald-dim)' : 'var(--admin-red-dim)',
                          color:      u.isActive ? 'var(--admin-emerald)'     : 'var(--admin-red)',
                        }}
                      >
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditing(u)} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>Modifier</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Drawers */}
      {showCreate && <CreateDrawer onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editing    && <EditDrawer   user={editing} onClose={() => setEditing(null)} onUpdated={handleUpdated} />}
    </div>
  )
}
