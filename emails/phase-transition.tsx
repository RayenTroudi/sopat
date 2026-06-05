import { Section, Text, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER, APP_URL } from './_layout'

const PHASE_LABELS: Record<string, string> = {
  etudes:      'Études & Conception',
  realisation: 'Réalisation',
  entretien:   'Entretien & Suivi',
}

export type PhaseTransitionEmailProps = {
  recipientName:    string
  projectName:      string
  projectReference: string
  fromPhase:        string
  toPhase:          string
  signedOffBy:      string
  signedOffAt:      string
  projectId:        string
  notes?:           string
}

export function PhaseTransitionEmail({
  recipientName,
  projectName,
  projectReference,
  fromPhase,
  toPhase,
  signedOffBy,
  signedOffAt,
  projectId,
  notes,
}: PhaseTransitionEmailProps) {
  const fromLabel = PHASE_LABELS[fromPhase] ?? fromPhase
  const toLabel   = PHASE_LABELS[toPhase]   ?? toPhase
  const dateStr   = new Date(signedOffAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const projectUrl = `${APP_URL}/admin/projects/${projectId}?tab=${toPhase}`

  return (
    <EmailLayout preview={`Projet ${projectReference} transféré en ${toLabel}`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Un projet vient d&apos;être transféré à votre équipe et est maintenant disponible dans la
        phase <strong>{toLabel}</strong>.
      </Text>

      {/* Phase transition visual */}
      <Section style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 12px', fontSize: 13, color: SOPAT_MUTED }}>TRANSFERT DE PHASE</Text>
        <Text style={{ margin: 0, display: 'inline-block', fontSize: 13, fontWeight: 600, color: SOPAT_MUTED, backgroundColor: '#F3F4F6', padding: '6px 14px', borderRadius: 20 }}>
          {fromLabel}
        </Text>
        <Text style={{ margin: '0 8px', display: 'inline-block', fontSize: 18, color: SOPAT_GREEN }}>→</Text>
        <Text style={{ margin: 0, display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#FFFFFF', backgroundColor: SOPAT_GREEN, padding: '6px 14px', borderRadius: 20 }}>
          {toLabel}
        </Text>
      </Section>

      {/* Project card */}
      <Section style={{ backgroundColor: '#F0FBF0', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>PROJET</Text>
        <Text style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#111827' }}>{projectName}</Text>
        <Text style={{ margin: '0 0 8px', fontSize: 12, color: SOPAT_MUTED }}>Réf. {projectReference}</Text>
        <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>
          Validé par {signedOffBy} le {dateStr}
        </Text>
      </Section>

      {notes && (
        <Section style={{ backgroundColor: '#F9FBF9', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          <Text style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: SOPAT_MUTED }}>NOTES DE CLÔTURE</Text>
          <Text style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{notes}</Text>
        </Section>
      )}

      <Button
        href={projectUrl}
        style={{
          backgroundColor: SOPAT_GREEN,
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
        Ouvrir le projet dans SOPAT Admin
      </Button>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Connectez-vous au panneau admin pour consulter le dossier complet, les documents Études,
        et démarrer la phase {toLabel}.
      </Text>
    </EmailLayout>
  )
}
