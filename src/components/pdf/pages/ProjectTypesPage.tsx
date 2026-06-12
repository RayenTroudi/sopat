import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { ProjectType } from '@/lib/portfolio/types'

const LABELS: Record<ProjectType, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier & Touristique',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', borderWidth: 1, borderColor: COLORS.green, padding: 14, alignItems: 'center' },
  num:  { fontSize: 22, fontWeight: 700, color: COLORS.green },
})

export function ProjectTypesPage({ counts }: { counts: Record<ProjectType, number> }) {
  const keys = Object.keys(LABELS) as ProjectType[]
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Nos types de projets</SectionTitle>
      <View style={s.grid}>
        {keys.map((k) => (
          <View key={k} style={s.tile}>
            <Text style={s.num}>{counts[k] ?? 0}</Text>
            <Text>{LABELS[k]}</Text>
          </View>
        ))}
      </View>
      <Footer pageLabel="Types de projets" />
    </Page>
  )
}
