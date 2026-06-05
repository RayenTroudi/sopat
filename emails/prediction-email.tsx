import { Section, Text, Row, Column, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER, APP_URL } from './_layout'

export type PredictionEmailProps = {
  chefName:         string
  projectName:      string
  projectReference: string
  predictedTotal:   number
  confidenceLow:    number
  confidenceHigh:   number
  confidenceScore:  number
  breakdown: {
    plants:     number
    soil:       number
    labor:      number
    equipment:  number
    logistics:  number
  }
  topCostDrivers:   string[]
  modelVersion:     string
  isFallback:       boolean
  validateUrl:      string
  editUrl:          string
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

const BREAKDOWN_LABELS: Record<string, string> = {
  plants:    'Végétaux',
  soil:      'Substrats / Sol',
  labor:     'Main-d\'œuvre',
  equipment: 'Équipements',
  logistics: 'Logistique',
}

export function PredictionEmail({
  chefName,
  projectName,
  projectReference,
  predictedTotal,
  confidenceLow,
  confidenceHigh,
  confidenceScore,
  breakdown,
  topCostDrivers,
  modelVersion,
  isFallback,
  validateUrl,
  editUrl,
}: PredictionEmailProps) {
  const confidenceColor =
    confidenceScore >= 75 ? '#16A34A' : confidenceScore >= 55 ? '#D97706' : '#DC2626'

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0)

  return (
    <EmailLayout preview={`Prédiction budgétaire ML pour ${projectReference} — ${projectName}`}>
      {/* Greeting */}
      <Text style={{ fontSize: 16, color: '#111827', margin: '0 0 8px', fontWeight: 600 }}>
        Bonjour {chefName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', margin: '0 0 24px', lineHeight: 1.6 }}>
        Le système SOPAT a généré une prédiction budgétaire ML pour le projet qui vous est assigné.
        Veuillez examiner les données ci-dessous et valider ou modifier avant le début des achats.
      </Text>

      {/* Project badge */}
      <Section style={{ backgroundColor: '#F0FBF0', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <Text style={{ margin: 0, fontSize: 13, color: SOPAT_MUTED }}>Projet</Text>
        <Text style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: '#111827' }}>
          {projectName}
        </Text>
        <Text style={{ margin: '2px 0 0', fontSize: 12, color: SOPAT_MUTED }}>
          Référence : {projectReference}
        </Text>
      </Section>

      {/* Predicted total */}
      <Section style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 13, color: SOPAT_MUTED }}>
          COÛT TOTAL PRÉDIT
        </Text>
        <Text style={{ margin: '0 0 4px', fontSize: 36, fontWeight: 800, color: SOPAT_GREEN }}>
          {tnd(predictedTotal)}
        </Text>
        <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>
          Fourchette : {tnd(confidenceLow)} – {tnd(confidenceHigh)} · Score de confiance :{' '}
          <span style={{ color: confidenceColor, fontWeight: 600 }}>{confidenceScore}%</span>
        </Text>
        {isFallback && (
          <Text style={{ margin: '8px 0 0', fontSize: 11, color: '#D97706', backgroundColor: '#FFFBEB', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
            ⚠ Estimation manuelle (modèle ML indisponible)
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 24px' }} />

      {/* Breakdown table */}
      <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
        Répartition du budget
      </Text>
      <Section style={{ border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        {/* Table header */}
        <Row style={{ backgroundColor: SOPAT_GREEN }}>
          <Column style={{ padding: '10px 16px' }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>Poste</Text>
          </Column>
          <Column style={{ padding: '10px 16px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>Montant</Text>
          </Column>
          <Column style={{ padding: '10px 16px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>%</Text>
          </Column>
        </Row>

        {/* Rows */}
        {Object.entries(breakdown).map(([key, value], idx) => {
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FBF9'
          return (
            <Row key={key} style={{ backgroundColor: bg, borderTop: `1px solid ${SOPAT_BORDER}` }}>
              <Column style={{ padding: '10px 16px' }}>
                <Text style={{ margin: 0, fontSize: 13, color: '#374151' }}>
                  {BREAKDOWN_LABELS[key] ?? key}
                </Text>
              </Column>
              <Column style={{ padding: '10px 16px', textAlign: 'right' as const }}>
                <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {tnd(value)}
                </Text>
              </Column>
              <Column style={{ padding: '10px 16px', textAlign: 'right' as const }}>
                <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>{pct}%</Text>
              </Column>
            </Row>
          )
        })}

        {/* Total row */}
        <Row style={{ backgroundColor: '#F0FBF0', borderTop: `2px solid ${SOPAT_GREEN}` }}>
          <Column style={{ padding: '12px 16px' }}>
            <Text style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Total</Text>
          </Column>
          <Column style={{ padding: '12px 16px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 14, fontWeight: 800, color: SOPAT_GREEN }}>
              {tnd(predictedTotal)}
            </Text>
          </Column>
          <Column style={{ padding: '12px 16px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>100%</Text>
          </Column>
        </Row>
      </Section>

      {/* Top cost drivers */}
      {topCostDrivers.length > 0 && (
        <>
          <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
            Principaux postes de coût
          </Text>
          <Section style={{ backgroundColor: '#F9FBF9', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
            {topCostDrivers.map((driver, i) => (
              <Text key={i} style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>
                {i + 1}. {driver}
              </Text>
            ))}
          </Section>
        </>
      )}

      {/* Disclaimer */}
      <Section style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 16px', marginBottom: 32 }}>
        <Text style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
          ⚠ Ces données sont générées automatiquement par le modèle ML SOPAT {modelVersion}.
          Veuillez vérifier et valider avant le début des achats.
        </Text>
      </Section>

      {/* CTA buttons */}
      <Row style={{ marginBottom: 24 }}>
        <Column style={{ paddingRight: 8 }}>
          <Button
            href={validateUrl}
            style={{
              backgroundColor: SOPAT_GREEN,
              color: '#FFFFFF',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              padding: '14px 24px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center' as const,
            }}
          >
            ✓ Valider le budget
          </Button>
        </Column>
        <Column style={{ paddingLeft: 8 }}>
          <Button
            href={editUrl}
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              padding: '14px 24px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center' as const,
            }}
          >
            ✎ Modifier le budget
          </Button>
        </Column>
      </Row>

      <Text style={{ fontSize: 12, color: SOPAT_MUTED, margin: 0 }}>
        Ce lien est valable 7 jours. Après expiration, contactez l&apos;administrateur SOPAT.
      </Text>
    </EmailLayout>
  )
}
