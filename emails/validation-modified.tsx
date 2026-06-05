import { Section, Text, Row, Column, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER } from './_layout'

export type ValidationModifiedEmailProps = {
  recipientName:      string
  chefName:           string
  projectName:        string
  projectReference:   string
  modificationReason: string
  modifiedAt:         string
  original: {
    plants:    number
    soil:      number
    labor:     number
    equipment: number
    logistics: number
    total:     number
  }
  modified: {
    plants:    number
    soil:      number
    labor:     number
    equipment: number
    logistics: number
    total:     number
  }
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

const LABELS: Record<string, string> = {
  plants:    'Végétaux',
  soil:      'Substrats / Sol',
  labor:     'Main-d\'œuvre',
  equipment: 'Équipements',
  logistics: 'Logistique',
}

export function ValidationModifiedEmail({
  recipientName,
  chefName,
  projectName,
  projectReference,
  modificationReason,
  modifiedAt,
  original,
  modified,
}: ValidationModifiedEmailProps) {
  const dateStr = new Date(modifiedAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const keys = ['plants', 'soil', 'labor', 'equipment', 'logistics'] as const

  return (
    <EmailLayout preview={`Budget modifié par ${chefName} — ${projectReference}`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Le chef de réalisation <strong>{chefName}</strong> a <strong>modifié</strong> le budget
        prédictif ML pour le projet <strong>{projectReference} — {projectName}</strong> le {dateStr}.
      </Text>

      {/* Reason */}
      <Section style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#92400E' }}>
          RAISON DE LA MODIFICATION
        </Text>
        <Text style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
          {modificationReason}
        </Text>
      </Section>

      {/* Comparison table */}
      <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
        Comparaison ML prédit vs. valeurs saisies par le chef
      </Text>
      <Section style={{ border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <Row style={{ backgroundColor: SOPAT_GREEN }}>
          <Column style={{ padding: '10px 16px', width: '40%' }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFF' }}>Poste</Text>
          </Column>
          <Column style={{ padding: '10px 16px', width: '30%', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFF' }}>ML prédit</Text>
          </Column>
          <Column style={{ padding: '10px 16px', width: '30%', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFF' }}>Chef (modifié)</Text>
          </Column>
        </Row>

        {keys.map((key, i) => {
          const orig = original[key]
          const mod  = modified[key]
          const diff = mod - orig
          const bg   = i % 2 === 0 ? '#FFF' : '#F9FBF9'
          return (
            <Row key={key} style={{ backgroundColor: bg, borderTop: `1px solid ${SOPAT_BORDER}` }}>
              <Column style={{ padding: '10px 16px' }}>
                <Text style={{ margin: 0, fontSize: 13, color: '#374151' }}>{LABELS[key]}</Text>
              </Column>
              <Column style={{ padding: '10px 16px', textAlign: 'right' as const }}>
                <Text style={{ margin: 0, fontSize: 13, color: SOPAT_MUTED }}>{tnd(orig)}</Text>
              </Column>
              <Column style={{ padding: '10px 16px', textAlign: 'right' as const }}>
                <Text style={{ margin: 0, fontSize: 13, fontWeight: diff !== 0 ? 700 : 400, color: diff > 0 ? '#DC2626' : diff < 0 ? '#16A34A' : '#111827' }}>
                  {tnd(mod)}{diff !== 0 ? ` (${diff > 0 ? '+' : ''}${tnd(diff)})` : ''}
                </Text>
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
            <Text style={{ margin: 0, fontSize: 13, color: SOPAT_MUTED }}>{tnd(original.total)}</Text>
          </Column>
          <Column style={{ padding: '12px 16px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: 14, fontWeight: 800, color: SOPAT_GREEN }}>{tnd(modified.total)}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Le budget modifié a été enregistré comme budget officiel du projet. Un historique complet
        des modifications est disponible dans le journal d&apos;activité du projet.
      </Text>
    </EmailLayout>
  )
}
