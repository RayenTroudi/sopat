import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS, baseStyles } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  card:  { borderWidth: 1, borderColor: COLORS.green, padding: 12, marginBottom: 10 },
  label: { fontSize: 10, color: COLORS.muted, marginTop: 4 },
})

function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

export function CertificationsPage({ s: st }: { s: PortfolioSettings }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Certifications</SectionTitle>
      {st.isoCertNumber && (
        <View style={s.card}>
          <Text style={baseStyles.h3}>ISO 9001 — Bureau Veritas</Text>
          <Text>N° {st.isoCertNumber}</Text>
          <Text style={s.label}>Expire le {formatDate(st.isoCertExpiry)}</Text>
        </View>
      )}
      {st.rseLabelLevel && (
        <View style={s.card}>
          <Text style={baseStyles.h3}>Label RSE — Niveau {st.rseLabelLevel}</Text>
          <Text style={s.label}>Expire le {formatDate(st.rseLabelExpiry)}</Text>
        </View>
      )}
      <Footer pageLabel="Certifications" />
    </Page>
  )
}
