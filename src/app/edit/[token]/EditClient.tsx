'use client'

import { useState } from 'react'
import {
  TokenPageShell,
  ProjectBadge,
  SectionCard,
  PageFooter,
} from '@/components/token-pages/TokenPageShell'

const SOPAT_GREEN = '#2D5A27'
const SOPAT_AMBER = '#D97706'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

type Breakdown = {
  plants:    number
  soil:      number
  labor:     number
  equipment: number
  logistics: number
}

type Props = {
  token: string
  chefName: string
  project: {
    name:       string
    reference:  string
    clientName: string
  }
  prediction: {
    predictedTotal:  number
    breakdown:       Breakdown
    topCostDrivers:  string[]
    modelVersion:    string
  }
}

const FIELDS: { key: keyof Breakdown; label: string; hint: string }[] = [
  { key: 'plants',    label: 'Végétaux',         hint: 'Plants, arbres, arbustes, couvre-sols' },
  { key: 'soil',      label: 'Substrats / Sol',  hint: 'Terre végétale, amendements, tourbe' },
  { key: 'labor',     label: 'Main-d\'œuvre',    hint: 'Heures équipe terrain + encadrement' },
  { key: 'equipment', label: 'Équipements',       hint: 'Matériel, outillage, location engins' },
  { key: 'logistics', label: 'Logistique',        hint: 'Transport, livraisons, carburant' },
]

export function EditClient({ token, chefName, project, prediction }: Props) {
  const [values, setValues]  = useState<Breakdown>({ ...prediction.breakdown })
  const [reason, setReason]  = useState('')
  const [status, setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors]  = useState<Record<string, string>>({})

  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0)
  const origTotal = prediction.predictedTotal
  const diff = total - origTotal

  function handleValueChange(key: keyof Breakdown, raw: string) {
    const n = parseFloat(raw)
    setValues((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }))
  }

  function validate() {
    const e: Record<string, string> = {}
    for (const { key, label } of FIELDS) {
      if (values[key] < 0) e[key] = `${label} ne peut pas être négatif`
    }
    if (reason.trim().length < 20) {
      e.reason = 'La raison doit comporter au moins 20 caractères'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/edit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, modificationReason: reason }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; details?: unknown }
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
              backgroundColor: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 16,
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: SOPAT_AMBER, marginBottom: 12 }}>
              Modifications enregistrées
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              Merci, {chefName}. Vos valeurs modifiées ({tnd(total)}) ont été enregistrées
              comme budget officiel du projet <strong>{project.reference}</strong>.
              <br /><br />
              L&apos;équipe d&apos;administration a été notifiée avec le détail des modifications.
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
            Modifier le budget, {chefName}
          </div>
          <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            Ajustez les montants par poste selon votre estimation terrain.
            Une raison de modification est obligatoire (traçabilité ISO 9001).
          </div>
        </div>

        {/* Project */}
        <ProjectBadge
          name={project.name}
          reference={project.reference}
          clientName={project.clientName}
        />

        {/* ML reference */}
        <div
          style={{
            backgroundColor: '#F9FBF9',
            border: '1px solid #D6E4D3',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: '#6B7280' }}>Budget ML prédit</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280', textDecoration: 'line-through' }}>
            {tnd(origTotal)}
          </span>
        </div>

        {/* Editable breakdown */}
        <SectionCard title="Répartition modifiée">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FIELDS.map(({ key, label, hint }) => (
              <div key={key}>
                <label
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}
                >
                  {label}
                </label>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>{hint}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={values[key] || ''}
                    onChange={(e) => handleValueChange(key, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: `1px solid ${errors[key] ? '#FECACA' : '#D1D5DB'}`,
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#111827',
                      backgroundColor: errors[key] ? '#FEF2F2' : '#fff',
                      outline: 'none',
                      WebkitAppearance: 'none',
                    }}
                    placeholder="0"
                  />
                  <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>TND</span>
                </div>
                {errors[key] && (
                  <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{errors[key]}</div>
                )}
              </div>
            ))}

            {/* Live total */}
            <div
              style={{
                borderTop: '2px solid #E5E7EB',
                paddingTop: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Nouveau total</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: SOPAT_GREEN }}>{tnd(total)}</span>
                {diff !== 0 && (
                  <div style={{ fontSize: 12, color: diff > 0 ? '#DC2626' : '#16A34A', marginTop: 2 }}>
                    {diff > 0 ? '+' : ''}{tnd(diff)} vs ML
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Reason */}
        <SectionCard title="Raison de la modification *">
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
            Obligatoire — minimum 20 caractères. Traçabilité ISO 9001:2015 clause 8.1.
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Exemple : Les prix des Phoenix dactylifera ont augmenté de 15% depuis l'estimation Études. Le substrat local disponible est moins coûteux que prévu."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${errors.reason ? '#FECACA' : '#D1D5DB'}`,
              borderRadius: 8,
              fontSize: 14,
              color: '#111827',
              backgroundColor: errors.reason ? '#FEF2F2' : '#fff',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {errors.reason ? (
              <span style={{ fontSize: 11, color: '#DC2626' }}>{errors.reason}</span>
            ) : (
              <span />
            )}
            <span style={{ fontSize: 11, color: reason.length >= 20 ? '#16A34A' : '#9CA3AF' }}>
              {reason.length}/20 min
            </span>
          </div>
        </SectionCard>

        {/* Error */}
        {status === 'error' && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: '#DC2626',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={status === 'loading'}
          style={{
            width: '100%',
            backgroundColor: status === 'loading' ? '#6B7280' : SOPAT_AMBER,
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
                }}
              />
              Enregistrement…
            </>
          ) : (
            '✎ Soumettre les modifications'
          )}
        </button>

        <PageFooter />
      </div>
    </TokenPageShell>
  )
}
