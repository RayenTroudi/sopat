import path from 'path'
import { readFileSync } from 'fs'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  BRAND_TEAL, BRAND_DARK, BRAND_WHITE_SOFT, BRAND_ALERT_RED, BRAND_ALERT_AMBER,
} from '@/lib/export/brand'

// Thème « SOPAT Portfolio » : fond vert d'eau, cartes vert foncé arrondies,
// texte blanc, titre souligné d'un filet fin blanc, logo blanc.

const WHITE = '#FFFFFF'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: WHITE, backgroundColor: BRAND_TEAL },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logo: { width: 46, height: 46 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { color: WHITE, fontSize: 20 },
  headerRule: { marginTop: 6, width: 190, height: 1, backgroundColor: WHITE },
  headerSub: { color: BRAND_WHITE_SOFT, fontSize: 9, marginTop: 6 },
  sectionTitle: { fontSize: 13, color: WHITE, marginTop: 18, marginBottom: 8 },
  sectionRule: { width: 60, height: 1, backgroundColor: WHITE, opacity: 0.7, marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { width: '31%', backgroundColor: BRAND_DARK, borderRadius: 8, padding: 10 },
  kpiLabel: { fontSize: 7.5, color: BRAND_WHITE_SOFT, textTransform: 'uppercase' },
  kpiValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 4, color: WHITE },
  tableCard: { backgroundColor: BRAND_DARK, borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', borderBottom: `0.5pt solid ${BRAND_TEAL}`, paddingVertical: 5 },
  rowLast: { flexDirection: 'row', paddingVertical: 5 },
  cellLabel: { flex: 3, color: BRAND_WHITE_SOFT },
  cellValue: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: WHITE },
  alertRow: { flexDirection: 'row', paddingVertical: 4, borderBottom: `0.5pt solid ${BRAND_TEAL}` },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7.5, color: BRAND_WHITE_SOFT, borderTop: `0.5pt solid ${WHITE}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
})

export type DirectionReportData = {
  year: number
  generatedAt: string
  kpis: {
    activeProjects: number
    onTimeDeliveryRate: number
    openNcs: number
    overdueNcs: number
    ncSlaClosureRate: number
    satisfactionScore: number | null
  }
  smq: {
    ncTotal: number
    ncOpen: number
    ncClosed: number
    ncRate: number
    capaRate: number
    auditRate: number
    auditDone: number
    auditTotal: number
    risksHigh: number
    hseRate: number
    wasteKg: number
  }
  alerts: { label: string; detail: string; dueDate: string | null; overdue: boolean }[]
}

export function DirectionReportDocument({ data }: { data: DirectionReportData }) {
  // Buffer plutôt que chemin : react-pdf traite les chemins Windows comme des
  // URL (fetch failed) — le composant n'est rendu que côté serveur.
  let logoSrc: { data: Buffer; format: 'png' } | null = null
  try {
    logoSrc = { data: readFileSync(path.join(process.cwd(), 'public', 'logo-sopat-white.png')), format: 'png' }
  } catch { /* logo absent : on continue sans */ }

  const kpiCards = [
    { label: 'Projets actifs', value: String(data.kpis.activeProjects), color: WHITE },
    { label: 'Livraison dans les délais', value: `${data.kpis.onTimeDeliveryRate}%`, color: data.kpis.onTimeDeliveryRate >= 80 ? WHITE : BRAND_ALERT_AMBER },
    { label: 'NC ouvertes', value: String(data.kpis.openNcs), color: data.kpis.overdueNcs > 0 ? BRAND_ALERT_RED : WHITE },
    { label: 'Clôture NC dans les délais', value: `${data.kpis.ncSlaClosureRate}%`, color: data.kpis.ncSlaClosureRate >= 80 ? WHITE : BRAND_ALERT_AMBER },
    { label: 'Satisfaction client', value: data.kpis.satisfactionScore != null ? `${data.kpis.satisfactionScore}/5` : '—', color: WHITE },
    { label: 'Risques criticité élevée', value: String(data.smq.risksHigh), color: data.smq.risksHigh > 0 ? BRAND_ALERT_RED : WHITE },
  ]

  const smqRows = [
    { label: `Non-conformités ${data.year} (total / ouvertes / clôturées)`, value: `${data.smq.ncTotal} / ${data.smq.ncOpen} / ${data.smq.ncClosed}` },
    { label: 'Taux de clôture des NC', value: `${data.smq.ncRate}%` },
    { label: 'Taux d’efficacité des actions correctives (CAPA)', value: `${data.smq.capaRate}%` },
    { label: `Programme d’audit réalisé (${data.smq.auditDone}/${data.smq.auditTotal})`, value: `${data.smq.auditRate}%` },
    { label: 'Conformité check-lists SME & SST', value: `${data.smq.hseRate}%` },
    { label: 'Déchets suivis (kg)', value: data.smq.wasteKg.toLocaleString('fr-FR') },
  ]

  return (
    <Document title={`Rapport de direction SMQ ${data.year}`} author="SOPAT ERP">
      <Page size="A4" style={s.page}>
        {/* En-tête façon portfolio : logo blanc à gauche, titre à droite souligné */}
        <View style={s.header}>
          {logoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
            <Image style={s.logo} src={logoSrc} />
          ) : <View style={s.logo} />}
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Rapport de direction SMQ</Text>
            <View style={s.headerRule} />
            <Text style={s.headerSub}>
              Année {data.year} · ISO 9001:2015 §9.3 · Généré le {data.generatedAt}
            </Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Indicateurs clés</Text>
        <View style={s.sectionRule} />
        <View style={s.kpiGrid}>
          {kpiCards.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Performance SMQ {data.year} (FOR-MI-10)</Text>
        <View style={s.sectionRule} />
        <View style={s.tableCard}>
          {smqRows.map((r, i) => (
            <View key={r.label} style={i === smqRows.length - 1 ? s.rowLast : s.row}>
              <Text style={s.cellLabel}>{r.label}</Text>
              <Text style={s.cellValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>
          Alertes &amp; échéances ({data.alerts.filter((a) => a.overdue).length} en retard)
        </Text>
        <View style={s.sectionRule} />
        {data.alerts.length === 0 ? (
          <Text style={{ color: BRAND_WHITE_SOFT }}>Aucune alerte en cours.</Text>
        ) : (
          <View style={s.tableCard}>
            {data.alerts.slice(0, 14).map((a, i) => (
              <View key={i} style={i === Math.min(data.alerts.length, 14) - 1 ? s.rowLast : s.alertRow}>
                <Text style={{ flex: 3, color: a.overdue ? BRAND_ALERT_RED : BRAND_ALERT_AMBER, fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
                  {a.label}
                </Text>
                <Text style={{ flex: 4, color: BRAND_WHITE_SOFT, fontSize: 9 }}>{a.detail}</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: 9, color: WHITE }}>{a.dueDate ?? '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>SOPAT — Société de Paysage de Tunisie · Certifiée ISO 9001:2015</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
