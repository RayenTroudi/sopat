import path from 'path'
import { readFileSync } from 'fs'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { BRAND_TEAL, BRAND_DARK, BRAND_WHITE_SOFT } from '@/lib/export/brand'
import type { RseDashboardData } from '@/lib/db/rse-dashboard'

// Rapport RSE au thème « SOPAT Portfolio » : fond vert d'eau, cartes vert foncé
// arrondies, texte blanc, titres soulignés d'un filet fin blanc, logo blanc.

const WHITE = '#FFFFFF'

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontSize: 10, fontFamily: 'Helvetica', color: WHITE, backgroundColor: BRAND_TEAL },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logo: { width: 46, height: 46 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { color: WHITE, fontSize: 20 },
  headerRule: { marginTop: 6, width: 150, height: 1, backgroundColor: WHITE },
  headerSub: { color: BRAND_WHITE_SOFT, fontSize: 9, marginTop: 6 },
  sectionTitle: { fontSize: 13, color: WHITE, marginTop: 16, marginBottom: 6 },
  sectionRule: { width: 60, height: 1, backgroundColor: WHITE, opacity: 0.7, marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { width: '23.5%', backgroundColor: BRAND_DARK, borderRadius: 8, padding: 9 },
  kpiLabel: { fontSize: 7, color: BRAND_WHITE_SOFT, textTransform: 'uppercase' },
  kpiValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 4, color: WHITE },
  tableCard: { backgroundColor: BRAND_DARK, borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', borderBottom: `0.5pt solid ${BRAND_TEAL}`, paddingVertical: 4.5 },
  rowLast: { flexDirection: 'row', paddingVertical: 4.5 },
  cellLabel: { flex: 3, color: BRAND_WHITE_SOFT },
  cellValue: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: WHITE },
  th: { fontFamily: 'Helvetica-Bold', color: WHITE, fontSize: 8.5 },
  td: { color: BRAND_WHITE_SOFT, fontSize: 8.5 },
  tdStrong: { color: WHITE, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7.5, color: BRAND_WHITE_SOFT, borderTop: `0.5pt solid ${WHITE}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
})

const fmtNum = (n: number, dec = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

function SectionHeading({ title }: { title: string }) {
  return (
    <>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
    </>
  )
}

function PairTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={s.tableCard}>
      {rows.map((r, i) => (
        <View key={r.label} style={i === rows.length - 1 ? s.rowLast : s.row}>
          <Text style={s.cellLabel}>{r.label}</Text>
          <Text style={s.cellValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  )
}

export function RseReportDocument({ data, year, generatedAt }: {
  data: RseDashboardData
  year: number
  generatedAt: string
}) {
  let logoSrc: { data: Buffer; format: 'png' } | null = null
  try {
    logoSrc = { data: readFileSync(path.join(process.cwd(), 'public', 'logo-sopat-white.png')), format: 'png' }
  } catch { /* logo absent : on continue sans */ }

  const { environmental: env, social, partnerships: part, locations } = data

  const kpis = [
    { label: 'Déchets collectés', value: `${fmtNum(env.totalWasteKg, 1)} kg` },
    { label: 'Arbres plantés', value: fmtNum(env.totalTrees) },
    { label: 'Participants RSE', value: fmtNum(env.totalParticipants) },
    { label: 'Événements réalisés', value: `${fmtNum(env.completedEvents)} / ${fmtNum(env.totalEvents)}` },
    { label: 'Partenariats actifs', value: fmtNum(part.activePartnerships) },
    { label: 'Engagements respectés', value: `${fmtNum(part.fulfillmentRate)}%` },
    { label: 'Employés actifs', value: fmtNum(social.totalActiveEmployees) },
    { label: 'Formations réalisées', value: fmtNum(social.trainingSessions) },
  ]

  const envRows = [
    { label: 'Déchets collectés lors des événements', value: `${fmtNum(env.totalWasteKg, 1)} kg` },
    { label: 'Arbres plantés lors des événements', value: fmtNum(env.totalTrees) },
    { label: 'Linéaire de plage nettoyé', value: `${fmtNum(env.totalBeachCleanedM, 1)} m` },
    { label: 'Zones traitées', value: fmtNum(env.totalZonesTreated) },
    { label: 'Arbres & palmiers en projets d’aménagement', value: fmtNum(env.totalTreesInProjects) },
    { label: 'Total végétaux en projets', value: fmtNum(env.totalPlantsInProjects) },
    { label: 'Investissement événements RSE', value: `${fmtNum(env.totalEventInvestment, 3)} TND` },
    { label: 'Événements avec couverture média', value: fmtNum(env.mediaCoverageCount) },
    { label: 'Portée réseaux sociaux', value: fmtNum(env.totalSocialMediaReach) },
    { label: 'Score satisfaction moyen', value: env.avgSatisfaction != null ? `${fmtNum(env.avgSatisfaction, 1)}/10` : 'N/D' },
  ]

  const socialRows = [
    { label: 'Effectifs actifs', value: fmtNum(social.totalActiveEmployees) },
    { label: 'Auditeurs internes qualifiés', value: fmtNum(social.internalAuditorsCount) },
    { label: 'Sessions de formation réalisées', value: fmtNum(social.trainingSessions) },
    { label: 'Participants aux formations', value: fmtNum(social.trainingParticipants) },
    { label: 'Taux de présence aux formations', value: `${fmtNum(social.trainingCompletion)}%` },
    { label: 'Score évaluation formation (moyenne)', value: social.avgHotEvalScore != null ? fmtNum(social.avgHotEvalScore, 1) : 'N/D' },
    { label: 'Jours de congé approuvés', value: `${fmtNum(social.totalLeaveDays, 1)} j` },
    { label: 'Non-conformités clôturées', value: `${fmtNum(social.ncsClosedRate)}%` },
    { label: 'Taux de conformité HSE', value: social.hseComplianceRate != null ? `${fmtNum(social.hseComplianceRate)}%` : 'N/D' },
  ]

  const partRows = [
    { label: 'Partenariats actifs', value: fmtNum(part.activePartnerships) },
    { label: 'Total partenariats', value: fmtNum(part.totalPartnerships) },
    { label: 'Engagements respectés', value: `${fmtNum(part.fulfilledCommitments)} / ${fmtNum(part.totalCommitments)} (${fmtNum(part.fulfillmentRate)}%)` },
    { label: 'Engagements en retard', value: fmtNum(part.overdueCommitments) },
  ]

  const footer = (
    <View style={s.footer} fixed>
      <Text>SOPAT — Société de Paysage de Tunisie · Rapport RSE {year}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )

  const header = (
    <View style={s.header}>
      {logoSrc ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
        <Image style={s.logo} src={logoSrc} />
      ) : <View style={s.logo} />}
      <View style={s.headerRight}>
        <Text style={s.headerTitle}>Rapport Impact RSE</Text>
        <View style={s.headerRule} />
        <Text style={s.headerSub}>Exercice {year} · Généré le {generatedAt}</Text>
      </View>
    </View>
  )

  return (
    <Document title={`Rapport RSE SOPAT ${year}`} author="SOPAT ERP">
      <Page size="A4" style={s.page}>
        {header}

        <SectionHeading title="Synthèse exécutive" />
        <View style={s.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={s.kpiValue}>{k.value}</Text>
            </View>
          ))}
        </View>

        <SectionHeading title="Pilier Environnemental" />
        <PairTable rows={envRows} />

        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        {header}

        <SectionHeading title="Pilier Social" />
        <PairTable rows={socialRows} />

        <SectionHeading title="Pilier Partenariats & Communauté" />
        <PairTable rows={partRows} />

        {locations.length > 0 && (
          <>
            <SectionHeading title="Répartition géographique" />
            <View style={s.tableCard}>
              <View style={s.row}>
                <Text style={[s.th, { flex: 3 }]}>Lieu</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Événements</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Participants</Text>
                <Text style={[s.th, { flex: 1.4, textAlign: 'right' }]}>Déchets (kg)</Text>
              </View>
              {locations.slice(0, 10).map((l, i) => (
                <View key={l.location} style={i === Math.min(locations.length, 10) - 1 ? s.rowLast : s.row}>
                  <Text style={[s.td, { flex: 3 }]}>{l.location}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{fmtNum(l.eventCount)}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{fmtNum(l.totalParticipants)}</Text>
                  <Text style={[s.tdStrong, { flex: 1.4, textAlign: 'right' }]}>{fmtNum(l.totalWasteKg, 1)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {footer}
      </Page>
    </Document>
  )
}
