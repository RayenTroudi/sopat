'use client'

import { useState, useRef } from 'react'
import type { ContractRow } from '@/lib/db/entretien'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const FREQUENCY_OPTIONS = [
  { value: 'hebdomadaire',     label: 'Hebdomadaire',    days: 7   },
  { value: 'bimensuel',        label: 'Bimensuel',       days: 14  },
  { value: 'mensuel',          label: 'Mensuel',         days: 30  },
  { value: 'trimestriel',      label: 'Trimestriel',     days: 90  },
]

type Props = {
  projectId: string
  contract:  ContractRow | null
  onUpdated: (c: ContractRow) => void
}

function fmtDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
}

export function ContractSection({ projectId, contract, onUpdated }: Props) {
  const [editing, setEditing]   = useState(!contract)
  const [uploading, setUploading] = useState(false)
  const [assetId,  setAssetId]  = useState(contract?.contractAssetId ?? '')
  const [assetUrl, setAssetUrl] = useState(contract?.contractAssetUrl ?? '')
  const [form, setForm]         = useState({
    contractStartDate:  contract?.contractStartDate ? new Date(contract.contractStartDate).toISOString().slice(0,10) : '',
    contractEndDate:    contract?.contractEndDate   ? new Date(contract.contractEndDate).toISOString().slice(0,10) : '',
    visitFrequency:     contract?.visitFrequency    ?? 'mensuel',
    visitFrequencyDays: contract?.visitFrequencyDays ?? 30,
    monthlyCost:        contract?.monthlyCost       ?? '',
    notes:              contract?.notes             ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadContract(file: File) {
    setUploading(true)
    try {
      const sigRes = await fetch(`/api/upload?projectId=${encodeURIComponent(projectId)}`)
      if (!sigRes.ok) throw new Error()
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json() as Record<string,string>
      const fd = new FormData()
      fd.append('file', file); fd.append('signature', signature)
      fd.append('timestamp', timestamp); fd.append('api_key', apiKey); fd.append('folder', folder)
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method:'POST', body:fd })
      const result = await upRes.json() as { public_id:string; url:string; secure_url:string; format:string; bytes:number }
      const recRes = await fetch('/api/upload', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ publicId:result.public_id, url:result.url, secureUrl:result.secure_url, assetType:'contract', format:result.format, bytes:result.bytes, projectId }),
      })
      const asset = await recRes.json() as { id:string; secureUrl:string }
      setAssetId(asset.id); setAssetUrl(asset.secureUrl)
    } catch { setError('Erreur lors du téléchargement') }
    finally { setUploading(false) }
  }

  async function handleSave() {
    setSaving(true); setError('')
    const res = await fetch(`/api/projects/${projectId}/maintenance-contract`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractStartDate:  form.contractStartDate  ? new Date(form.contractStartDate).toISOString()  : undefined,
        contractEndDate:    form.contractEndDate    ? new Date(form.contractEndDate).toISOString()    : undefined,
        visitFrequency:     form.visitFrequency,
        visitFrequencyDays: form.visitFrequencyDays,
        monthlyCost:        form.monthlyCost || undefined,
        contractAssetId:    assetId || undefined,
        notes:              form.notes || undefined,
      }),
    })
    const data = await res.json() as ContractRow & { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSaving(false); return }
    onUpdated(data)
    setEditing(false)
    setSaving(false)
  }

  if (!editing && contract) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoCell label="Début du contrat" value={fmtDate(contract.contractStartDate)} />
          <InfoCell label="Fin du contrat"   value={fmtDate(contract.contractEndDate)} />
          <InfoCell label="Fréquence" value={FREQUENCY_OPTIONS.find((f) => f.value === contract.visitFrequency)?.label ?? contract.visitFrequency ?? '—'} />
          <InfoCell label="Coût mensuel" value={contract.monthlyCost ? `${FMT.format(parseFloat(contract.monthlyCost))} TND` : '—'} />
        </div>
        {contract.notes && (
          <p className="text-sm" style={{ color:'var(--admin-text-muted)' }}>{contract.notes}</p>
        )}
        <div className="flex gap-3">
          {contract.contractAssetUrl && (
            <a href={contract.contractAssetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color:'var(--admin-blue)' }}>
              Voir le contrat PDF
            </a>
          )}
          <button onClick={() => setEditing(true)} className="text-xs underline" style={{ color:'var(--admin-text-muted)' }}>
            Modifier
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FF label="Début du contrat">
          <input type="date" value={form.contractStartDate} onChange={(e) => setForm((f) => ({ ...f, contractStartDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
        </FF>
        <FF label="Fin du contrat">
          <input type="date" value={form.contractEndDate} onChange={(e) => setForm((f) => ({ ...f, contractEndDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
        </FF>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FF label="Fréquence des visites">
          <Select
            value={form.visitFrequency}
            onValueChange={(v) => {
              const opt = FREQUENCY_OPTIONS.find((o) => o.value === v)
              setForm((f) => ({ ...f, visitFrequency: v, visitFrequencyDays: opt?.days ?? f.visitFrequencyDays }))
            }}
          >
            <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              {FREQUENCY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FF>
        <FF label="Coût mensuel (TND)">
          <input type="number" step="any" min="0" value={form.monthlyCost} onChange={(e) => setForm((f) => ({ ...f, monthlyCost: e.target.value }))} placeholder="ex: 350" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
        </FF>
      </div>

      <FF label="Contrat PDF">
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) void uploadContract(f) }} />
        {assetUrl ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor:'var(--admin-emerald)', background:'var(--admin-emerald-dim)' }}>
            <span className="text-sm flex-1 truncate" style={{ color:'var(--admin-emerald)' }}>✓ Contrat téléchargé</span>
            <a href={assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color:'var(--admin-blue)' }}>Voir</a>
            <button onClick={() => { setAssetId(''); setAssetUrl('') }} className="text-xs" style={{ color:'var(--admin-text-muted)' }}>Supprimer</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed text-sm disabled:opacity-60" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>
            {uploading ? 'Téléchargement…' : '↑ Joindre le contrat PDF'}
          </button>
        )}
      </FF>

      <FF label="Notes">
        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
      </FF>

      {error && <p className="text-sm" style={{ color:'var(--admin-red)' }}>{error}</p>}

      <div className="flex gap-3">
        {contract && <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>}
        <button onClick={() => void handleSave()} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
          {saving ? 'Sauvegarde…' : 'Enregistrer le contrat'}
        </button>
      </div>
    </div>
  )
}

function FF({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function InfoCell({ label, value }: { label:string; value:string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide" style={{ color:'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color:'var(--admin-text)' }}>{value}</p>
    </div>
  )
}
