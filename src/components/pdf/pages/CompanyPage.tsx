import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { COLORS, STATIC_COPY, baseStyles } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 16 },
  left:  { width: 160 },
  right: { flex: 1, gap: 10 },
  photo: { width: 160, height: 200, backgroundColor: '#EEE' },
  card:  { borderWidth: 1, borderColor: COLORS.green, padding: 10 },
  name:  { fontSize: 12, fontWeight: 700, marginTop: 6 },
  role:  { fontSize: 10, color: COLORS.muted },
})

export function CompanyPage({ s: st, ceoPhotoUrl }: { s: PortfolioSettings; ceoPhotoUrl?: string }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>L&apos;entreprise</SectionTitle>
      <View style={s.row}>
        <View style={s.left}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {ceoPhotoUrl ? <Image src={ceoPhotoUrl} style={s.photo} /> : <View style={s.photo} />}
          <Text style={s.name}>{st.ceoName ?? ''}</Text>
          <Text style={s.role}>{st.ceoTitle ?? ''}</Text>
        </View>
        <View style={s.right}>
          {st.companyTagline && (
            <View style={s.card}>
              <Text style={baseStyles.h3}>Mission & Vision</Text>
              <Text>{st.companyTagline}</Text>
            </View>
          )}
          <View style={s.card}>
            <Text style={baseStyles.h3}>Histoire & Contexte</Text>
            <Text>{STATIC_COPY.history}</Text>
          </View>
          <View style={s.card}>
            <Text style={baseStyles.h3}>Valeurs fondamentales</Text>
            <Text>{STATIC_COPY.values}</Text>
          </View>
        </View>
      </View>
      <Footer pageLabel="Présentation" />
    </Page>
  )
}
