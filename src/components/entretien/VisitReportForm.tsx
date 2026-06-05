'use client'

import { useState, useRef } from 'react'
import type { ScheduledVisitRow } from '@/lib/db/entretien'
import { cn } from '@/lib/utils'

const VISIT_TYPE_OPTIONS = [
  { value: 'taille',                    label: 'Taille' },
  { value: 'arrosage',                  label: 'Arrosage' },
  { value: 'traitement_phytosanitaire', label: 'Traitement phytosanitaire' },
  { value: 'fertilisation',            label: 'Fertilisation' },
  { value: 'controle_general',         label: 'Contrôle général' },
  { value: 'other',                    label: 'Autre' },
]

const WORK_CHECKLIST_ITEMS = [
  { key: 'taille',        label: 'Taille' },
  { key: 'arrosage',      label: 'Arrosage' },
  { key: 'desherbage',    label: 'Désherbage' },
  { key: 'traitement',    label: 'Traitement phytosanitaire' },
  { key: 'fertilisation', label: 'Fertilisation' },
  { key: 'nettoyage',     label: 'Nettoyage du site' },
]

const HEALTH_STATUSES = [
  { value: 'healthy',   label: 'Sain',      color: '#16A34A' },
  { value: 'attention', label: 'Attention',  color: '#D97706' },
  { value: 'critical',  label: 'Critique',   color: '#DC2626' },
]

type User = { id: string; name: string }

type Props = {
  projectId:     string
  scheduledVisit?: ScheduledVisitRow
  plantZones:    string[]  // from études plant categories
  users:         User[]
  currentUserId: string
  onSubmitted:   () => void
  onClose:       () => void
}

export function VisitReportForm({
  projectId, scheduledVisit, plantZones, users, currentUserId, onSubmitted, onClose,
}: Props) {
  const [visitDate,     setVisitDate]     = useState(scheduledVisit ? new Date(scheduledVisit.visitDate).toISOString().slice(0,16) : new Date().toISOString().slice(0,16))
  const [visitType,     setVisitType]     = useState(scheduledVisit?.visitType ?? 'controle_general')
  const [duration,      setDuration]      = useState(scheduledVisit?.durationHours ?? '')
  const [teamMemberId,  setTeamMemberId]  = useState(scheduledVisit?.teamMemberId ?? currentUserId)
  const [workDone,      setWorkDone]      = useState('')
  const [checklist,     setChecklist]     = useState<Record<string,boolean>>({})
  const [products,      setProducts]      = useState<{name:string;quantity:string;unit:string}[]>([])
  const [issuesFound,   setIssuesFound]   = useState('')
  const [nextVisit,     setNextVisit]     = useState('')
  const [healthZones,   setHealthZones]   = useState<{zoneName:string;healthStatus:string;healthScore:number;observations:string}[]>(
    plantZones.map((z) => ({ zoneName: z, healthStatus: 'healthy', healthScore: 5, observations: '' }))
  )
  const [beforeAssetId, setBeforeAssetId] = useState('')
  const [afterAssetId,  setAfterAssetId]  = useState('')
  const [beforeUrl,     setBeforeUrl]     = useState('')
  const [afterUrl,      setAfterUrl]      = useState('')
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter,  setUploadingAfter]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef  = useRef<HTMLInputElement>(null)

  async function uploadPhoto(file: File, slot: 'before' | 'after') {
    if (slot === 'before') setUploadingBefore(true)
    else setUploadingAfter(true)
    try {
      const sigRes = await fetch(`/api/upload?projectId=${encodeURIComponent(projectId)}`)
      if (!sigRes.ok) throw new Error()
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json() as Record<string,string>
      const fd = new FormData()
      fd.append('file', file); fd.append('signature', signature)
      fd.append('timestamp', timestamp); fd.append('api_key', apiKey); fd.append('folder', folder)
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd })
      const result = await upRes.json() as { public_id:string; url:string; secure_url:string; format:string; bytes:number; width:number; height:number }
      const recRes = await fetch('/api/upload', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ publicId:result.public_id, url:result.url, secureUrl:result.secure_url, assetType:'site_photo', format:result.format, bytes:result.bytes, width:result.width, height:result.height, projectId }),
      })
      const asset = await recRes.json() as { id:string; secureUrl:string }
      if (slot === 'before') { setBeforeAssetId(asset.id); setBeforeUrl(asset.secureUrl) }
      else { setAfterAssetId(asset.id); setAfterUrl(asset.secureUrl) }
    } catch { setError('Erreur lors du téléchargement') }
    finally {
      if (slot === 'before') setUploadingBefore(false)
      else setUploadingAfter(false)
    }
  }

  function addProduct() {
    setProducts((p) => [...p, { name:'', quantity:'1', unit:'L' }])
  }
  function removeProduct(i: number) {
    setProducts((p) => p.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (!workDone.trim()) { setError('Décrivez les travaux effectués'); return }
    setSubmitting(true); setError('')
    const res = await fetch(`/api/projects/${projectId}/visit-report`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        visitId:                 scheduledVisit?.id,
        visitDate:               new Date(visitDate).toISOString(),
        visitType,
        durationHours:           duration || undefined,
        teamMemberId,
        workDone,
        workChecklist:           checklist,
        productsUsed:            products.filter((p) => p.name.trim()).map((p) => ({ name:p.name, quantity:Number(p.quantity), unit:p.unit })),
        issuesFound:             issuesFound || undefined,
        nextVisitRecommendation: nextVisit || undefined,
        beforePhotoAssetId:      beforeAssetId || undefined,
        afterPhotoAssetId:       afterAssetId  || undefined,
        healthZones:             healthZones.map((z) => ({ ...z, healthScore:Number(z.healthScore) })),
      }),
    })
    const data = await res.json() as { ok?:boolean; error?:string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSubmitting(false); return }
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0" style={{ background:'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative w-full max-w-xl h-full overflow-y-auto flex flex-col shadow-xl" style={{ background:'var(--admin-surface)', borderLeft:'1px solid var(--admin-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 sticky top-0" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)', zIndex:10 }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color:'var(--admin-text)' }}>
              {scheduledVisit ? 'Rapport de visite' : 'Nouvelle visite'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color:'var(--admin-text-muted)' }}>Entretien & Suivi</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--admin-bg)]" style={{ color:'var(--admin-text-muted)' }}>✕</button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Date + type */}
          <div className="grid grid-cols-2 gap-3">
            <FF label="Date & heure *">
              <input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
            </FF>
            <FF label="Type de visite *">
              <select value={visitType} onChange={(e) => setVisitType(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                {VISIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FF>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Durée réelle (h)">
              <input type="number" step="0.5" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="2.5" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
            </FF>
            <FF label="Équipe présente">
              <select value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FF>
          </div>

          {/* Work checklist */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>Travaux réalisés</label>
            <div className="grid grid-cols-2 gap-2">
              {WORK_CHECKLIST_ITEMS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checklist[item.key]}
                    onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm" style={{ color:'var(--admin-text)' }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <FF label="Description des travaux *">
            <textarea value={workDone} onChange={(e) => setWorkDone(e.target.value)} rows={3} placeholder="Détail des interventions effectuées…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
          </FF>

          {/* Plant health per zone */}
          {healthZones.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>Bilan santé végétale par zone</label>
              {healthZones.map((z, i) => (
                <div key={z.zoneName} className="rounded-xl border p-3 space-y-2" style={{ borderColor:'var(--admin-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color:'var(--admin-text)' }}>{z.zoneName}</span>
                    <div className="flex gap-1">
                      {HEALTH_STATUSES.map((hs) => (
                        <button
                          key={hs.value}
                          type="button"
                          onClick={() => setHealthZones((zones) => zones.map((zone, idx) => idx === i ? { ...zone, healthStatus: hs.value } : zone))}
                          className={cn('text-xs px-2 py-0.5 rounded-full border font-medium transition-all', z.healthStatus === hs.value ? 'text-white' : 'bg-transparent')}
                          style={{
                            borderColor:     hs.color,
                            backgroundColor: z.healthStatus === hs.value ? hs.color : 'transparent',
                            color:           z.healthStatus === hs.value ? '#fff' : hs.color,
                          }}
                        >
                          {hs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color:'var(--admin-text-muted)' }}>Score</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setHealthZones((zones) => zones.map((zone, idx) => idx === i ? { ...zone, healthScore: score } : zone))}
                          className="w-7 h-7 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            borderColor:     'var(--admin-border)',
                            backgroundColor: z.healthScore === score ? 'var(--admin-emerald)' : 'transparent',
                            color:           z.healthScore === score ? '#fff' : 'var(--admin-text-muted)',
                          }}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    value={z.observations}
                    onChange={(e) => setHealthZones((zones) => zones.map((zone, idx) => idx === i ? { ...zone, observations: e.target.value } : zone))}
                    placeholder="Observations…"
                    className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Products used */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>Produits utilisés</label>
              <button onClick={addProduct} className="text-xs underline" style={{ color:'var(--admin-blue)' }}>+ Ajouter</button>
            </div>
            {products.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_70px_24px] gap-2 items-center">
                <input value={p.name} onChange={(e) => setProducts((ps) => ps.map((pp,j) => j===i ? {...pp, name:e.target.value} : pp))} placeholder="Produit" className="px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                <input type="number" value={p.quantity} onChange={(e) => setProducts((ps) => ps.map((pp,j) => j===i ? {...pp, quantity:e.target.value} : pp))} placeholder="Qté" className="px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                <select value={p.unit} onChange={(e) => setProducts((ps) => ps.map((pp,j) => j===i ? {...pp, unit:e.target.value} : pp))} className="px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                  {['L','mL','kg','g','unité'].map((u) => <option key={u}>{u}</option>)}
                </select>
                <button onClick={() => removeProduct(i)} className="text-xs" style={{ color:'var(--admin-red)' }}>✕</button>
              </div>
            ))}
          </div>

          <FF label="Problèmes constatés">
            <textarea value={issuesFound} onChange={(e) => setIssuesFound(e.target.value)} rows={2} placeholder="Problèmes observés → créer une NC si nécessaire" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
          </FF>

          <FF label="Recommandation prochaine visite">
            <input value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} placeholder="ex: Retour dans 3 semaines pour contrôle arrosage" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
          </FF>

          {/* Before / after photos */}
          <div className="grid grid-cols-2 gap-3">
            <PhotoSlot label="Photo avant *" url={beforeUrl} uploading={uploadingBefore} inputRef={beforeRef} onPick={() => beforeRef.current?.click()} onFile={(f) => void uploadPhoto(f, 'before')} />
            <PhotoSlot label="Photo après" url={afterUrl} uploading={uploadingAfter} inputRef={afterRef} onPick={() => afterRef.current?.click()} onFile={(f) => void uploadPhoto(f, 'after')} />
          </div>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background:'var(--admin-red-dim)', color:'var(--admin-red)' }}>{error}</p>}

          <div className="flex gap-3 pb-4">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>
            <button onClick={() => void handleSubmit()} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
              {submitting ? 'Enregistrement…' : 'Sauvegarder le rapport'}
            </button>
          </div>
        </div>
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

function PhotoSlot({ label, url, uploading, inputRef, onPick, onFile }: {
  label:string; url:string; uploading:boolean;
  inputRef:React.RefObject<HTMLInputElement | null>;
  onPick:()=>void; onFile:(f:File)=>void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>{label}</label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) onFile(f) }} />
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="w-full h-24 rounded-lg object-cover border" style={{ borderColor:'var(--admin-emerald)' }} />
      ) : (
        <button type="button" onClick={onPick} disabled={uploading} className="w-full h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs disabled:opacity-60" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>
          {uploading ? 'Upload…' : <><span className="text-xl">📷</span>Télécharger</>}
        </button>
      )}
    </div>
  )
}
