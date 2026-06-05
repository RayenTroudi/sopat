import { Section, Text, Row, Column, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER } from './_layout'

export type Reminder48hEmailProps = {
  chefName:         string
  projectName:      string
  projectReference: string
  predictedTotal:   number
  sentAt:           string   // original prediction email sent timestamp
  validateUrl:      string
  editUrl:          string
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

export function Reminder48hEmail({
  chefName,
  projectName,
  projectReference,
  predictedTotal,
  sentAt,
  validateUrl,
  editUrl,
}: Reminder48hEmailProps) {
  const origDateStr = new Date(sentAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <EmailLayout preview={`Rappel — Budget en attente de validation · ${projectReference}`}>
      <Section style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400E' }}>
          ⏰ Rappel — Validation en attente depuis 48 heures
        </Text>
      </Section>

      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {chefName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Vous avez reçu une prédiction budgétaire le <strong>{origDateStr}</strong> pour le projet
        ci-dessous. Elle est toujours en attente de votre validation.
        <br /><br />
        Veuillez valider ou modifier ce budget avant que le lien n&apos;expire.
      </Text>

      {/* Project + amount */}
      <Section style={{ backgroundColor: '#F0FBF0', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>PROJET</Text>
        <Text style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#111827' }}>{projectName}</Text>
        <Text style={{ margin: '0 0 12px', fontSize: 12, color: SOPAT_MUTED }}>Réf. {projectReference}</Text>
        <Text style={{ margin: '0 0 2px', fontSize: 12, color: SOPAT_MUTED }}>BUDGET PRÉDIT</Text>
        <Text style={{ margin: 0, fontSize: 24, fontWeight: 800, color: SOPAT_GREEN }}>
          {tnd(predictedTotal)}
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
              fontSize: 14,
              fontWeight: 700,
              padding: '12px 20px',
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
              fontSize: 14,
              fontWeight: 700,
              padding: '12px 20px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center' as const,
            }}
          >
            ✎ Modifier le budget
          </Button>
        </Column>
      </Row>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Sans réponse de votre part dans les 24 heures suivantes (soit 72h depuis l&apos;envoi initial),
        l&apos;administrateur SOPAT sera automatiquement notifié.
      </Text>
    </EmailLayout>
  )
}
