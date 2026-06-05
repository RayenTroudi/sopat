'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DocumentRow } from '@/lib/db/iso'

const STATUS_LABELS: Record<string, string> = {
  draft:    'Brouillon',
  active:   'Actif',
  obsolete: 'Obsolète',
}
const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  active:   'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  obsolete: 'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
}
const CATEGORY_LABELS: Record<string, string> = {
  procedure:      'Procédure',
  instruction:    'Instruction',
  formulaire:     'Formulaire',
  enregistrement: 'Enregistrement',
  autre:          'Autre',
}
const PROCESS_LABELS: Record<string, string> = {
  etudes: 'Études', realisation: 'Réalisation', entretien: 'Entretien',
}

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string }

type Props = {
  initialRows:  DocumentRow[]
  total:        number
  users:        User[]
  isAdmin:      boolean
  currentUserId: string
}

export function DocumentsClient({ initialRows, total, users, isAdmin, currentUserId }: Props) {
  const [rows, setRows]         = useState(initialRows)
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch]     = useState('')
  const [uploadedAssetId, setUploadedAssetId] = useState('')
  const [uploadedAssetUrl, setUploadedAssetUrl] = useState('')
  const [uploadState, setUploadState] = useState<'idle'|'uploading'|'done'>('idle')

  const [form, setForm] = useState({
    code: '', title: '', category: 'procedure', version: '1.0',
    status: 'active', ownerId: currentUserId,
    isoClause: '', processAffected: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  async function loadDocs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus)   params.set('status',   filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (search)         params.set('search',   search)
    const res = await fetch(`/api/documents?${params}`)
    if (res.ok) {
      const data = await res.json() as { rows: DocumentRow[] }
      setRows(data.rows)
    }
    setLoading(false)
  }

  async function uploadInvoice(file: File) {
    setUploadState('uploading')
    try {
      const sigRes = await fetch(`/api/upload?projectId=00000000-0000-0000-0000-000000000000`)
      if (!sigRes.ok) throw new Error()
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json() as Record<string,string>
      const fd = new FormData()
      fd.append('file', file); fd.append('signature', signature)
      fd.append('timestamp', timestamp); fd.append('api_key', apiKey); fd.append('folder', folder)
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method:'POST', body: fd })
      const result = await upRes.json() as { public_id:string; url:string; secure_url:string; format:string; bytes:number }
      const recRes = await fetch('/api/upload', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ publicId:result.public_id, url:result.url, secureUrl:result.secure_url, assetType:'other', format:result.format, bytes:result.bytes, projectId: null }),
      })
      const asset = await recRes.json() as { id:string; secureUrl:string }
      setUploadedAssetId(asset.id)
      setUploadedAssetUrl(asset.secureUrl)
      setUploadState('done')
    } catch { setUploadState('idle') }
  }

  async function handleCreate() {
    if (!form.code.trim()) { setFormError('Le code est obligatoire'); return }
    if (!form.title.trim()) { setFormError('Le titre est obligatoire'); return }
    setSubmitting(true); setFormError('')
    const res = await fetch('/api/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        code: form.code.toUpperCase(),
        assetId: uploadedAssetId || undefined,
        processAffected: form.processAffected || undefined,
        isoClause: form.isoClause || undefined,
        notes: form.notes || undefined,
      }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setUploadedAssetId(''); setUploadedAssetUrl(''); setUploadState('idle')
    setForm({ code:'', title:'', category:'procedure', version:'1.0', status:'active', ownerId:currentUserId, isoClause:'', processAffected:'', notes:'' })
    await loadDocs()
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Contrôle Documentaire</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 7.5 · {rows.filter(r => r.status === 'active').length} document{rows.filter(r => r.status === 'active').length !== 1 ? 's' : ''} actif{rows.filter(r => r.status === 'active').length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--admin-emerald)' }}>
            <span>+</span> Nouveau document
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => void loadDocs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)', color:'var(--admin-text)' }}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setTimeout(() => void loadDocs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)', color:'var(--admin-text)' }}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key==='Enter' && void loadDocs()}
          placeholder="Rechercher code / titre…" className="text-sm px-3 py-1.5 rounded-lg border flex-1 min-w-[160px]"
          style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)', color:'var(--admin-text)' }} />
        <button onClick={() => void loadDocs()} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Filtrer</button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)' }}>
        {loading ? (
          <div className="py-12 flex justify-center"><span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor:'var(--admin-border)', borderTopColor:'var(--admin-emerald)' }} /></div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color:'var(--admin-text-muted)' }}>Aucun document trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom:'1px solid var(--admin-border)' }}>
                  {['Code', 'Titre', 'Catégorie', 'Version', 'Statut', 'Processus', 'Propriétaire', 'Mis à jour', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr key={doc.id} className="transition-colors hover:bg-[var(--admin-bg)]" style={{ borderBottom:'1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color:'var(--admin-text)' }}>{doc.code}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-sm font-medium" style={{ color:'var(--admin-text)' }}>{doc.title}</p>
                      {doc.isoClause && <p className="text-xs" style={{ color:'var(--admin-text-muted)' }}>ISO {doc.isoClause}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color:'var(--admin-text-muted)' }}>{CATEGORY_LABELS[doc.category] ?? doc.category}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color:'var(--admin-text)' }}>{doc.version}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft)}>
                        {STATUS_LABELS[doc.status] ?? doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color:'var(--admin-text-muted)' }}>
                      {doc.processAffected ? (PROCESS_LABELS[doc.processAffected] ?? doc.processAffected) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color:'var(--admin-text-muted)' }}>{doc.ownerName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color:'var(--admin-text-muted)' }}>{fmt(doc.updatedAt)}</td>
                    <td className="px-4 py-3">
                      {doc.assetUrl && (
                        <a href={doc.assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color:'var(--admin-blue)' }}>PDF</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create document drawer */}
      {showForm && isAdmin && (
        <>
          <div className="fixed inset-0 z-40" style={{ background:'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto" style={{ background:'var(--admin-surface)', borderLeft:'1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor:'var(--admin-border)' }}>
              <h2 className="text-base font-semibold" style={{ color:'var(--admin-text)' }}>Nouveau document ISO</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]" style={{ color:'var(--admin-text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FF label="Code *"><input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PRO-001" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} /></FF>
                <FF label="Version *"><input value={form.version} onChange={(e) => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} /></FF>
              </div>
              <FF label="Titre *"><input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ex: Procédure de maîtrise des non-conformités" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} /></FF>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Catégorie">
                  <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                    {Object.entries(CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FF>
                <FF label="Statut">
                  <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                    <option value="draft">Brouillon</option>
                    <option value="active">Actif</option>
                  </select>
                </FF>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Clause ISO">
                  <input value={form.isoClause} onChange={(e) => setForm(f => ({ ...f, isoClause: e.target.value }))} placeholder="ex: 10.2" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                </FF>
                <FF label="Processus">
                  <select value={form.processAffected} onChange={(e) => setForm(f => ({ ...f, processAffected: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                    <option value="">— Aucun —</option>
                    <option value="etudes">Études</option>
                    <option value="realisation">Réalisation</option>
                    <option value="entretien">Entretien</option>
                  </select>
                </FF>
              </div>
              <FF label="Propriétaire">
                <select value={form.ownerId} onChange={(e) => setForm(f => ({ ...f, ownerId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FF>

              {/* PDF Upload */}
              <FF label="Fichier PDF">
                {uploadState === 'done' ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor:'var(--admin-emerald)', background:'var(--admin-emerald-dim)' }}>
                    <span className="text-sm" style={{ color:'var(--admin-emerald)' }}>✓ PDF téléchargé</span>
                    <button onClick={() => { setUploadedAssetId(''); setUploadedAssetUrl(''); setUploadState('idle') }} className="text-xs underline ml-auto" style={{ color:'var(--admin-text-muted)' }}>Supprimer</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed text-sm cursor-pointer hover:border-[var(--admin-emerald)] transition-colors" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>
                    {uploadState === 'uploading' ? 'Téléchargement…' : '↑ Joindre le PDF'}
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadInvoice(f) }} />
                  </label>
                )}
              </FF>

              <FF label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
              </FF>

              {formError && <p className="text-sm px-3 py-2 rounded-lg" style={{ background:'var(--admin-red-dim)', color:'var(--admin-red)' }}>{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>
                <button onClick={() => void handleCreate()} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
