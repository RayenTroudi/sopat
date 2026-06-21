'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AllSettings } from '@/lib/db/settings'
import { ROLE_LABELS } from '@/lib/auth-utils'
import type { UserRole } from '@/lib/auth-utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FF({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'var(--admin-text-muted)', opacity: 0.7 }}>{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
    />
  )
}

function SaveButton({ saving, label = 'Enregistrer' }: { saving: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={saving} style={{ background: 'var(--admin-emerald)' }} className="text-white hover:opacity-90">
      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement…</> : label}
    </Button>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="border-l-4 pl-4" style={{ borderColor: 'var(--admin-emerald)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Company settings ─────────────────────────────────────────────────────────

function CompanySection({ initial }: { initial: AllSettings['company'] }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    const res = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'company', company: form }),
    })
    setMsg(res.ok ? 'Enregistré ✓' : 'Erreur lors de la sauvegarde')
    setSaving(false)
  }

  return (
    <Section title="Informations société" subtitle="Affiché sur les documents et emails SOPAT">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FF label="Nom de la société"><Input value={form.name} onChange={set('name')} placeholder="SOPAT" /></FF>
          <FF label="Adresse"><Input value={form.address} onChange={set('address')} placeholder="Tunis, Tunisie" /></FF>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FF label="N° certificat ISO 9001:2015"><Input value={form.isoCertificateNumber} onChange={set('isoCertificateNumber')} placeholder="CERT-ISO-XXXX" /></FF>
          <FF label="Date d'expiration du certificat"
            hint="Une alerte apparaîtra sur le tableau de bord 60 jours avant l'expiration.">
            <Input value={form.isoCertificateExpiry} onChange={set('isoCertificateExpiry')} type="date" />
          </FF>
        </div>
        <div className="flex items-center gap-3">
          <SaveButton saving={saving} />
          {msg && <span className="text-sm" style={{ color: msg.includes('✓') ? 'var(--admin-emerald)' : 'var(--admin-red)' }}>{msg}</span>}
        </div>
      </form>
    </Section>
  )
}

// ─── SMTP settings ────────────────────────────────────────────────────────────

function SmtpSection({ initial }: { initial: AllSettings['smtp'] }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [msg, setMsg]           = useState('')

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    const res = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'smtp', smtp: { ...form, port: Number(form.port) } }),
    })
    setMsg(res.ok ? 'Configuration SMTP enregistrée ✓' : 'Erreur lors de la sauvegarde')
    setSaving(false)
  }

  async function handleTest() {
    if (!testEmail) return
    setTesting(true); setMsg('')
    const res = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'test-email', testEmail }),
    })
    const data = await res.json() as { ok?: boolean; error?: string }
    setMsg(res.ok ? `Email de test envoyé à ${testEmail} ✓` : `Erreur : ${data.error ?? 'Échec'}`)
    setTesting(false)
  }

  return (
    <Section title="Configuration SMTP" subtitle="Serveur d'envoi des emails système (alertes, rappels, validations)">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FF label="Hôte SMTP"><Input value={form.host} onChange={set('host')} placeholder="smtp.gmail.com" /></FF>
          </div>
          <FF label="Port"><Input value={form.port} onChange={set('port')} type="number" placeholder="587" /></FF>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FF label="Utilisateur"><Input value={form.user} onChange={set('user')} placeholder="noreply@sopat.tn" /></FF>
          <FF label="Mot de passe">
            <input type="password" value={form.password} onChange={(e) => set('password')(e.target.value)}
              placeholder="Laisser vide pour conserver l'actuel"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </FF>
        </div>
        <FF label="Adresse d'expéditeur (From)"><Input value={form.fromAddress} onChange={set('fromAddress')} placeholder="noreply@sopat.tn" /></FF>

        <div className="flex items-center gap-3 flex-wrap">
          <SaveButton saving={saving} />
          {msg && <span className="text-sm" style={{ color: msg.includes('✓') ? 'var(--admin-emerald)' : 'var(--admin-red)' }}>{msg}</span>}
        </div>
      </form>

      {/* Test email */}
      <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Envoyer un email de test</p>
        <div className="flex gap-3">
          <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} type="email" placeholder="votre@email.com"
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
          />
          <button onClick={() => void handleTest()} disabled={testing || !testEmail}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}>
            {testing ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </Section>
  )
}

// ─── Notification settings ────────────────────────────────────────────────────

const NOTIF_CONFIG: { key: keyof AllSettings['notifications']; label: string; description: string }[] = [
  { key: 'budgetAlert',         label: 'Alertes budgétaires',       description: 'Dépenses > 90% du budget approuvé' },
  { key: 'ncAssigned',          label: 'Assignation NC',             description: 'Quand une NC est assignée à un utilisateur' },
  { key: 'phaseTransition',     label: 'Transitions de phase',       description: 'Quand un projet change de phase' },
  { key: 'maintenanceReminder', label: 'Rappels de visite',          description: '24h avant une visite de maintenance' },
]

const ALL_ROLES = Object.entries(ROLE_LABELS) as [UserRole, string][]

function NotificationsSection({ initial }: { initial: AllSettings['notifications'] }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function toggle(key: keyof AllSettings['notifications'], role: string) {
    setForm((f) => {
      const current = f[key] as string[]
      return {
        ...f,
        [key]: current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    const res = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'notifications', notifications: form }),
    })
    setMsg(res.ok ? 'Enregistré ✓' : 'Erreur')
    setSaving(false)
  }

  return (
    <Section title="Notifications système" subtitle="Choisir quels rôles reçoivent chaque type d'email automatique">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {NOTIF_CONFIG.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{label}</p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(([role, roleLabel]) => {
                const checked = (form[key] as string[]).includes(role)
                return (
                  <label key={role} className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-xs"
                    style={{
                      borderColor: checked ? 'var(--admin-emerald)' : 'var(--admin-border)',
                      background:  checked ? 'var(--admin-emerald-dim)' : 'transparent',
                      color:       checked ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                    }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(key, role)} className="sr-only" />
                    {roleLabel}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <SaveButton saving={saving} />
          {msg && <span className="text-sm" style={{ color: msg.includes('✓') ? 'var(--admin-emerald)' : 'var(--admin-red)' }}>{msg}</span>}
        </div>
      </form>
    </Section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsClient({ initialSettings }: { initialSettings: AllSettings }) {
  const [tab, setTab] = useState<'company' | 'smtp' | 'notifications'>('company')

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Paramètres</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>Configuration système · Accès administrateur</p>
        </div>
        <Link href="/admin/settings/ml" className="text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}>
          Modèle ML →
        </Link>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">Société</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="company"><CompanySection initial={initialSettings.company} /></TabsContent>
        <TabsContent value="smtp"><SmtpSection initial={initialSettings.smtp} /></TabsContent>
        <TabsContent value="notifications"><NotificationsSection initial={initialSettings.notifications} /></TabsContent>
      </Tabs>
    </div>
  )
}
