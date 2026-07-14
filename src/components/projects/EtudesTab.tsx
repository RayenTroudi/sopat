'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlantListBuilder, type PlantRow } from './PlantListBuilder'
import { CloudinaryUploader, type UploadedAsset } from '@/components/upload/CloudinaryUploader'
import { BudgetPredictionPanel } from '@/components/budget/BudgetPredictionPanel'
import { OfficialBudgetCard } from '@/components/budget/OfficialBudgetCard'
import { cn } from '@/lib/utils'
import { type PredictionResult } from '@/lib/ml'

// ─── Types ────────────────────────────────────────────────────────────────────

type ValidationData = {
  id: string
  status: string
  approvedAmount: string | null
  approvedByName: string | null
  approvedAt: Date | null
  modificationReason: string | null
  predictionId: string
}

type Props = {
  projectId: string
  phaseStatus: string
  initialAssets?: UploadedAsset[]
  approvedBudget: string | null      // from project row (source of truth)
  initialValidation?: ValidationData | null
  isAdmin?: boolean
  projectType: string
  siteAreaM2: string | null
  userRole: string
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  badge,
}: {
  title: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          {title}
        </h3>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Sign-off panel ───────────────────────────────────────────────────────────

function SignoffPanel({
  projectId,
  phaseStatus,
  plantCount,
  assets,
}: {
  projectId: string
  phaseStatus: string
  plantCount: number
  assets: UploadedAsset[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const hasRender3d = assets.some((a) => a.assetType === 'render_3d')
  const hasClientVal = assets.some((a) => a.assetType === 'reception_document')

  const checks = [
    { key: 'plant',  label: `Liste végétale — ${plantCount} article(s)`, passed: plantCount > 0 },
    { key: 'render', label: 'Au moins un rendu 3D téléchargé',            passed: hasRender3d },
    { key: 'client', label: 'Document de validation client téléchargé',   passed: hasClientVal },
  ]

  const allPassed = checks.every((c) => c.passed)

  if (phaseStatus === 'completed') {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{ background: 'var(--admin-emerald-dim)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-emerald)', flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="text-sm font-medium" style={{ color: 'var(--admin-emerald)' }}>
          Phase Études validée — projet transmis à la Réalisation.
        </p>
      </div>
    )
  }

  async function handleSignoff() {
    setLoading(true)
    setError([])
    const res = await fetch(`/api/projects/${projectId}/signoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'etudes', notes }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.missing ?? [data.error ?? 'Erreur inconnue'])
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-3">
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                c.passed ? 'bg-[var(--admin-emerald)]' : 'border-2'
              )}
              style={c.passed ? {} : { borderColor: 'var(--admin-border)' }}
            >
              {c.passed && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-sm" style={{ color: c.passed ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>

      <div>
        <label className="block text-xs uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
          Notes de validation (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Commentaires pour l'équipe Réalisation…"
          className="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        />
      </div>

      {error.length > 0 && (
        <ul className="rounded-lg p-3 space-y-1" style={{ background: 'var(--admin-red-dim)' }}>
          {error.map((msg, i) => (
            <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--admin-red)' }}>
              <span className="mt-0.5 flex-shrink-0">!</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={loading || !allPassed}
        onClick={handleSignoff}
        className={cn(
          'w-full text-sm font-medium py-2.5 rounded-lg text-white transition-all',
          !allPassed && 'opacity-40 cursor-not-allowed'
        )}
        style={{ background: 'var(--green)' }}
      >
        {loading ? 'Soumission…' : 'Soumettre a la Realisation'}
      </button>

      {!allPassed && (
        <p className="text-xs text-center" style={{ color: 'var(--admin-text-muted)' }}>
          Completez les elements manquants pour activer la soumission.
        </p>
      )}
    </div>
  )
}

// ─── ML Prediction trigger section ───────────────────────────────────────────

function PredictionSection({
  projectId,
  projectType,
  siteAreaM2,
  plantRows,
  plantCount,
  budgetLocked,
  initialValidation,
  isAdmin,
  onBudgetApproved,
}: {
  projectId: string
  projectType: string
  siteAreaM2: string | null
  plantRows: PlantRow[]
  plantCount: number
  budgetLocked: boolean
  initialValidation: ValidationData | null
  isAdmin: boolean
  onBudgetApproved: (amount: string) => void
}) {
  const [running, setRunning] = useState(false)
  const [prediction, setPrediction] = useState<PredictionResult & { id: string } | null>(null)
  const [runError, setRunError] = useState('')
  const [validation, setValidation] = useState<ValidationData | null>(initialValidation)
  const [budgetLive, setBudgetLive] = useState(budgetLocked)

  // Load existing validation on mount if not passed from server
  useEffect(() => {
    if (initialValidation || !budgetLocked) return
    fetch(`/api/projects/${projectId}/budget-validation`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setValidation(d) })
      .catch(() => {})
  }, [projectId, initialValidation, budgetLocked])

  async function runPrediction() {
    setRunning(true)
    setRunError('')
    // Map PlantRow → ML input format
    const plantList = plantRows
      .filter((r) => r.botanicalName.trim())
      .map((r) => ({
        species:             r.botanicalName,
        category:            r.category,
        quantity:            parseFloat(r.quantity) || 0,
        unit:                r.unit,
        unit_price_estimate: parseFloat(r.unitPriceEstimate) || 0,
      }))

    const now = new Date()
    const month = now.getMonth()
    const season =
      month >= 2 && month <= 4 ? 'spring'
      : month >= 5 && month <= 7 ? 'summer'
      : month >= 8 && month <= 10 ? 'autumn'
      : 'winter'

    const body = {
      project_id:   projectId,
      project_type: projectType || 'residentiel',
      site_area_m2: parseFloat(siteAreaM2 ?? '0') || 0,
      region:       'tunis' as const,
      season,
      plant_list:   plantList,
    }

    try {
      const res = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setRunError(d.error ?? 'Erreur de prédiction')
        return
      }
      // The API saves to DB and returns the result; but we need the prediction ID
      // so we also fetch the latest saved prediction
      const result: PredictionResult = await res.json()

      // Fetch the ID of the just-saved prediction
      const latestRes = await fetch(`/api/projects/${projectId}/latest-prediction`)
      const latestId = latestRes.ok ? (await latestRes.json()).id : null

      setPrediction({ ...result, id: latestId ?? '' })
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setRunning(false)
    }
  }

  function handleAccepted(amount: number) {
    setBudgetLive(true)
    setValidation((prev) => ({
      ...(prev ?? { id: '', predictionId: prediction?.id ?? '', status: 'validated', modificationReason: null }),
      approvedAmount: String(amount),
      approvedByName: null,
      approvedAt: new Date(),
      status: 'validated',
    }))
    onBudgetApproved(String(amount))
  }

  function handleModified(amount: number, reason: string) {
    setBudgetLive(true)
    setValidation((prev) => ({
      ...(prev ?? { id: '', predictionId: prediction?.id ?? '', status: 'modified', modificationReason: reason }),
      approvedAmount: String(amount),
      approvedByName: null,
      approvedAt: new Date(),
      status: 'modified',
      modificationReason: reason,
    }))
    onBudgetApproved(String(amount))
  }

  // Show locked official budget card when approved
  if (budgetLive && validation?.approvedAmount) {
    return (
      <div className="space-y-4">
        <OfficialBudgetCard
          approvedAmount={validation.approvedAmount}
          approvedByName={validation.approvedByName}
          approvedAt={validation.approvedAt}
          validationStatus={validation.status}
          modificationReason={validation.modificationReason}
          isAdmin={isAdmin}
          projectId={projectId}
          onRequestUnlock={isAdmin ? () => setBudgetLive(false) : undefined}
        />

        {/* Allow re-running prediction for comparison (read-only, admin only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setBudgetLive(false)}
            className="text-xs underline"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Voir la derniere prediction (admin)
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Trigger button */}
      {!prediction && (
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            disabled={running || plantCount < 1}
            onClick={runPrediction}
            className={cn(
              'inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-all',
              plantCount < 1 && 'opacity-40 cursor-not-allowed'
            )}
            style={{ background: 'var(--green)' }}
            title={plantCount < 1 ? 'Ajoutez au moins un article a la liste vegetale' : undefined}
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Calcul en cours…
              </>
            ) : (
              <>
                {/* sparkle icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Lancer la Prediction Budgetaire
              </>
            )}
          </button>
          {plantCount < 1 && (
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Enregistrez la liste vegetale avant de lancer la prediction.
            </p>
          )}
          {runError && <p className="text-xs text-[#2F6F4F]">{runError}</p>}
        </div>
      )}

      {/* Prediction result card */}
      {prediction && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Resultats de la prediction ML
            </p>
            <button
              type="button"
              onClick={() => { setPrediction(null); setRunError('') }}
              className="text-xs underline"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              Relancer
            </button>
          </div>
          <BudgetPredictionPanel
            projectId={projectId}
            predictionId={prediction.id}
            result={prediction}
            onAccepted={handleAccepted}
            onModified={handleModified}
            disabled={budgetLive}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main EtudesTab ───────────────────────────────────────────────────────────

export function EtudesTab({
  projectId,
  phaseStatus,
  initialAssets = [],
  approvedBudget,
  initialValidation,
  isAdmin = false,
  projectType,
  siteAreaM2,
}: Props) {
  const [assets, setAssets] = useState<UploadedAsset[]>(initialAssets)
  const [plantCount, setPlantCount] = useState(0)
  const [plantRows, setPlantRows] = useState<PlantRow[]>([])
  const [liveApprovedBudget, setLiveApprovedBudget] = useState<string | null>(approvedBudget)

  const assetsByType = useCallback(
    (type: string) => assets.filter((a) => a.assetType === type),
    [assets]
  )

  function handleUploaded(asset: UploadedAsset) {
    setAssets((prev) => [...prev, asset])
  }

  function handleDeleted(assetId: string) {
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
    fetch(`/api/upload/${assetId}`, { method: 'DELETE' }).catch(() => {})
  }

  const isCompleted = phaseStatus === 'completed'
  const budgetLocked = !!liveApprovedBudget && Number(liveApprovedBudget) > 0

  return (
    <div className="space-y-5">
      {/* 1 — Plant list */}
      <Section
        title="Liste vegetale"
        badge={
          <span
            className="text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
          >
            {plantCount > 0 ? `${plantCount} article(s)` : 'Vide'}
          </span>
        }
      >
        {isCompleted ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Liste vegetale verrouillee — phase Etudes terminee.
          </p>
        ) : (
          <PlantListBuilder
            projectId={projectId}
            onSaved={(rows) => { setPlantCount(rows.length); setPlantRows(rows) }}
          />
        )}
      </Section>

      {/* 2 — ML Budget Prediction */}
      <Section title="Prediction budgetaire ML">
        <PredictionSection
          projectId={projectId}
          projectType={projectType}
          siteAreaM2={siteAreaM2}
          plantRows={plantRows}
          plantCount={plantCount}
          budgetLocked={budgetLocked}
          initialValidation={initialValidation ?? null}
          isAdmin={isAdmin}
          onBudgetApproved={(amount) => setLiveApprovedBudget(amount)}
        />
      </Section>

      {/* 3 — Documents */}
      <Section title="Documents & rendus">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <CloudinaryUploader
            projectId={projectId}
            assetType="render_3d"
            accept="image/*"
            label="Rendus 3D"
            description="JPEG, PNG, WebP"
            existingAssets={assetsByType('render_3d')}
            onUploaded={handleUploaded}
            onDeleted={isCompleted ? undefined : handleDeleted}
          />
          <CloudinaryUploader
            projectId={projectId}
            assetType="plan_autocad"
            accept=".pdf"
            label="Plans AutoCAD (PDF)"
            existingAssets={assetsByType('plan_autocad')}
            onUploaded={handleUploaded}
            onDeleted={isCompleted ? undefined : handleDeleted}
          />
          <CloudinaryUploader
            projectId={projectId}
            assetType="specification"
            accept=".pdf"
            label="Cahier des charges (PDF)"
            existingAssets={assetsByType('specification')}
            onUploaded={handleUploaded}
            onDeleted={isCompleted ? undefined : handleDeleted}
          />
          <CloudinaryUploader
            projectId={projectId}
            assetType="reception_document"
            accept=".pdf"
            label="Validation client (PDF)"
            description="Requis pour la soumission"
            existingAssets={assetsByType('reception_document')}
            onUploaded={handleUploaded}
            onDeleted={isCompleted ? undefined : handleDeleted}
          />
        </div>
      </Section>

      {/* 4 — Sign-off */}
      <Section title="Soumission a la Realisation">
        <SignoffPanel
          projectId={projectId}
          phaseStatus={phaseStatus}
          plantCount={plantCount}
          assets={assets}
        />
      </Section>
    </div>
  )
}
