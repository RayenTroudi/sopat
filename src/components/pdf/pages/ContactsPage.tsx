import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'
import { BadgeRow } from '../partials/BadgeRow'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  page:   { padding: 40, backgroundColor: COLORS.green, color: COLORS.white, fontFamily: 'Helvetica' },
  center: { alignItems: 'center', marginTop: 60 },
  logo:   { width: 140, height: 50, marginBottom: 20 },
  block:  { marginTop: 18, alignItems: 'center', gap: 4 },
  big:    { fontSize: 14, fontWeight: 700 },
  line:   { fontSize: 11 },
})

export function ContactsPage({ s: st, logoUrl }: { s: PortfolioSettings; logoUrl?: string }) {
  const badges: string[] = []
  if (st.isoCertNumber) badges.push('ISO 9001')
  if (st.rseLabelLevel) badges.push(`RSE ${st.rseLabelLevel}`)
  return (
    <Page size="A4" style={s.page}>
      <View style={s.center}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logoUrl && <Image src={logoUrl} style={s.logo} />}
        <Text style={s.big}>Contactez-nous</Text>
        <View style={s.block}>
          {st.companyAddress    && <Text style={s.line}>{st.companyAddress}</Text>}
          {st.phone1            && <Text style={s.line}>{st.phone1}</Text>}
          {st.phone2            && <Text style={s.line}>{st.phone2}</Text>}
          {st.email             && <Text style={s.line}>{st.email}</Text>}
          {st.website           && <Text style={s.line}>{st.website}</Text>}
          {st.facebookUrl       && <Text style={s.line}>{st.facebookUrl}</Text>}
          {st.instagramHandle   && <Text style={s.line}>@{st.instagramHandle}</Text>}
        </View>
        <View style={{ marginTop: 30 }}><BadgeRow labels={badges} /></View>
      </View>
    </Page>
  )
}
