import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  card: { marginBottom: 10, borderWidth: 1, borderColor: COLORS.green, padding: 8 },
})

export function EclairageDecorationPage({ projects }: { projects: ProjectWithAssets[] }) {
  const lit = projects.filter((p) => p.lightingIncluded)
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Éclairage & Décoration</SectionTitle>
      {lit.map((p) => (
        <View key={p.id} style={s.card}>
          <Text style={baseStyles.h3}>{p.name}</Text>
          <ImageGrid urls={p.renders3d.map((a) => a.secureUrl)} cols={3} />
        </View>
      ))}
      <Footer pageLabel="Éclairage & Décoration" />
    </Page>
  )
}
