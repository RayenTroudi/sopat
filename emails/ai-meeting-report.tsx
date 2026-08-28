import { Section, Text, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER, APP_URL } from './_layout'

/**
 * Compte rendu de réunion produit par l'assistant IA.
 *
 * La transcription n'est volontairement PAS envoyée : elle est longue, elle
 * contient des propos bruts, et un e-mail se transfère sans contrôle. Le
 * message porte la synthèse ; le détail reste derrière l'authentification, via
 * le lien vers la fiche réunion.
 */

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  MEDIUM: '#B45309',
  HIGH: '#DC2626',
}

export type AiMeetingReportEmailProps = {
  recipientName: string
  meetingTitle: string
  meetingReference: string
  meetingId: string
  meetingDate: string
  durationLabel: string | null
  summary: string
  topics: string[]
  decisions: string[]
  actionItems: {
    title: string
    responsiblePerson: string | null
    deadline: string | null
    priority: string | null
  }[]
  risks: string[]
  followUps: string[]
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <Text style={{ margin: 0, fontSize: 13, color: SOPAT_MUTED, fontStyle: 'italic' }}>
        {emptyLabel}
      </Text>
    )
  }
  return (
    <>
      {items.map((item, i) => (
        <Text key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          • {item}
        </Text>
      ))}
    </>
  )
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section
      style={{
        border: `1px solid ${SOPAT_BORDER}`,
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 16,
      }}
    >
      <Text style={{ margin: '0 0 8px', fontSize: 11, color: SOPAT_MUTED, fontWeight: 600 }}>
        {title}
      </Text>
      {children}
    </Section>
  )
}

export function AiMeetingReportEmail({
  recipientName,
  meetingTitle,
  meetingReference,
  meetingId,
  meetingDate,
  durationLabel,
  summary,
  topics,
  decisions,
  actionItems,
  risks,
  followUps,
}: AiMeetingReportEmailProps) {
  const meetingUrl = `${APP_URL}/admin/meetings/${meetingId}`
  const dateStr = new Date(meetingDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <EmailLayout preview={`Compte rendu — ${meetingTitle}`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px' }}>
        Le compte rendu de votre réunion a été généré par l&apos;assistant de réunion SOPAT à
        partir de la transcription. Il est à relire et à valider : l&apos;analyse est une aide,
        pas une validation.
      </Text>

      <Section
        style={{
          backgroundColor: '#F9FBF9',
          border: `1px solid ${SOPAT_BORDER}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 24,
        }}
      >
        <Text style={{ margin: '0 0 4px', fontSize: 11, color: SOPAT_MUTED, fontWeight: 600 }}>
          {meetingReference}
        </Text>
        <Text style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: SOPAT_GREEN }}>
          {meetingTitle}
        </Text>
        <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>
          {dateStr}
          {durationLabel ? ` · Durée : ${durationLabel}` : ''}
        </Text>
      </Section>

      <SectionBlock title="RÉSUMÉ EXÉCUTIF">
        <Text style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{summary}</Text>
      </SectionBlock>

      <SectionBlock title="SUJETS ABORDÉS">
        <BulletList items={topics} emptyLabel="Aucun sujet identifié." />
      </SectionBlock>

      <SectionBlock title="DÉCISIONS">
        <BulletList items={decisions} emptyLabel="Aucune décision actée." />
      </SectionBlock>

      <SectionBlock title="ACTIONS">
        {actionItems.length === 0 ? (
          <Text style={{ margin: 0, fontSize: 13, color: SOPAT_MUTED, fontStyle: 'italic' }}>
            Aucune action identifiée.
          </Text>
        ) : (
          actionItems.map((action, i) => (
            <Text
              key={i}
              style={{ margin: '0 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}
            >
              • <strong style={{ color: '#111827' }}>{action.title}</strong>
              {'\n'}
              <span style={{ fontSize: 12, color: SOPAT_MUTED }}>
                Responsable : {action.responsiblePerson ?? 'Non attribué'}
                {action.deadline ? ` · Échéance : ${action.deadline}` : ''}
              </span>
              {action.priority ? (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: PRIORITY_COLORS[action.priority] ?? SOPAT_MUTED,
                  }}
                >
                  {` · Priorité : ${PRIORITY_LABELS[action.priority] ?? action.priority}`}
                </span>
              ) : null}
            </Text>
          ))
        )}
      </SectionBlock>

      <SectionBlock title="RISQUES / POINTS D'ATTENTION">
        <BulletList items={risks} emptyLabel="Aucun risque signalé." />
      </SectionBlock>

      <SectionBlock title="SUIVIS">
        <BulletList items={followUps} emptyLabel="Aucun suivi identifié." />
      </SectionBlock>

      <Button
        href={meetingUrl}
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
          margin: '8px 0 24px',
        }}
      >
        Consulter le compte rendu complet
      </Button>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 12, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        La transcription intégrale n&apos;est pas jointe à ce message : elle reste consultable
        dans SOPAT, après authentification, sur la fiche de la réunion.
      </Text>
    </EmailLayout>
  )
}
