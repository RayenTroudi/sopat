import {
  Html, Head, Preview, Body, Container, Section,
  Row, Column, Text, Hr, Img,
} from '@react-email/components'
import React from 'react'

const SOPAT_GREEN = '#2D5A27'
const SOPAT_LIGHT = '#F5F7F4'
const SOPAT_BORDER = '#D6E4D3'
const SOPAT_MUTED  = '#6B7280'

/** Vert du logo (échantillonné sur le fichier) — plus clair que SOPAT_GREEN. */
const LOGO_GREEN = '#449484'

// NEXT_PUBLIC_APP_URL peut exister mais être VIDE (c'était le cas). `??` ne
// rattrape que null/undefined : une chaîne vide produisait des URL relatives
// (« /logo.png », « /admin/… »), que ni un client de messagerie ni une image
// distante ne savent résoudre. `||` rattrape aussi la chaîne vide.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://sopat.vercel.app'

/**
 * Logo officiel. Deux points à ne pas défaire :
 *
 * 1. PNG, pas le SVG. Gmail, Outlook et Apple Mail suppriment `<svg>` et
 *    bloquent les images .svg : le logo n'apparaîtrait chez personne.
 * 2. URL ABSOLUE. Un client de messagerie n'a aucune base pour résoudre un
 *    chemin relatif — l'image doit être servie publiquement.
 *
 * L'ancienne valeur pointait vers /sopat-logo.png, fichier qui n'existe pas
 * dans public/ : le logo était donc cassé partout où il aurait été utilisé.
 */
export const LOGO_URL = `${APP_URL}/logo-768x519.png`

/** Ratio natif 768x519 conservé pour éviter toute déformation. */
const LOGO_WIDTH = 180
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 519) / 768)

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
          {/* En-tête — fond BLANC, volontairement.
              Le logo est vert (#449484) sur fond transparent : posé sur
              l'ancien bandeau vert, il aurait disparu dans le fond. La couleur
              de la marque reste présente via le filet vert sous l'en-tête. */}
          <Section style={{ backgroundColor: '#FFFFFF', padding: '28px 32px 20px' }}>
            <Row>
              <Column>
                <Img
                  src={LOGO_URL}
                  width={LOGO_WIDTH}
                  height={LOGO_HEIGHT}
                  alt="SOPAT — Société de Paysage de Tunisie"
                  style={{ display: 'block', border: 0, outline: 'none', textDecoration: 'none' }}
                />
                <Text style={{ color: SOPAT_MUTED, fontSize: 11, margin: '10px 0 0', letterSpacing: '0.02em' }}>
                  Aménagement Paysager · ISO 9001:2015
                </Text>
              </Column>
            </Row>
          </Section>
          {/* Filet vert : sépare l'en-tête du contenu et garde la couleur de
              marque, que le fond blanc a retirée du bandeau. */}
          <Section style={{ backgroundColor: LOGO_GREEN, fontSize: 0, lineHeight: '3px', height: 3 }}>
            <Text style={{ margin: 0, fontSize: 0, lineHeight: '3px' }}>&nbsp;</Text>
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

export { SOPAT_GREEN, SOPAT_LIGHT, SOPAT_BORDER, SOPAT_MUTED, LOGO_GREEN, APP_URL }
