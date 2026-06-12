import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { FeaturedClient } from '@/lib/portfolio/types'

const SECTOR_LABEL: Record<string, string> = {
  banque: 'Banques', hotellerie: 'Hôtellerie', automobile: 'Automobile',
  institutionnel_public: 'Institutions publiques', institutionnel_prive: 'Institutions privées',
  residentiel_prive: 'Résidentiel privé', diplomatique: 'Diplomatique', autre: 'Autres',
}

const s = StyleSheet.create({
  group: { marginBottom: 12 },
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tile:  { width: '23%', height: 50, borderWidth: 1, borderColor: COLORS.muted, alignItems: 'center', justifyContent: 'center', padding: 4 },
})

export function ClientsPage({ clients }: { clients: FeaturedClient[] }) {
  const bySector = new Map<string, FeaturedClient[]>()
  for (const c of clients) {
    const k = c.clientSector ?? 'autre'
    const arr = bySector.get(k) ?? []
    arr.push(c)
    bySector.set(k, arr)
  }
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Ils nous font confiance</SectionTitle>
      {[...bySector.entries()].map(([sector, list]) => (
        <View key={sector} style={s.group}>
          <Text style={baseStyles.h3}>{SECTOR_LABEL[sector] ?? sector}</Text>
          <View style={s.grid}>
            {list.map((c) => (
              <View key={c.id} style={s.tile}>
                <Text style={{ fontSize: 9 }}>{c.displayName}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Footer pageLabel="Clients" />
    </Page>
  )
}
