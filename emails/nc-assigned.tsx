import { Section, Text, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER, APP_URL } from './_layout'

const PHASE_LABELS: Record<string, string> = {
  etudes:      'Études & Conception',
  realisation: 'Réalisation',
  entretien:   'Entretien & Suivi',
}

export type NcAssignedEmailProps = {
  recipientName:    string
  ncReference:      string
  ncId:             string
  projectName:      string
  projectReference: string
  processAffected:  string
  description:      string
  deadline:         string | null
  detectedBy:       string
  detectedAt:       string
}

export function NcAssignedEmail({
  recipientName,
  ncReference,
  ncId,
  projectName,
  projectReference,
  processAffected,
  description,
  deadline,
  detectedBy,
  detectedAt,
}: NcAssignedEmailProps) {
  const ncUrl    = `${APP_URL}/admin/nc/${ncId}`
  const dateStr  = new Date(detectedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const dlStr    = deadline
    ? new Date(deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <EmailLayout preview={`Non-conformité ${ncReference} — action requise`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Une non-conformité vous a été assignée. Veuillez traiter ce dossier dans les délais impartis
        conformément au processus qualité ISO 9001:2015 (clause 10.2).
      </Text>

      {/* NC badge */}
      <Section style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: '#991B1B', fontWeight: 600 }}>
          NON-CONFORMITÉ
        </Text>
        <Text style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#DC2626' }}>{ncReference}</Text>
        <Text style={{ margin: 0, fontSize: 12, color: '#991B1B' }}>
          Processus : {PHASE_LABELS[processAffected] ?? processAffected}
        </Text>
      </Section>

      {/* Project */}
      <Section style={{ border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
        <Text style={{ margin: '0 0 2px', fontSize: 11, color: SOPAT_MUTED }}>PROJET CONCERNÉ</Text>
        <Text style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {projectName} — {projectReference}
        </Text>
      </Section>

      {/* Description */}
      <Section style={{ backgroundColor: '#F9FBF9', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 11, color: SOPAT_MUTED, fontWeight: 600 }}>DESCRIPTION</Text>
        <Text style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{description}</Text>
      </Section>

      {/* Meta */}
      <Section style={{ marginBottom: 24 }}>
        <Text style={{ margin: '0 0 6px', fontSize: 13, color: SOPAT_MUTED }}>
          Détectée par : <strong style={{ color: '#111827' }}>{detectedBy}</strong> le {dateStr}
        </Text>
        {dlStr && (
          <Text style={{ margin: 0, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
            ⏰ Délai de traitement : {dlStr}
          </Text>
        )}
      </Section>

      <Button
        href={ncUrl}
        style={{
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          padding: '12px 24px',
          textDecoration: 'none',
          display: 'block',
          textAlign: 'center' as const,
          marginBottom: 24,
        }}
      >
        Traiter la non-conformité
      </Button>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Connectez-vous au panneau SOPAT Admin pour consulter le dossier complet,
        documenter l&apos;analyse des causes racines et enregistrer l&apos;action corrective.
      </Text>
    </EmailLayout>
  )
}
