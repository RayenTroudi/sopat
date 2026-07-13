import { Text, Section, Hr, Link } from '@react-email/components'
import React from 'react'
import { EmailLayout, SOPAT_GREEN, SOPAT_BORDER, SOPAT_MUTED, APP_URL } from './_layout'

export type DigestAlert = {
  label: string
  detail: string
  dueDate: string | null
  href: string
  overdue: boolean
}

export function SmqAlertsDigestEmail({
  recipientName,
  alerts,
  overdueCount,
}: {
  recipientName: string
  alerts: DigestAlert[]
  overdueCount: number
}) {
  return (
    <EmailLayout preview={`SMQ : ${overdueCount} échéance${overdueCount !== 1 ? 's' : ''} en retard`}>
      <Text style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
        Bonjour {recipientName},
      </Text>
      <Text style={{ fontSize: 14, color: SOPAT_MUTED, margin: '0 0 20px', lineHeight: 1.6 }}>
        Voici le point quotidien des échéances du système de management de la qualité :
        {overdueCount > 0
          ? ` ${overdueCount} élément${overdueCount !== 1 ? 's sont' : ' est'} en retard.`
          : ' aucune échéance en retard, mais des éléments arrivent à terme.'}
      </Text>

      {alerts.map((a, i) => (
        <Section
          key={i}
          style={{
            border: `1px solid ${SOPAT_BORDER}`,
            borderLeft: `4px solid ${a.overdue ? '#B91C1C' : '#B8870A'}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
            {a.label}
            {a.dueDate ? (
              <span style={{ color: a.overdue ? '#B91C1C' : '#B8870A', fontWeight: 500 }}>
                {' '}· échéance {a.dueDate}
              </span>
            ) : null}
          </Text>
          <Text style={{ fontSize: 12, color: SOPAT_MUTED, margin: '4px 0 6px' }}>{a.detail}</Text>
          <Link href={`${APP_URL}${a.href}`} style={{ fontSize: 12, color: SOPAT_GREEN, fontWeight: 600 }}>
            Ouvrir dans SOPAT →
          </Link>
        </Section>
      ))}

      <Hr style={{ borderColor: SOPAT_BORDER, margin: '20px 0' }} />
      <Text style={{ fontSize: 12, color: SOPAT_MUTED, margin: 0 }}>
        Retrouvez toutes les alertes sur le{' '}
        <Link href={`${APP_URL}/admin`} style={{ color: SOPAT_GREEN }}>tableau de bord</Link>.
      </Text>
    </EmailLayout>
  )
}
