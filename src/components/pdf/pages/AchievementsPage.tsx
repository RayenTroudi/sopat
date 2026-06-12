import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'
import type { AchievementsNumbers } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  page:  { padding: 40, backgroundColor: COLORS.green, color: COLORS.white, fontFamily: 'Helvetica' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24 },
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:  { width: '31%', borderWidth: 1, borderColor: COLORS.white, padding: 16, alignItems: 'center' },
  num:   { fontSize: 28, fontWeight: 700 },
  label: { fontSize: 10, marginTop: 4, textAlign: 'center' },
})

export function AchievementsPage({ a }: { a: AchievementsNumbers }) {
  const items: { num: number; label: string }[] = [
    { num: a.projectsCompleted,  label: 'Projets réalisés' },
    { num: a.hectaresLandscaped, label: 'Hectares aménagés' },
    { num: a.treesPlanted,       label: 'Arbres plantés' },
    { num: a.clientsServed,      label: 'Clients servis' },
    { num: a.countriesPresent,   label: 'Pays' },
    { num: a.yearsExperience,    label: "Années d'expérience" },
  ]
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.title}>Nos réalisations en chiffres</Text>
      <View style={s.grid}>
        {items.map((it) => (
          <View key={it.label} style={s.tile}>
            <Text style={s.num}>{it.num}</Text>
            <Text style={s.label}>{it.label}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}
