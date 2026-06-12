import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'
import { BadgeRow } from '../partials/BadgeRow'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  page:     { padding: 0, backgroundColor: COLORS.green, color: COLORS.white, fontFamily: 'Helvetica' },
  badges:   { position: 'absolute', top: 30, right: 30 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo:     { width: 180, height: 60, marginBottom: 16 },
  title:    { fontSize: 14, letterSpacing: 2 },
  footer:   { position: 'absolute', bottom: 30, right: 30, alignItems: 'flex-end' },
  ceo:      { fontSize: 11, fontWeight: 700 },
  ceoTitle: { fontSize: 10 },
})

export function CoverPage({ s: st, logoUrl }: { s: PortfolioSettings; logoUrl?: string }) {
  const badges: string[] = []
  if (st.isoCertNumber) badges.push('ISO 9001')
  if (st.rseLabelLevel) badges.push(`RSE ${st.rseLabelLevel}`)
  return (
    <Page size="A4" style={s.page}>
      {badges.length > 0 && (
        <View style={s.badges}><BadgeRow labels={badges} /></View>
      )}
      <View style={s.center}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logoUrl && <Image src={logoUrl} style={s.logo} />}
        <Text style={s.title}>SOCIÉTÉ DE PAYSAGE DE TUNISIE</Text>
      </View>
      {(st.ceoName || st.ceoTitle) && (
        <View style={s.footer}>
          {st.ceoName  && <Text style={s.ceo}>{st.ceoName}</Text>}
          {st.ceoTitle && <Text style={s.ceoTitle}>{st.ceoTitle}</Text>}
        </View>
      )}
    </Page>
  )
}
