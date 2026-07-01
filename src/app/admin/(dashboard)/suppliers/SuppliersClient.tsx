'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SupplierRow, SupplierEvaluationRow, SupplierCategory, SupplierStatus } from '@/lib/db/suppliers'
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { DeleteButton } from '@/components/ui/DeleteButton'

// ─── Constants ────────────────────────────────────────────────────────────────

// Matches FOR-AC-11 sheet tabs exactly
const CATEGORY_OPTIONS: { value: SupplierCategory; label: string }[] = [
  { value: 'plantes',                 label: 'Matière première — Plantes' },
  { value: 'terre_vegetale',          label: 'Matière première — Terre végétale' },
  { value: 'gazon',                   label: 'Matière première — Gazon' },
  { value: 'matiere_decorative',      label: 'Matière décorative' },
  { value: 'bac_fleurs',              label: 'Bac à fleurs' },
  { value: 'produits_phytosanitaires',label: 'Produits phytosanitaires' },
  { value: 'equipements',             label: 'Équipements sécurité & outillage' },
  { value: 'parc_auto',               label: 'Parc auto' },
  { value: 'equipements_bureautique', label: 'Équipements bureautique & info' },
  { value: 'services',                label: 'Services' },
  { value: 'location_engins',         label: 'Location engins & transport' },
  { value: 'sous_traitants',          label: 'Sous-traitants' },
  { value: 'materiaux',               label: 'Matériaux' },
  { value: 'logistique',              label: 'Logistique' },
  { value: 'pepiniere',               label: 'Pépinière (ancien)' },
  { value: 'autre',                   label: 'Autre' },
]

const STATUS_OPTIONS: { value: SupplierStatus; label: string }[] = [
  { value: 'approuve',      label: 'Approuvé (A)' },
  { value: 'en_evaluation', label: "En évaluation (B)" },
  { value: 'suspendu',      label: 'Suspendu (C)' },
]

const CLASS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'var(--admin-emerald-dim)', text: 'var(--admin-emerald)', border: 'var(--admin-emerald)' },
  B: { bg: 'var(--admin-amber-dim)',   text: 'var(--admin-amber)',   border: 'var(--admin-amber)' },
  C: { bg: 'var(--admin-red-dim)',     text: 'var(--admin-red)',     border: 'var(--admin-red)' },
}

const STATUS_STYLE: Record<SupplierStatus, { bg: string; text: string }> = {
  approuve:      { bg: 'var(--admin-emerald-dim)', text: 'var(--admin-emerald)' },
  en_evaluation: { bg: 'var(--admin-amber-dim)',   text: 'var(--admin-amber)' },
  suspendu:      { bg: 'var(--admin-red-dim)',      text: 'var(--admin-red)' },
}

// FOR-AC-11 selection criteria (1–3 scale)
const SELECTION_CRITERIA = [
  { key: 'tauxCouverture',     label: 'Taux de couverture du besoin fonctionnel' },
  { key: 'niveauQualite',      label: 'Niveau de qualité' },
  { key: 'prix',               label: 'Prix' },
  { key: 'delaiLivraison',     label: 'Délai de livraison' },
  { key: 'modeLivraison',      label: 'Mode de livraison' },
  { key: 'modalitesPaiement',  label: 'Modalités de paiement' },
  { key: 'proximiteLivraison', label: 'Proximité / Modalités de livraison' },
] as const

// FOR-AC-11 evaluation criteria — standard
const EVALUATION_CRITERIA_STANDARD = [
  { key: 'respectExigences', label: 'Respect des exigences' },
  { key: 'respectPrix',      label: 'Respect prix' },
  { key: 'respectDelai',     label: 'Respect délai' },
] as const

// FOR-AC-11 evaluation criteria — services/sous-traitants (extra criteria)
const EVALUATION_CRITERIA_SERVICES = [
  { key: 'notorieteReference',  label: 'Notoriété et référence' },
  { key: 'respectExigences',    label: 'Respect des exigences' },
  { key: 'respectPrix',         label: 'Respect prix' },
  { key: 'respectDelai',        label: 'Respect délai' },
  { key: 'reactivite',          label: 'Réactivité' },
  { key: 'assistanceTechnique', label: 'Assistance technique' },
  { key: 'documentationTech',   label: 'Documentation technique' },
] as const

const SERVICES_CATEGORIES: SupplierCategory[] = ['services', 'sous_traitants', 'equipements_bureautique']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classFor(score: number | null): string {
  if (score === null) return '—'
  if (score >= 2.5) return 'A'
  if (score >= 1.5) return 'B'
  return 'C'
}

function ScoreBadge({ score, cls }: { score: number | null; cls?: string | null }) {
  const c = cls ?? (score !== null ? classFor(score) : null)
  const style = c && CLASS_STYLE[c] ? CLASS_STYLE[c] : null
  return (
    <div className="flex items-center gap-1.5">
      {score !== null && (
        <span className="text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>{score.toFixed(2)}</span>
      )}
      {c && c !== '—' && style && (
        <span className="text-xs font-bold w-6 h-6 rounded flex items-center justify-center border"
          style={{ background: style.bg, color: style.text, borderColor: style.border }}>
          {c}
        </span>
      )}
      {(!c || c === '—') && score === null && <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
    </div>
  )
}

function CriteriaInput({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--admin-border)' }}>
      <span className="text-xs flex-1" style={{ color: 'var(--admin-text)' }}>{label}</span>
      <div className="flex gap-1 shrink-0">
        {[1, 2, 3].map(n => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            className="w-8 h-8 rounded text-xs font-semibold border transition-colors"
            style={{
              background: value === n ? 'var(--admin-emerald)' : 'var(--admin-bg)',
              color: value === n ? '#fff' : 'var(--admin-text-muted)',
              borderColor: value === n ? 'var(--admin-emerald)' : 'var(--admin-border)',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  supplierCode: string; name: string; category: SupplierCategory
  registreCommerce: string; contactName: string; email: string
  phone: string; city: string; address: string
  isoStatus: SupplierStatus; notes: string
  contractAssetId: string; contractAssetUrl: string
}

const EMPTY_FORM: FormState = {
  supplierCode: '', name: '', category: 'plantes',
  registreCommerce: '', contactName: '', email: '',
  phone: '', city: '', address: '',
  isoStatus: 'en_evaluation', notes: '',
  contractAssetId: '', contractAssetUrl: '',
}

function formFromRow(r: SupplierRow): FormState {
  return {
    supplierCode:    r.supplierCode ?? '',
    name:            r.name,
    category:        r.category,
    registreCommerce: r.registreCommerce ?? '',
    contactName:     r.contactName ?? '',
    email:           r.email ?? '',
    phone:           r.phone ?? '',
    city:            r.city ?? '',
    address:         r.address ?? '',
    isoStatus:       r.isoStatus,
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

function Input({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
    />
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <ShadSelect value={value === '' ? '__none__' : value} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
      <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
        {children}
      </SelectContent>
    </ShadSelect>
  )
}

// ─── Step header helper ───────────────────────────────────────────────────────

function SupStepHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #2F6F4F, #1C3D2E)' }}>
        {number}
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</p>
      <div className="flex-1 h-px" style={{ background: 'var(--admin-border)' }} />
    </div>
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
  const [formStep, setFormStep]   = useState(1)
  const fileRef                   = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormState) => (v: string) => setForm({ ...form, [k]: v })

  const STEPS = ['Identité', 'Contact', 'Contrat & Notes'] as const

  async function uploadContract(file: File) {
    setUploading(true)
    try {
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
      name:             form.name,
      category:         form.category,
      supplierCode:     form.supplierCode || undefined,
      registreCommerce: form.registreCommerce || undefined,
      contactName:      form.contactName || undefined,
      email:            form.email || undefined,
      phone:            form.phone || undefined,
      city:             form.city || undefined,
      address:          form.address || undefined,
      isoStatus:        form.isoStatus,
      contractAssetId:  form.contractAssetId || undefined,
      notes:            form.notes || undefined,
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
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl" style={{ background: 'var(--admin-bg)', borderLeft: '1px solid var(--admin-border)' }}>

        {/* Header with step indicator */}
        <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
                {editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>FOR-AC-11 · ISO 9001:2015 §7.4</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]" style={{ color: 'var(--admin-text-muted)' }}>✕</button>
          </div>
          {!editing && (
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {STEPS.map((label, i) => {
                const step = i + 1
                const done = formStep > step
                const active = formStep === step
                return (
                  <button key={step} onClick={() => setFormStep(step)}
                    className="flex items-center gap-1.5 text-xs transition-all min-w-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: active ? 'var(--admin-accent)' : done ? 'var(--admin-emerald-dim)' : 'var(--admin-border)',
                        color: active ? '#fff' : done ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                      }}>
                      {done ? <Check className="w-2.5 h-2.5" /> : step}
                    </span>
                    <span className="hidden sm:inline truncate" style={{ color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)', fontWeight: active ? 600 : 400 }}>{label}</span>
                    {step < 3 && <span className="shrink-0" style={{ color: 'var(--admin-border)' }}>›</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {editing ? (
            /* Edit mode — flat form */
            <>
              <SupStepHeader number="1" title="Identité" />
              <div className="grid grid-cols-2 gap-3">
                <FF label="Code fournisseur">
                  <Input value={form.supplierCode} onChange={set('supplierCode')} placeholder="FR-001" />
                </FF>
                <FF label="Catégorie *">
                  <Select value={form.category} onChange={set('category')}>
                    {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </Select>
                </FF>
              </div>
              <FF label="Nom du fournisseur *">
                <Input value={form.name} onChange={set('name')} placeholder="ex: LES PEPINIERES DE LA TUNISIE" />
              </FF>
              <FF label="N° registre de commerce">
                <Input value={form.registreCommerce} onChange={set('registreCommerce')} placeholder="1172568/ZNM/000" />
              </FF>
              <FF label="Statut ISO *">
                <Select value={form.isoStatus} onChange={set('isoStatus')}>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </Select>
              </FF>

              <SupStepHeader number="2" title="Contact" />
              <div className="grid grid-cols-2 gap-3">
                <FF label="Personne à contacter">
                  <Input value={form.contactName} onChange={set('contactName')} placeholder="Mohamed Ben Ali" />
                </FF>
                <FF label="Téléphone">
                  <Input value={form.phone} onChange={set('phone')} placeholder="+216 xx xxx xxx" />
                </FF>
              </div>
              <FF label="Email">
                <Input value={form.email} onChange={set('email')} type="email" placeholder="contact@fournisseur.tn" />
              </FF>
              <FF label="Adresse">
                <textarea value={form.address} onChange={(e) => set('address')(e.target.value)} rows={2}
                  placeholder="Adresse complète…"
                  className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </FF>

              <SupStepHeader number="3" title="Contrat & Notes" />
              <FF label="Contrat PDF">
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadContract(f) }} />
                {form.contractAssetUrl ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--admin-emerald)' }}>✓ Contrat téléchargé</span>
                    <a href={form.contractAssetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>Voir</a>
                    <button onClick={() => setForm({ ...form, contractAssetId: '', contractAssetUrl: '' })} className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Supprimer</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-sm disabled:opacity-60"
                    style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                    {uploading ? 'Téléchargement…' : '↑ Joindre le contrat PDF'}
                  </button>
                )}
              </FF>
              <FF label="Notes internes">
                <textarea value={form.notes} onChange={(e) => set('notes')(e.target.value)} rows={3}
                  placeholder="Notes…"
                  className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </FF>
            </>
          ) : (
            /* Create mode — step-by-step */
            <>
              {formStep === 1 && (
                <div className="space-y-4">
                  <SupStepHeader number="1" title="Identité du fournisseur" />
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Code fournisseur">
                      <Input value={form.supplierCode} onChange={set('supplierCode')} placeholder="FR-001" />
                    </FF>
                    <FF label="Catégorie *">
                      <Select value={form.category} onChange={set('category')}>
                        {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </Select>
                    </FF>
                  </div>
                  <FF label="Nom du fournisseur *">
                    <Input value={form.name} onChange={set('name')} placeholder="ex: LES PEPINIERES DE LA TUNISIE" />
                  </FF>
                  <FF label="N° registre de commerce">
                    <Input value={form.registreCommerce} onChange={set('registreCommerce')} placeholder="1172568/ZNM/000" />
                  </FF>
                  <FF label="Statut ISO *">
                    <Select value={form.isoStatus} onChange={set('isoStatus')}>
                      {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </Select>
                  </FF>
                </div>
              )}

              {formStep === 2 && (
                <div className="space-y-4">
                  <SupStepHeader number="2" title="Contact" />
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Personne à contacter">
                      <Input value={form.contactName} onChange={set('contactName')} placeholder="Mohamed Ben Ali" />
                    </FF>
                    <FF label="Téléphone">
                      <Input value={form.phone} onChange={set('phone')} placeholder="+216 xx xxx xxx" />
                    </FF>
                  </div>
                  <FF label="Email">
                    <Input value={form.email} onChange={set('email')} type="email" placeholder="contact@fournisseur.tn" />
                  </FF>
                  <FF label="Adresse">
                    <textarea value={form.address} onChange={(e) => set('address')(e.target.value)} rows={3}
                      placeholder="Adresse complète…"
                      className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                  </FF>
                </div>
              )}

              {formStep === 3 && (
                <div className="space-y-4">
                  <SupStepHeader number="3" title="Contrat & Notes" />
                  <FF label="Contrat PDF">
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadContract(f) }} />
                    {form.contractAssetUrl ? (
                      <div className="flex items-center gap-3 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}>
                        <span className="text-sm flex-1 truncate" style={{ color: 'var(--admin-emerald)' }}>✓ Contrat téléchargé</span>
                        <a href={form.contractAssetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>Voir</a>
                        <button onClick={() => setForm({ ...form, contractAssetId: '', contractAssetUrl: '' })} className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Supprimer</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-sm disabled:opacity-60"
                        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                        {uploading ? 'Téléchargement…' : '↑ Joindre le contrat PDF'}
                      </button>
                    )}
                  </FF>
                  <FF label="Notes internes">
                    <textarea value={form.notes} onChange={(e) => set('notes')(e.target.value)} rows={4}
                      placeholder="Notes…"
                      className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                  </FF>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm px-3 py-2 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>{error}</p>}
        </div>

        {/* Sticky footer */}
        <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          {editing ? (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Annuler
              </button>
              <button onClick={() => void handleSave()} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--admin-accent)' }}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Enregistrement…</> : 'Mettre à jour'}
              </button>
            </>
          ) : (
            <>
              {formStep > 1 ? (
                <button onClick={() => setFormStep(s => s - 1)}
                  className="px-4 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  ← Précédent
                </button>
              ) : (
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  Annuler
                </button>
              )}
              {formStep < 3 ? (
                <button onClick={() => { setError(''); setFormStep(s => s + 1) }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--admin-accent)' }}>
                  Suivant →
                </button>
              ) : (
                <button onClick={() => void handleSave()} disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--admin-accent)' }}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Création…</> : 'Créer le fournisseur'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Evaluation panel (FOR-AC-11 criteria) ────────────────────────────────────

type CriteriaState = Record<string, number | null>

function EvalPanel({ supplier, onClose, onUpdated }: {
  supplier: SupplierRow; onClose: () => void; onUpdated: (s: SupplierRow) => void
}) {
  const [evaluations, setEvaluations] = useState<SupplierEvaluationRow[]>([])
  const [loaded, setLoaded]           = useState(false)
  const [evalType, setEvalType]       = useState<'selection' | 'evaluation'>('selection')
  const [criteria, setCriteria]       = useState<CriteriaState>({})
  const [notes, setNotes]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const isServices = SERVICES_CATEGORIES.includes(supplier.category)
  const selCriteriaList  = SELECTION_CRITERIA
  const evalCriteriaList = isServices ? EVALUATION_CRITERIA_SERVICES : EVALUATION_CRITERIA_STANDARD

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

  const activeCriteria = evalType === 'selection' ? selCriteriaList : evalCriteriaList
  const filledValues = activeCriteria.map(c => criteria[c.key]).filter((v): v is number => v !== null && v !== undefined)
  const previewScore = filledValues.length > 0
    ? Math.round((filledValues.reduce((a, b) => a + b, 0) / filledValues.length) * 100) / 100
    : null
  const previewClass = previewScore !== null ? classFor(previewScore) : null

  async function submitEval() {
    if (filledValues.length === 0) { setError('Remplissez au moins un critère'); return }
    setSubmitting(true); setError('')

    const payload: Record<string, unknown> = { evaluationType: evalType, notes: notes || undefined }
    for (const c of activeCriteria) {
      if (criteria[c.key] !== undefined && criteria[c.key] !== null) {
        payload[c.key] = criteria[c.key]
      }
    }

    const res  = await fetch(`/api/suppliers/${supplier.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json() as SupplierEvaluationRow & { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSubmitting(false); return }

    setEvaluations((prev) => [data, ...prev])
    const sr = await fetch(`/api/suppliers/${supplier.id}`)
    if (sr.ok) {
      const d = await sr.json() as { supplier: SupplierRow }
      onUpdated(d.supplier)
    }
    setCriteria({}); setNotes(''); setSubmitting(false)
  }

  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-md flex flex-col shadow-xl overflow-y-auto" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 sticky top-0 z-10" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>FOR-AC-11 · Évaluation</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{supplier.supplierCode && <span className="font-mono mr-1">{supplier.supplierCode}</span>}{supplier.name}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--admin-text-muted)' }}>✕</button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Type toggle */}
          <div className="flex rounded-lg border overflow-hidden text-sm" style={{ borderColor: 'var(--admin-border)' }}>
            {(['selection', 'evaluation'] as const).map(t => (
              <button key={t} onClick={() => { setEvalType(t); setCriteria({}) }}
                className="flex-1 py-2 font-medium transition-colors"
                style={{
                  background: evalType === t ? 'var(--admin-emerald)' : 'var(--admin-bg)',
                  color: evalType === t ? '#fff' : 'var(--admin-text-muted)',
                }}>
                {t === 'selection' ? 'Sélection' : 'Évaluation'}
              </button>
            ))}
          </div>

          {/* Criteria */}
          <div className="p-4 rounded-xl border space-y-1" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-muted)' }}>
              {evalType === 'selection' ? 'Critères de sélection' : 'Critères d\'évaluation'} — noter de 1 à 3
            </p>
            {activeCriteria.map(c => (
              <CriteriaInput
                key={c.key}
                label={c.label}
                value={criteria[c.key] ?? null}
                onChange={(v) => setCriteria(prev => ({ ...prev, [c.key]: v }))}
              />
            ))}

            {previewScore !== null && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--admin-border)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Score calculé</span>
                <ScoreBadge score={previewScore} cls={previewClass} />
              </div>
            )}
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Observations (optionnel)…"
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />

          {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}

          <button onClick={() => void submitEval()} disabled={submitting || filledValues.length === 0}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--admin-emerald)' }}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>

          {/* History */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Historique</p>
            {!loaded ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</p>
            ) : evaluations.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>Aucune évaluation enregistrée.</p>
            ) : evaluations.map((ev) => (
              <div key={ev.id} className="px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                    {ev.evaluationType === 'selection' ? 'Sélection' : 'Évaluation'}
                  </span>
                  <ScoreBadge score={ev.computedScore} cls={ev.classification} />
                </div>
                {ev.notes && <p className="text-sm mt-1.5" style={{ color: 'var(--admin-text)' }}>{ev.notes}</p>}
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                  {ev.evaluatorName} · {fmtDate(ev.evaluatedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

type Props = { canEdit: boolean; currentUserId: string }

export function SuppliersClient({ canEdit }: Props) {
  const [allSuppliers, setAllSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('')
  const [filterClass, setFilterClass]   = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<SupplierRow | null>(null)
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM)
  const [evalTarget, setEvalTarget]     = useState<SupplierRow | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SupplierRow | null>(null)

  useEffect(() => {
    fetch('/api/suppliers')
      .then((r) => r.json())
      .then((data) => { setAllSuppliers(data as SupplierRow[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(supplier: SupplierRow) {
    setDeletingId(supplier.id)
    const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' })
    if (res.ok) setAllSuppliers((prev) => prev.filter((s) => s.id !== supplier.id))
    setDeletingId(null)
    setConfirmDelete(null)
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(s: SupplierRow) { setEditing(s); setForm(formFromRow(s)); setShowForm(true) }

  function handleSaved(s: SupplierRow) {
    setAllSuppliers((prev) => {
      const idx = prev.findIndex((p) => p.id === s.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = s; return n }
      return [s, ...prev]
    })
    setShowForm(false)
  }

  function handleEvalUpdated(s: SupplierRow) {
    setAllSuppliers((prev) => prev.map((p) => p.id === s.id ? s : p))
  }

  const filtered = allSuppliers.filter((s) => {
    const q = search.toLowerCase()
    if (search && !s.name.toLowerCase().includes(q)
      && !(s.supplierCode ?? '').toLowerCase().includes(q)
      && !(s.contactName ?? '').toLowerCase().includes(q)
      && !(s.city ?? '').toLowerCase().includes(q)) return false
    if (filterCat   && s.category !== filterCat) return false
    if (filterClass && (s.isoClass ?? classFor(s.isoClass ? null : s.evaluationScore)) !== filterClass) return false
    return true
  })

  const catLabel = (c: SupplierCategory) => CATEGORY_OPTIONS.find(o => o.value === c)?.label ?? c

  // Stats
  const aCount = allSuppliers.filter(s => (s.isoClass ?? classFor(s.evaluationScore)) === 'A').length
  const bCount = allSuppliers.filter(s => (s.isoClass ?? classFor(s.evaluationScore)) === 'B').length
  const cCount = allSuppliers.filter(s => (s.isoClass ?? classFor(s.evaluationScore)) === 'C').length

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            FOR-AC-11 · Tableau de sélection et d'évaluation des fournisseurs
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Registre des fournisseurs agréés · ISO 9001:2015 §7.4 · {allSuppliers.length} fournisseurs
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="text-xs px-4 py-2 rounded-lg font-medium text-white w-full sm:w-auto" style={{ background: 'var(--admin-emerald)' }}>
            + Nouveau fournisseur
          </button>
        )}
      </div>

      {/* Class summary */}
      {!loading && allSuppliers.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[['A','Approuvés',aCount],['B','En évaluation',bCount],['C','Suspendus',cCount]].map(([cls, lbl, cnt]) => {
            const s = CLASS_STYLE[cls as string]
            return (
              <div key={cls as string} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border cursor-pointer"
                style={{
                  borderColor: filterClass === cls ? (s?.border ?? 'var(--admin-border)') : 'var(--admin-border)',
                  background:  filterClass === cls ? (s?.bg ?? 'var(--admin-surface)') : 'var(--admin-surface)',
                }}
                onClick={() => setFilterClass(filterClass === (cls as string) ? '' : (cls as string))}>
                <span className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center border"
                  style={s ? { background: s.bg, color: s.text, borderColor: s.border } : {}}>
                  {cls}
                </span>
                <span style={{ color: 'var(--admin-text-muted)' }}>{lbl} — <strong style={{ color: 'var(--admin-text)' }}>{cnt as number}</strong></span>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher fournisseur, code FR-…"
          className="px-3 py-2 rounded-lg border text-sm flex-1 min-w-[200px]"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />

        <ShadSelect value={filterCat === '' ? '__all__' : filterCat} onValueChange={(v) => setFilterCat(v === '__all__' ? '' : v)}>
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-auto min-w-[180px]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Toutes catégories</SelectItem>
            {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </ShadSelect>

        {(search || filterCat || filterClass) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterClass('') }}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
            Réinitialiser
          </button>
        )}

        <span className="text-xs self-center ml-auto" style={{ color: 'var(--admin-text-muted)' }}>
          {filtered.length} / {allSuppliers.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
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
            {/* Mobile */}
            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {filtered.map((s) => {
                const isoClass = s.isoClass ?? (s.evaluationScore !== null ? classFor(s.evaluationScore) : null)
                const ss = STATUS_STYLE[s.isoStatus]
                return (
                  <li key={s.id} className={cn('px-4 py-3', s.isoStatus === 'suspendu' ? 'opacity-60' : '')} style={{ borderColor: 'var(--admin-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.supplierCode && <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-emerald)' }}>{s.supplierCode}</span>}
                          <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                          {isoClass && CLASS_STYLE[isoClass] && (
                            <span className="text-xs font-bold w-6 h-6 rounded flex items-center justify-center border"
                              style={{ background: CLASS_STYLE[isoClass].bg, color: CLASS_STYLE[isoClass].text, borderColor: CLASS_STYLE[isoClass].border }}>
                              {isoClass}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{catLabel(s.category)}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Sélection</dt>
                            <dd><ScoreBadge score={s.selectionScore} cls={s.selectionClass} /></dd></div>
                          <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Évaluation</dt>
                            <dd><ScoreBadge score={s.evaluationScore} cls={s.evaluationClass} /></dd></div>
                          {s.contactName && <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Contact</dt><dd style={{ color: 'var(--admin-text)' }}>{s.contactName}</dd></div>}
                          {s.nextEvalPlanned && <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Prochaine éval.</dt><dd style={{ color: 'var(--admin-text)' }}>{s.nextEvalPlanned}</dd></div>}
                        </dl>
                        {canEdit && (
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <button onClick={() => openEdit(s)} className="underline" style={{ color: 'var(--admin-text-muted)' }}>Modifier</button>
                            <button onClick={() => setEvalTarget(s)} className="underline" style={{ color: 'var(--admin-blue)' }}>Évaluer</button>
                            <DeleteButton variant="text" onClick={() => setConfirmDelete(s)} />
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
                    {['Code', 'Fournisseur', 'Catégorie', 'Contact', 'Sélection', 'Évaluation', 'Classe ISO', 'Prochaine éval.', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const isoClass = s.isoClass ?? (s.evaluationScore !== null ? classFor(s.evaluationScore) : null)
                    return (
                      <tr key={s.id} className={cn('hover:bg-[var(--admin-bg)] transition-colors', s.isoStatus === 'suspendu' ? 'opacity-60' : '')}
                        style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-emerald)' }}>{s.supplierCode ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                          {s.registreCommerce && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.registreCommerce}</p>}
                          {s.dmsDocumentCode && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border mt-0.5 inline-block"
                              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
                              {s.dmsDocumentCode}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[140px]" style={{ color: 'var(--admin-text-muted)' }}>{catLabel(s.category)}</td>
                        <td className="px-4 py-3">
                          {s.contactName && <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{s.contactName}</p>}
                          {s.phone && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.phone}</p>}
                          {s.email && <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--admin-text-muted)' }}>{s.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBadge score={s.selectionScore} cls={s.selectionClass} />
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBadge score={s.evaluationScore} cls={s.evaluationClass} />
                        </td>
                        <td className="px-4 py-3">
                          {isoClass && CLASS_STYLE[isoClass] ? (
                            <span className="text-xs font-bold w-7 h-7 rounded flex items-center justify-center border"
                              style={{ background: CLASS_STYLE[isoClass].bg, color: CLASS_STYLE[isoClass].text, borderColor: CLASS_STYLE[isoClass].border }}>
                              {isoClass}
                            </span>
                          ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {s.nextEvalPlanned ?? '—'}
                          {s.nextEvalDone && <span className="block text-[10px]">✓ {s.nextEvalDone}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit && (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button onClick={() => openEdit(s)} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>Modifier</button>
                              <button onClick={() => setEvalTarget(s)} className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>Évaluer</button>
                              <DeleteButton variant="icon" onClick={() => setConfirmDelete(s)} />
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

      {showForm && (
        <SupplierFormDrawer editing={editing} form={form} setForm={setForm} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
      {evalTarget && (
        <EvalPanel supplier={evalTarget} onClose={() => setEvalTarget(null)} onUpdated={(s) => { handleEvalUpdated(s); setEvalTarget(s) }} />
      )}
      <DeleteModal
        open={!!confirmDelete}
        title="Supprimer le fournisseur ?"
        description={confirmDelete ? <><strong>{confirmDelete.supplierCode && `${confirmDelete.supplierCode} — `}{confirmDelete.name}</strong> sera retiré du registre des fournisseurs agréés.</> : null}
        loading={!!deletingId}
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}
