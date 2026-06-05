import { Section, Text, Button, Hr } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_MUTED, SOPAT_BORDER, APP_URL } from './_layout'

export type BudgetAlertEmailProps = {
  recipientName:    string
  projectName:      string
  projectReference: string
  projectId:        string
  approvedBudget:   number
  totalSpent:       number
  percentSpent:     number
  isOverBudget:     boolean
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

export function BudgetAlertEmail({
  recipientName,
  projectName,
  projectReference,
  projectId,
  approvedBudget,
  totalSpent,
  percentSpent,
  isOverBudget,
}: BudgetAlertEmailProps) {
  const projectUrl = `${APP_URL}/admin/projects/${projectId}?tab=realisation`
  const alertColor = isOverBudget ? '#DC2626' : '#D97706'
  const alertBg    = isOverBudget ? '#FEF2F2' : '#FFFBEB'
  const alertBorder = isOverBudget ? '#FECACA' : '#FCD34D'
  const alertTitle = isOverBudget
    ? '🚨 Dépassement de budget'
    : '⚠ Alerte budget : 90% consommé'
  const alertDesc = isOverBudget
    ? `Le projet a dépassé le budget approuvé de ${tnd(totalSpent - approvedBudget)}.`
    : `Le projet a consommé ${percentSpent.toFixed(1)}% du budget approuvé. Il reste ${tnd(approvedBudget - totalSpent)}.`

  return (
    <EmailLayout preview={`${alertTitle} — ${projectReference}`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
        Bonjour {recipientName},
      </Text>

      {/* Alert banner */}
      <Section style={{ backgroundColor: alertBg, border: `1px solid ${alertBorder}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: alertColor }}>{alertTitle}</Text>
        <Text style={{ margin: 0, fontSize: 13, color: alertColor, lineHeight: 1.5 }}>{alertDesc}</Text>
      </Section>

      {/* Project card */}
      <Section style={{ border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <Text style={{ margin: '0 0 4px', fontSize: 12, color: SOPAT_MUTED }}>PROJET</Text>
        <Text style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#111827' }}>{projectName}</Text>
        <Text style={{ margin: 0, fontSize: 12, color: SOPAT_MUTED }}>Réf. {projectReference}</Text>
      </Section>

      {/* Budget stats */}
      <Section style={{ backgroundColor: '#F9FBF9', border: `1px solid ${SOPAT_BORDER}`, borderRadius: 8, padding: '16px', marginBottom: 24 }}>
        <Section style={{ marginBottom: 12 }}>
          <Text style={{ margin: '0 0 2px', fontSize: 11, color: SOPAT_MUTED, textTransform: 'uppercase' as const }}>Budget approuvé</Text>
          <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: SOPAT_GREEN }}>{tnd(approvedBudget)}</Text>
        </Section>
        <Section style={{ marginBottom: 12 }}>
          <Text style={{ margin: '0 0 2px', fontSize: 11, color: SOPAT_MUTED, textTransform: 'uppercase' as const }}>Dépensé à ce jour</Text>
          <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: alertColor }}>{tnd(totalSpent)}</Text>
        </Section>
        <Section>
          <Text style={{ margin: '0 0 2px', fontSize: 11, color: SOPAT_MUTED, textTransform: 'uppercase' as const }}>Progression</Text>
          <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: alertColor }}>{percentSpent.toFixed(1)}%</Text>
        </Section>
      </Section>

      <Button
        href={projectUrl}
        style={{
          backgroundColor: alertColor,
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
        Consulter le suivi budgétaire
      </Button>

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '0 0 20px' }} />
      <Text style={{ fontSize: 13, color: SOPAT_MUTED, margin: 0, lineHeight: 1.6 }}>
        Cette alerte est générée automatiquement par le système de suivi budgétaire SOPAT.
        Consultez le chef de réalisation pour prendre les mesures nécessaires.
      </Text>
    </EmailLayout>
  )
}
