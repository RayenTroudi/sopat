import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { AchievementsPayload } from '@/lib/db/achievements'

// SOPAT brand green
const GREEN = '#2D5A27'
const GREEN_LIGHT = '#E8F0E6'
const TEXT = '#1A1A1A'
const MUTED = '#666666'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    color: TEXT,
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 3,
    borderBottomColor: GREEN,
    paddingBottom: 12,
    marginBottom: 24,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: GREEN,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: GREEN,
    marginBottom: 10,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metric: {
    width: '33.333%',
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  metricBox: {
    backgroundColor: GREEN_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    padding: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    color: GREEN,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 9,
    color: TEXT,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
    paddingTop: 6,
  },
})

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

export function KeyFiguresPdf({ data }: { data: AchievementsPayload }) {
  const { current, rse } = data
  const items: { value: string; label: string }[] = [
    { value: String(current.parcsUrbains),           label: 'Parcs urbains' },
    { value: String(current.espacesVertsPublics),    label: 'Espaces verts publics' },
    { value: String(current.hotelsResorts),          label: 'Hôtels & Resorts' },
    { value: String(current.residencesAppartements), label: 'Résidences & Appartements' },
    { value: String(current.villasPrivees),          label: 'Villas privées' },
    { value: String(current.siegesSociaux),          label: 'Sièges sociaux' },
    { value: String(current.projetsInternationaux),  label: 'Projets internationaux' },
    { value: String(current.anneesExperience),       label: 'Années d’expérience' },
    { value: fmt(rse.wasteCollectedKg) + ' kg',      label: 'Déchets collectés (RSE)' },
    { value: fmt(rse.treesPlanted),                  label: 'Arbres plantés (RSE)' },
    { value: fmt(rse.participants),                  label: 'Participants RSE' },
    { value: String(rse.activePartnerships),         label: 'Partenariats RSE actifs' },
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>SOPAT</Text>
          <Text style={styles.subtitle}>Chiffres clés · {new Date().toLocaleDateString('fr-FR')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Nos Réalisations en Chiffres</Text>

        <View style={styles.grid}>
          {items.map((it) => (
            <View key={it.label} style={styles.metric}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{it.value}</Text>
                <Text style={styles.metricLabel}>{it.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          SOPAT — Société de Paysagisme et d&apos;Aménagement Territorial · Document généré automatiquement
        </Text>
      </Page>
    </Document>
  )
}
