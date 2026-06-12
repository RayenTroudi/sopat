import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  row:  { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: COLORS.muted, paddingVertical: 4 },
  cell: { flex: 1, fontSize: 10 },
  head: { fontWeight: 700, color: COLORS.green },
})

export function EntretienPage({ projects, afterPhotoUrls }: { projects: ProjectWithAssets[]; afterPhotoUrls: string[] }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Partie entretien</SectionTitle>
      <View style={[s.row, { borderBottomWidth: 1 }]}>
        <Text style={[s.cell, s.head]}>Projet</Text>
        <Text style={[s.cell, s.head]}>Pays</Text>
        <Text style={[s.cell, s.head]}>Référence</Text>
      </View>
      {projects.map((p) => (
        <View key={p.id} style={s.row}>
          <Text style={s.cell}>{p.name}</Text>
          <Text style={s.cell}>{p.country}</Text>
          <Text style={s.cell}>{p.reference}</Text>
        </View>
      ))}
      {afterPhotoUrls.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={baseStyles.h3}>Visites récentes</Text>
          <ImageGrid urls={afterPhotoUrls.slice(0, 9)} cols={3} />
        </View>
      )}
      <Footer pageLabel="Entretien" />
    </Page>
  )
}
