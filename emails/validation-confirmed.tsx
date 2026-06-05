import { Section, Text, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER } from './_layout'

export type ValidationConfirmedEmailProps = {
  recipientName:    string
  chefName:         string
  projectName:      string
  projectReference: string
  approvedAmount:   number
  validatedAt:      string
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

export function ValidationConfirmedEmail({
  recipientName,
  chefName,
  projectName,
  projectReference,
  approvedAmount,
  validatedAt,
}: ValidationConfirmedEmailProps) {
  const dateStr = new Date(validatedAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <EmailLayout preview={`Budget validé — ${projectReference} · ${projectName}`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Le chef de réalisation <strong>{chefName}</strong> a validé le budget prédictif
        pour le projet suivant.
      </Text>

      <Section style={{ backgroundColor: '#F0FBF0', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>PROJET</Text>
        <Text style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#111827' }}>{projectName}</Text>
        <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>Réf. {projectReference}</Text>
      </Section>

      <Section style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>BUDGET OFFICIEL APPROUVÉ</Text>
        <Text style={{ margin: 0, fontSize: 36, fontWeight: 800, color: SOPAT_GREEN }}>{tnd(approvedAmount)}</Text>
        <Text style={{ margin: '8px 0 0', fontSize: 12, color: SOPAT_MUTED }}>
          Validé par {chefName} le {dateStr}
        </Text>
      </Section>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Ce budget est maintenant verrouillé dans le système SOPAT et servira de référence
        pour le suivi des dépenses en phase Réalisation.
      </Text>
    </EmailLayout>
  )
}
