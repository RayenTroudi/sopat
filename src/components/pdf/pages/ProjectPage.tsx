import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

const TYPE_LABEL: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier & Touristique',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', gap: 14 },
  left:    { width: '52%', gap: 10 },
  right:   { flex: 1, gap: 6 },
  type:    { color: COLORS.green, fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  name:    { fontSize: 20, fontWeight: 700, marginTop: 4 },
  loc:     { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  concept: { fontSize: 11, lineHeight: 1.5 },
  plant:   { fontSize: 9, color: COLORS.muted },
  plan:    { width: '100%', height: 140, backgroundColor: '#EEE' },
  planImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
})

export function ProjectPage({ p }: { p: ProjectWithAssets }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <View style={s.row}>
        <View style={s.left}>
          <Text style={s.type}>{(TYPE_LABEL[p.projectType] ?? p.projectType).toUpperCase()}</Text>
          {p.renders3d.length > 0 && (
            <ImageGrid urls={p.renders3d.map((a) => a.secureUrl)} cols={3} />
          )}
          {p.sitePlans[0] && (
            <View style={s.plan}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={p.sitePlans[0].secureUrl} style={s.planImg} />
            </View>
          )}
        </View>
        <View style={s.right}>
          <Text style={s.name}>{p.name}</Text>
          <Text style={s.loc}>{p.siteAddress} · {p.country}</Text>
          {p.conceptTitle && <Text style={baseStyles.h3}>{p.conceptTitle}</Text>}
          {p.conceptDescription && <Text style={s.concept}>{p.conceptDescription}</Text>}
          {p.plants.length > 0 && (
            <View>
              <Text style={baseStyles.h3}>Palette végétale</Text>
              {p.plants.map((pl, i) => (
                <Text key={i} style={s.plant}>
                  • {pl.botanicalName}{pl.commonName ? ` — ${pl.commonName}` : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
      <Footer pageLabel={p.name} />
    </Page>
  )
}
