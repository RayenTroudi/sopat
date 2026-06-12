import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { RseEventSummary } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', borderWidth: 1, borderColor: COLORS.green, padding: 10 },
  date: { fontSize: 9, color: COLORS.muted },
})

export function RsePage({ events }: { events: RseEventSummary[] }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Activités RSE</SectionTitle>
      <View style={s.grid}>
        {events.map((e) => (
          <View key={e.id} style={s.card}>
            <Text style={baseStyles.h3}>{e.title}</Text>
            <Text style={s.date}>{new Date(e.date).toLocaleDateString('fr-FR')} — {e.location}</Text>
            <Text>{e.eventType}</Text>
          </View>
        ))}
      </View>
      <Footer pageLabel="RSE" />
    </Page>
  )
}
