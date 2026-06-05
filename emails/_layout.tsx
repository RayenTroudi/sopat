import {
  Html, Head, Preview, Body, Container, Section,
  Row, Column, Text, Hr, Img,
} from '@react-email/components'
import React from 'react'

const SOPAT_GREEN = '#2D5A27'
const SOPAT_LIGHT = '#F5F7F4'
const SOPAT_BORDER = '#D6E4D3'
const SOPAT_MUTED  = '#6B7280'

export const LOGO_URL =
  process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/sopat-logo.png`
    : 'https://sopat.tn/logo.png'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sopat.vercel.app'

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#F3F4F6', fontFamily: "'Inter', Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: '32px auto', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', border: `1px solid ${SOPAT_BORDER}` }}>
          {/* Header */}
          <Section style={{ backgroundColor: SOPAT_GREEN, padding: '24px 32px' }}>
            <Row>
              <Column>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700, margin: 0 }}>
                  SOPAT
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: '2px 0 0' }}>
                  Aménagement Paysager · ISO 9001:2015
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Content */}
          <Section style={{ padding: '32px' }}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: SOPAT_BORDER, margin: 0 }} />
          <Section style={{ backgroundColor: SOPAT_LIGHT, padding: '20px 32px' }}>
            <Text style={{ color: SOPAT_MUTED, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              SOPAT — Société Paysagiste de Tunisie · Certifiée ISO 9001:2015
              {'\n'}Ce message est généré automatiquement par le système de gestion SOPAT.
              {'\n'}Pour toute question : <a href="mailto:admin@sopat.tn" style={{ color: SOPAT_GREEN }}>admin@sopat.tn</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export { SOPAT_GREEN, SOPAT_LIGHT, SOPAT_BORDER, SOPAT_MUTED, APP_URL }
