'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { SupplierRow, SupplierEvaluationRow, SupplierCategory, SupplierStatus } from '@/lib/db/suppliers'
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: SupplierCategory; label: string }[] = [
  { value: 'pepiniere',                label: 'Pépinière' },
  { value: 'materiaux',                label: 'Matériaux' },
  { value: 'equipements',              label: 'Équipements' },
  { value: 'produits_phytosanitaires', label: 'Produits phytosanitaires' },
  { value: 'logistique',               label: 'Logistique' },
  { value: 'location_engins',          label: 'Location d\'engins' },
  { value: 'autre',                    label: 'Autre' },
]

const STATUS_OPTIONS: { value: SupplierStatus; label: string }[] = [
  { value: 'approuve',      label: 'Approuvé' },
  { value: 'en_evaluation', label: "En cours d'évaluation" },
  { value: 'suspendu',      label: 'Suspendu' },
]

const STATUS_STYLE: Record<SupplierStatus, { bg: string; text: string }> = {
  approuve:      { bg: 'var(--admin-emerald-dim)', text: 'var(--admin-emerald)' },
  en_evaluation: { bg: 'var(--admin-amber-dim)',   text: 'var(--admin-amber)' },
  suspendu:      { bg: 'var(--admin-red-dim)',      text: 'var(--admin-red)' },
}

// ─── Form state type ──────────────────────────────────────────────────────────

type FormState = {
  name: string; category: SupplierCategory; contactName: string; email: string
  phone: string; city: string; address: string; isoStatus: SupplierStatus
  evaluationScore: string; lastAuditDate: string; notes: string
  contractAssetId: string; contractAssetUrl: string
}

const EMPTY_FORM: FormState = {
  name: '', category: 'autre', contactName: '', email: '',
  phone: '', city: '', address: '', isoStatus: 'en_evaluation',
  evaluationScore: '', lastAuditDate: '', notes: '',
  contractAssetId: '', contractAssetUrl: '',
}

function formFromRow(r: SupplierRow): FormState {
  return {
    name:            r.name,
    category:        r.category,
    contactName:     r.contactName ?? '',
    email:           r.email ?? '',
    phone:           r.phone ?? '',
    city:            r.city ?? '',
    address:         r.address ?? '',
    isoStatus:       r.isoStatus,
    evaluationScore: r.evaluationScore !== null ? String(r.evaluationScore) : '',
    lastAuditDate:   r.lastAuditDate ? new Date(r.lastAuditDate).toISOString().slice(0, 10) : '',
    notes:           r.notes ?? '',
    contractAssetId:  r.contractAssetId ?? '',
    contractAssetUrl: r.contractAssetUrl ?? '',
  }
}

// ─── Shared form field ────────────────────────────────────────────────────────

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
    />
  )
}

function Select({ value, onChange, placeholder, children }: { value: string; onChange: (v: string) => void; placeholder?: string; children: React.ReactNode }) {
  return (
    <ShadSelect value={value === '' ? '__none__' : value} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
      <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
        {children}
      </SelectContent>
    </ShadSelect>
  )
}

// ─── Supplier form drawer ─────────────────────────────────────────────────────

function SupplierFormDrawer({ editing, form, setForm, onClose, onSaved }: {
  editing: SupplierRow | null; form: FormState; setForm: (f: FormState) => void
  onClose: () => void; onSaved: (s: SupplierRow) => void
}) {
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef                   = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormState) => (v: string) => setForm({ ...form, [k]: v })

  async function uploadContract(file: File) {
    setUploading(true)
    try {
      // Supplier contracts don't belong to a project — use a fixed "suppliers" pseudo-projectId
      // We sign using the generic upload endpoint with a fixed projectId from env or a sentinel.
      // Instead, call a direct Cloudinary unsigned upload isn't available; for now use
      // the /api/upload endpoint with a "projectId" that is the supplier's id (for new ones we
      // can't since we don't have an id yet). We'll handle it by passing supplier-specific folder.
      // Simple approach: POST to /api/suppliers-upload
      const sigRes = await fetch('/api/upload/supplier-sign')
      if (!sigRes.ok) throw new Error()
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json() as Record<string, string>
      const fd = new FormData()
      fd.append('file', file); fd.append('signature', signature)
      fd.append('timestamp', timestamp); fd.append('api_key', apiKey); fd.append('folder', folder)
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd })
      const result = await upRes.json() as { public_id: string; secure_url: string }
      setForm({ ...form, contractAssetId: result.public_id, contractAssetUrl: result.secure_url })
    } catch { setError('Erreur lors du téléchargement du contrat') }
    finally { setUploading(false) }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true); setError('')
    const payload = {
      name:            form.name,
      category:        form.category,
      contactName:     form.contactName || undefined,
      email:           form.email || undefined,
      phone:           form.phone || undefined,
      city:            form.city || undefined,
      address:         form.address || undefined,
      isoStatus:       form.isoStatus,
      evaluationScore: form.evaluationScore ? Number(form.evaluationScore) : undefined,
      lastAuditDate:   form.lastAuditDate ? new Date(form.lastAuditDate).toISOString() : undefined,
      contractAssetId: form.contractAssetId || undefined,
      notes:           form.notes || undefined,
    }
    const url    = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers'
    const method = editing ? 'PUT' : 'POST'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data   = await res.json() as SupplierRow & { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSaving(false); return }
    onSaved(data)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 sticky top-0 z-10" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
            {editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--admin-text-muted)' }}>✕</button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-4">
          <FF label="Nom du fournisseur *"><Input value={form.name} onChange={set('name')} placeholder="ex: Pépinière El Amal" /></FF>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Catégorie *">
              <Select value={form.category} onChange={set('category')}>
                {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </Select>
            </FF>
            <FF label="Statut ISO *">
              <Select value={form.isoStatus} onChange={set('isoStatus')}>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </Select>
            </FF>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Nom du contact"><Input value={form.contactName} onChange={set('contactName')} placeholder="Mohamed Ben Ali" /></FF>
            <FF label="Ville"><Input value={form.city} onChange={set('city')} placeholder="Tunis" /></FF>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Téléphone"><Input value={form.phone} onChange={set('phone')} placeholder="+216 xx xxx xxx" /></FF>
            <FF label="Email"><Input value={form.email} onChange={set('email')} type="email" placeholder="contact@fournisseur.tn" /></FF>
          </div>

          <FF label="Adresse">
            <textarea value={form.address} onChange={(e) => set('address')(e.target.value)} rows={2} placeholder="Adresse complète…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
          </FF>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Score d'évaluation (1–5)">
              <Select value={form.evaluationScore} onChange={set('evaluationScore')} placeholder="—">
                <SelectItem value="__none__">—</SelectItem>
                {[1,2,3,4,5].map((s) => <SelectItem key={s} value={String(s)}>{s} / 5</SelectItem>)}
              </Select>
            </FF>
            <FF label="Date dernier audit">
              <Input value={form.lastAuditDate} onChange={set('lastAuditDate')} type="date" />
            </FF>
          </div>

          {/* Contract PDF */}
          <FF label="Contrat PDF">
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadContract(f) }} />
            {form.contractAssetUrl ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}>
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--admin-emerald)' }}>✓ Contrat téléchargé</span>
                <a href={form.contractAssetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>Voir</a>
                <button onClick={() => setForm({ ...form, contractAssetId: '', contractAssetUrl: '' })} className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Supprimer</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed text-sm disabled:opacity-60" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                {uploading ? 'Téléchargement…' : '↑ Joindre le contrat PDF'}
              </button>
            )}
          </FF>

          <FF label="Notes">
            <textarea value={form.notes} onChange={(e) => set('notes')(e.target.value)} rows={2} placeholder="Notes internes…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
          </FF>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>{error}</p>}

          <div className="flex gap-3 pb-4">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            <button onClick={() => void handleSave()} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
              {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer le fournisseur'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Evaluation panel ─────────────────────────────────────────────────────────

function EvalPanel({ supplier, onClose, onUpdated }: { supplier: SupplierRow; onClose: () => void; onUpdated: (s: SupplierRow) => void }) {
  const [evaluations, setEvaluations] = useState<SupplierEvaluationRow[]>([])
  const [loaded, setLoaded]           = useState(false)
  const [score, setScore]             = useState(0)
  const [notes, setNotes]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  // Load history on mount
  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/suppliers/${supplier.id}`)
      if (res.ok) {
        const d = await res.json() as { supplier: SupplierRow; evaluations: SupplierEvaluationRow[] }
        setEvaluations(d.evaluations)
        setLoaded(true)
      }
    })()
  }, [supplier.id])

  async function submitEval() {
    if (!score) { setError('Sélectionnez une note'); return }
    setSubmitting(true); setError('')
    const res  = await fetch(`/api/suppliers/${supplier.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, notes: notes || undefined }),
    })
    const data = await res.json() as SupplierEvaluationRow & { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setEvaluations((prev) => [data, ...prev])
    // refresh supplier row
    const sr = await fetch(`/api/suppliers/${supplier.id}`)
    if (sr.ok) {
      const d = await sr.json() as { supplier: SupplierRow }
      onUpdated(d.supplier)
    }
    setScore(0); setNotes('')
    setSubmitting(false)
  }

  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-md flex flex-col shadow-xl overflow-y-auto" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 sticky top-0 z-10" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Évaluations</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{supplier.name}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--admin-text-muted)' }}>✕</button>
        </div>
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* New evaluation */}
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Nouvelle évaluation</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setScore(s)} className="text-3xl transition-transform hover:scale-110" style={{ color: score >= s ? '#F59E0B' : 'var(--admin-border)' }}>★</button>
              ))}
              {score > 0 && <span className="ml-1 text-sm self-center font-semibold" style={{ color: 'var(--admin-text-muted)' }}>{score}/5</span>}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes d'évaluation (optionnel)…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
            {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}
            <button onClick={() => void submitEval()} disabled={submitting || !score} className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
              {submitting ? 'Enregistrement…' : 'Enregistrer l\'évaluation'}
            </button>
          </div>

          {/* History */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Historique</p>
            {!loaded ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</p>
            ) : evaluations.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>Aucune évaluation enregistrée.</p>
            ) : evaluations.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="flex gap-0.5 shrink-0 pt-0.5">
                  {[1,2,3,4,5].map((s) => <span key={s} style={{ color: ev.score >= s ? '#F59E0B' : 'var(--admin-border)' }}>★</span>)}
                </div>
                <div className="flex-1 min-w-0">
                  {ev.notes && <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{ev.notes}</p>}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                    {ev.evaluatorName} · {fmtDate(ev.evaluatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

type Props = {
  canEdit:       boolean
  currentUserId: string
}

export function SuppliersClient({ canEdit }: Props) {
  const [suppliers, setSuppliers]   = useState<SupplierRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterStat, setFilterStat] = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<SupplierRow | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [evalTarget, setEvalTarget] = useState<SupplierRow | null>(null)

  useEffect(() => {
    fetch('/api/suppliers')
      .then((r) => r.json())
      .then((data) => { setSuppliers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(s: SupplierRow) { setEditing(s); setForm(formFromRow(s)); setShowForm(true) }

  function handleSaved(s: SupplierRow) {
    setSuppliers((prev) => {
      const idx = prev.findIndex((p) => p.id === s.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = s; return n }
      return [s, ...prev]
    })
    setShowForm(false)
  }

  function handleEvalUpdated(s: SupplierRow) {
    setSuppliers((prev) => prev.map((p) => p.id === s.id ? s : p))
  }

  const filtered = suppliers.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())
      && !(s.contactName ?? '').toLowerCase().includes(search.toLowerCase())
      && !(s.city ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat  && s.category  !== filterCat)  return false
    if (filterStat && s.isoStatus !== filterStat) return false
    return true
  })

  const fmtDate = (d: Date | string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Fournisseurs agréés</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>Registre des fournisseurs · ISO 9001:2015 §7.4</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="text-xs px-4 py-2 rounded-lg font-medium text-white w-full sm:w-auto" style={{ background: 'var(--admin-emerald)' }}>
            + Nouveau fournisseur
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un fournisseur…"
          className="px-3 py-2 rounded-lg border text-sm w-full lg:w-64"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        />
        <ShadSelect value={filterCat === '' ? '__all__' : filterCat} onValueChange={(v) => setFilterCat(v === '__all__' ? '' : v)}>
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Toutes catégories</SelectItem>
            {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </ShadSelect>
        <ShadSelect value={filterStat === '' ? '__all__' : filterStat} onValueChange={(v) => setFilterStat(v === '__all__' ? '' : v)}>
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </ShadSelect>
        {(search || filterCat || filterStat) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterStat('') }} className="text-xs underline sm:col-span-2 lg:col-span-1 text-left lg:self-center" style={{ color: 'var(--admin-text-muted)' }}>Réinitialiser</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {loading ? '…' : `${filtered.length} fournisseur${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {loading ? (
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-4 rounded flex-1" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 rounded w-24" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 rounded w-20" style={{ background: 'var(--admin-border)' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun fournisseur trouvé.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {filtered.map((s) => {
                const ss = STATUS_STYLE[s.isoStatus]
                const catLabel = CATEGORY_OPTIONS.find((c) => c.value === s.category)?.label ?? s.category
                return (
                  <li key={s.id} className={cn('px-4 py-3', s.isoStatus === 'suspendu' ? 'opacity-60' : '')} style={{ borderColor: 'var(--admin-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: ss.bg, color: ss.text }}>
                            {STATUS_OPTIONS.find((o) => o.value === s.isoStatus)?.label ?? s.isoStatus}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{catLabel}</p>
                        {(s.contactName || s.phone || s.email) && (
                          <div className="mt-1.5 text-[11px] space-y-0.5">
                            {s.contactName && <p style={{ color: 'var(--admin-text)' }}>{s.contactName}</p>}
                            {s.phone && <p style={{ color: 'var(--admin-text-muted)' }}>{s.phone}</p>}
                            {s.email && <p className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{s.email}</p>}
                          </div>
                        )}
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Ville</dt>
                            <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{s.city ?? '—'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Dernier audit</dt>
                            <dd style={{ color: 'var(--admin-text)' }}>{fmtDate(s.lastAuditDate)}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Score</dt>
                            <dd>
                              {s.evaluationScore !== null ? (
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map((n) => <span key={n} style={{ color: (s.evaluationScore ?? 0) >= n ? '#F59E0B' : 'var(--admin-border)', fontSize: 12 }}>★</span>)}
                                </div>
                              ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Contrat</dt>
                            <dd>
                              {s.contractAssetUrl ? (
                                <a href={s.contractAssetUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--admin-blue)' }}>PDF</a>
                              ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                            </dd>
                          </div>
                        </dl>
                        {canEdit && (
                          <div className="mt-2 flex gap-3 text-xs">
                            <button onClick={() => openEdit(s)} className="underline" style={{ color: 'var(--admin-text-muted)' }}>Modifier</button>
                            <button onClick={() => setEvalTarget(s)} className="underline" style={{ color: 'var(--admin-blue)' }}>Évaluer</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Fournisseur', 'Catégorie', 'Contact', 'Ville', 'Statut ISO', 'Score', 'Dernier audit', 'Contrat', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const ss = STATUS_STYLE[s.isoStatus]
                  const catLabel = CATEGORY_OPTIONS.find((c) => c.value === s.category)?.label ?? s.category
                  return (
                    <tr key={s.id} className={cn('hover:bg-[var(--admin-bg)] transition-colors', s.isoStatus === 'suspendu' ? 'opacity-60' : '')} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                        {s.notes && <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--admin-text-muted)' }}>{s.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{catLabel}</td>
                      <td className="px-4 py-3">
                        {s.contactName && <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{s.contactName}</p>}
                        {s.phone && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.phone}</p>}
                        {s.email && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: ss.bg, color: ss.text }}>
                          {STATUS_OPTIONS.find((o) => o.value === s.isoStatus)?.label ?? s.isoStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.evaluationScore !== null ? (
                          <div className="flex gap-0.5 justify-center">
                            {[1,2,3,4,5].map((n) => <span key={n} style={{ color: (s.evaluationScore ?? 0) >= n ? '#F59E0B' : 'var(--admin-border)', fontSize: 14 }}>★</span>)}
                          </div>
                        ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{fmtDate(s.lastAuditDate)}</td>
                      <td className="px-4 py-3">
                        {s.contractAssetUrl ? (
                          <a href={s.contractAssetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>PDF</a>
                        ) : <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(s)} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>Modifier</button>
                            <button onClick={() => setEvalTarget(s)} className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>Évaluer</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Form drawer */}
      {showForm && (
        <SupplierFormDrawer
          editing={editing} form={form} setForm={setForm}
          onClose={() => setShowForm(false)} onSaved={handleSaved}
        />
      )}

      {/* Evaluation panel */}
      {evalTarget && (
        <EvalPanel
          supplier={evalTarget}
          onClose={() => setEvalTarget(null)}
          onUpdated={(s) => { handleEvalUpdated(s); setEvalTarget(s) }}
        />
      )}
    </div>
  )
}
