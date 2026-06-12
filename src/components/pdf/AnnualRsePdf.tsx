import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RseReportData } from '@/lib/db/achievements'

const GREEN = '#2D5A27'
const GREEN_LIGHT = '#E8F0E6'
const TEXT = '#1A1A1A'
const MUTED = '#666666'
const BORDER = '#DDDDDD'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 10,
    color: TEXT,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 3,
    borderBottomColor: GREEN,
    paddingBottom: 12,
    marginBottom: 18,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: GREEN,
    letterSpacing: 1,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 6,
    color: TEXT,
  },
  subtitle: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: GREEN,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GREEN_LIGHT,
    paddingBottom: 3,
  },
  paragraph: {
    marginBottom: 6,
  },
  impactRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  impactCell: {
    flex: 1,
    margin: 4,
    padding: 10,
    backgroundColor: GREEN_LIGHT,
    borderLeftWidth: 2,
    borderLeftColor: GREEN,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: 700,
    color: GREEN,
  },
  impactLabel: {
    fontSize: 8,
    color: TEXT,
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: GREEN_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  th: {
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    color: GREEN,
  },
  td: {
    padding: 6,
    fontSize: 9,
    color: TEXT,
  },
  colWide:   { flex: 3 },
  colMedium: { flex: 2 },
  colNarrow: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
})

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

const EVENT_TYPE_FR: Record<string, string> = {
  nettoyage_plage:        'Nettoyage de plage',
  plantation:             'Plantation',
  sensibilisation:        'Sensibilisation',
  team_building:          'Team building',
  journee_environnement:  'Journée environnement',
  autre:                  'Autre',
}

const PARTNER_TYPE_FR: Record<string, string> = {
  hotel:          'Hôtel',
  municipalite:   'Municipalité',
  entreprise:     'Entreprise',
  institution:    'Institution',
  autre:          'Autre',
}

export function AnnualRsePdf({ data }: { data: RseReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>SOPAT</Text>
          <Text style={styles.documentTitle}>Rapport RSE Annuel · {data.year}</Text>
          <Text style={styles.subtitle}>
            Document généré le {new Date().toLocaleDateString('fr-FR')}
          </Text>
        </View>

        {/* Impact summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impact environnemental & social</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactCell}>
              <Text style={styles.impactValue}>{fmt(data.impact.wasteCollectedKg)} kg</Text>
              <Text style={styles.impactLabel}>Déchets collectés</Text>
            </View>
            <View style={styles.impactCell}>
              <Text style={styles.impactValue}>{fmt(data.impact.treesPlanted)}</Text>
              <Text style={styles.impactLabel}>Arbres plantés</Text>
            </View>
            <View style={styles.impactCell}>
              <Text style={styles.impactValue}>{fmt(data.impact.participants)}</Text>
              <Text style={styles.impactLabel}>Participants</Text>
            </View>
            <View style={styles.impactCell}>
              <Text style={styles.impactValue}>{fmt(data.impact.activePartnerships)}</Text>
              <Text style={styles.impactLabel}>Partenariats actifs</Text>
            </View>
          </View>
        </View>

        {/* Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Événements RSE de l’année</Text>
          {data.events.length === 0 ? (
            <Text style={styles.paragraph}>Aucun événement enregistré pour {data.year}.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colWide]}>Événement</Text>
                <Text style={[styles.th, styles.colMedium]}>Type</Text>
                <Text style={[styles.th, styles.colMedium]}>Date</Text>
                <Text style={[styles.th, styles.colNarrow]}>Participants</Text>
                <Text style={[styles.th, styles.colNarrow]}>Déchets (kg)</Text>
                <Text style={[styles.th, styles.colNarrow]}>Arbres</Text>
              </View>
              {data.events.map((e) => (
                <View key={e.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colWide]}>{e.title}</Text>
                  <Text style={[styles.td, styles.colMedium]}>{EVENT_TYPE_FR[e.eventType] ?? e.eventType}</Text>
                  <Text style={[styles.td, styles.colMedium]}>{fmtDate(e.date)}</Text>
                  <Text style={[styles.td, styles.colNarrow]}>{fmt(e.participantsActual)}</Text>
                  <Text style={[styles.td, styles.colNarrow]}>{fmt(e.wasteCollectedKg)}</Text>
                  <Text style={[styles.td, styles.colNarrow]}>{fmt(e.treesPlanted)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Partnerships */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partenariats RSE actifs</Text>
          {data.partnerships.length === 0 ? (
            <Text style={styles.paragraph}>Aucun partenariat actif.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colWide]}>Partenaire</Text>
                <Text style={[styles.th, styles.colMedium]}>Type</Text>
                <Text style={[styles.th, styles.colMedium]}>Signé le</Text>
                <Text style={[styles.th, styles.colMedium]}>Échéance</Text>
              </View>
              {data.partnerships.map((p) => (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colWide]}>{p.partnerName}</Text>
                  <Text style={[styles.td, styles.colMedium]}>{PARTNER_TYPE_FR[p.partnerType] ?? p.partnerType}</Text>
                  <Text style={[styles.td, styles.colMedium]}>{fmtDate(p.signedDate)}</Text>
                  <Text style={[styles.td, styles.colMedium]}>{fmtDate(p.endDate)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Community initiatives */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Initiatives communautaires</Text>
          <Text style={styles.paragraph}>
            SOPAT poursuit ses engagements auprès des communautés locales : programme « Femmes Rurales »
            pour la formation aux métiers du paysage, sensibilisation à la biodiversité dans les écoles
            partenaires, et appui aux municipalités sur les espaces verts publics.
          </Text>
          <Text style={styles.paragraph}>
            Le détail opérationnel de ces initiatives est consigné dans les conventions partenariats
            ci-dessus et dans le journal d’activité RSE.
          </Text>
        </View>

        <Text style={styles.footer}>
          SOPAT — Rapport RSE {data.year} · Document interne destiné à la Direction
        </Text>
      </Page>
    </Document>
  )
}
