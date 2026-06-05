import { Section, Text, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER, APP_URL } from './_layout'

const VISIT_TYPE_LABELS: Record<string, string> = {
  taille:                   'Taille',
  arrosage:                 'Arrosage',
  traitement_phytosanitaire: 'Traitement phytosanitaire',
  controle_general:         'Contrôle général',
  other:                    'Autre',
}

export type MaintenanceReminderEmailProps = {
  recipientName:    string
  projectName:      string
  projectReference: string
  projectId:        string
  visitDate:        string
  visitType:        string
  durationHours:    number | null
  clientName:       string
  siteAddress:      string
  notes?:           string
}

export function MaintenanceReminderEmail({
  recipientName,
  projectName,
  projectReference,
  projectId,
  visitDate,
  visitType,
  durationHours,
  clientName,
  siteAddress,
  notes,
}: MaintenanceReminderEmailProps) {
  const projectUrl = `${APP_URL}/admin/projects/${projectId}?tab=entretien`
  const dateStr = new Date(visitDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <EmailLayout preview={`Rappel visite demain — ${projectName}`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Rappel : vous avez une visite de maintenance planifiée <strong>demain</strong>.
      </Text>

      {/* Visit details */}
      <Section style={{ backgroundColor: '#F0FBF0', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '20px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>DATE & HEURE</Text>
        <Text style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>{dateStr}</Text>

        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>TYPE DE VISITE</Text>
        <Text style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: SOPAT_GREEN }}>
          {VISIT_TYPE_LABELS[visitType] ?? visitType}
          {durationHours ? ` — ${durationHours}h estimées` : ''}
        </Text>

        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>PROJET / CLIENT</Text>
        <Text style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{projectName}</Text>
        <Text style={{ margin: '0 0 16px', fontSize: 12, color: SOPAT_MUTED }}>
          {clientName} · Réf. {projectReference}
        </Text>

        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>ADRESSE DU SITE</Text>
        <Text style={{ margin: 0, fontSize: 13, color: '#374151' }}>{siteAddress}</Text>
      </Section>

      {notes && (
        <Section style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          <Text style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#92400E' }}>NOTES</Text>
          <Text style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>{notes}</Text>
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
        Ouvrir le dossier projet
      </Button>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Après la visite, connectez-vous au panneau SOPAT Admin pour saisir votre rapport
        (travaux réalisés, bilan santé végétale, photos avant/après).
      </Text>
    </EmailLayout>
  )
}
