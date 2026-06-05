'use client'

import { useState } from 'react'
import {
  TokenPageShell,
  ProjectBadge,
  BreakdownTable,
  SectionCard,
  PageFooter,
} from '@/components/token-pages/TokenPageShell'

const SOPAT_GREEN = '#2D5A27'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

type Props = {
  token: string
  chefName: string
  project: {
    name: string
    reference: string
    clientName: string
  }
  prediction: {
    predictedTotal: number
    confidenceLow: number
    confidenceHigh: number
    confidenceScore: number
    breakdown: {
      plants: number
      soil: number
      labor: number
      equipment: number
      logistics: number
    }
    topCostDrivers: string[]
    modelVersion: string
    isFallback: boolean
  }
}

const BREAKDOWN_LABELS: Record<string, string> = {
  plants:    'Végétaux',
  soil:      'Substrats / Sol',
  labor:     'Main-d\'œuvre',
  equipment: 'Équipements',
  logistics: 'Logistique',
}

export function ValidateClient({ token, chefName, project, prediction }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const confidenceColor =
    prediction.confidenceScore >= 75 ? '#16A34A'
    : prediction.confidenceScore >= 55 ? '#D97706'
    : '#DC2626'

  const breakdownRows = Object.entries(prediction.breakdown).map(([key, amount]) => ({
    label: BREAKDOWN_LABELS[key] ?? key,
    amount,
  }))

  async function handleConfirm() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/validate/${token}`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setStatus('success')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <TokenPageShell>
        <div style={{ paddingTop: 32 }}>
          <div
            style={{
              backgroundColor: '#F0FBF0',
              border: '1px solid #BBF7D0',
              borderRadius: 16,
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', marginBottom: 12 }}>
              Budget validé avec succès
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              Merci, {chefName}. Le budget de{' '}
              <strong style={{ color: SOPAT_GREEN }}>{tnd(prediction.predictedTotal)}</strong>{' '}
              a été approuvé et verrouillé dans le système SOPAT.
              <br /><br />
              L&apos;équipe Études et l&apos;administration ont été notifiées.
            </div>
          </div>
          <PageFooter />
        </div>
      </TokenPageShell>
    )
  }

  return (
    <TokenPageShell>
      <div style={{ paddingTop: 24 }}>
        {/* Greeting */}
        <div style={{ padding: '0 4px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            Bonjour {chefName},
          </div>
          <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            Veuillez vérifier la prédiction budgétaire ML ci-dessous et confirmer
            avant de commencer les achats.
          </div>
        </div>

        {/* Project */}
        <ProjectBadge
          name={project.name}
          reference={project.reference}
          clientName={project.clientName}
        />

        {/* Total + confidence */}
        <SectionCard title="Budget total prédit">
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: SOPAT_GREEN }}>
              {tnd(prediction.predictedTotal)}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
              Fourchette : {tnd(prediction.confidenceLow)} – {tnd(prediction.confidenceHigh)}
            </div>
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 20, padding: '4px 12px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: confidenceColor, display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: confidenceColor }}>
                Confiance : {prediction.confidenceScore}%
              </span>
            </div>
            {prediction.isFallback && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#D97706', backgroundColor: '#FFFBEB', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
                ⚠ Estimation manuelle — modèle ML indisponible
              </div>
            )}
          </div>
        </SectionCard>

        {/* Breakdown */}
        <SectionCard title="Répartition du budget">
          <BreakdownTable rows={breakdownRows} total={prediction.predictedTotal} />
        </SectionCard>

        {/* Cost drivers */}
        {prediction.topCostDrivers.length > 0 && (
          <SectionCard title="Principaux postes de coût">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prediction.topCostDrivers.map((driver, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, color: SOPAT_GREEN, minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ fontSize: 14, color: '#374151' }}>{driver}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Disclaimer */}
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
          ⚠ Ces données sont générées automatiquement par le modèle ML SOPAT {prediction.modelVersion}.
          En validant, vous confirmez avoir vérifié les montants et approuvez leur utilisation comme
          budget officiel du projet.
        </div>

        {/* Error */}
        {status === 'error' && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
            {errorMsg}
          </div>
        )}

        {/* Confirm button */}
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={status === 'loading'}
          style={{
            width: '100%',
            backgroundColor: status === 'loading' ? '#6B7280' : SOPAT_GREEN,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '16px 24px',
            fontSize: 16,
            fontWeight: 700,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {status === 'loading' ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              Validation en cours…
            </>
          ) : (
            '✓ Confirmer la Validation'
          )}
        </button>

        <a
          href={window.location.href.replace('/validate/', '/edit/')}
          style={{
            display: 'block',
            width: '100%',
            backgroundColor: 'transparent',
            color: '#D97706',
            border: '1px solid #FCD34D',
            borderRadius: 12,
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          ✎ Modifier les montants
        </a>

        <PageFooter />
      </div>
    </TokenPageShell>
  )
}
