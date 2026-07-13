import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const GREEN = '#2D5A27'
const MUTED = '#6B7280'
const BORDER = '#D6E4D3'
const RED = '#B91C1C'
const AMBER = '#B8870A'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  headerBand: { backgroundColor: GREEN, marginHorizontal: -40, marginTop: -40, padding: 24, paddingHorizontal: 40, marginBottom: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#D6E4D3', fontSize: 9, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: GREEN, marginTop: 18, marginBottom: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { width: '31%', border: `1pt solid ${BORDER}`, borderRadius: 6, padding: 10 },
  kpiLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase' },
  kpiValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  row: { flexDirection: 'row', borderBottom: `0.5pt solid ${BORDER}`, paddingVertical: 5 },
  cellLabel: { flex: 3, color: '#111827' },
  cellValue: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  alertRow: { flexDirection: 'row', paddingVertical: 4, borderBottom: `0.5pt solid ${BORDER}` },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7.5, color: MUTED, borderTop: `0.5pt solid ${BORDER}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
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
  const kpiCards = [
    { label: 'Projets actifs', value: String(data.kpis.activeProjects), color: GREEN },
    { label: 'Livraison dans les délais', value: `${data.kpis.onTimeDeliveryRate}%`, color: data.kpis.onTimeDeliveryRate >= 80 ? GREEN : AMBER },
    { label: 'NC ouvertes', value: String(data.kpis.openNcs), color: data.kpis.overdueNcs > 0 ? RED : GREEN },
    { label: 'Clôture NC dans les délais', value: `${data.kpis.ncSlaClosureRate}%`, color: data.kpis.ncSlaClosureRate >= 80 ? GREEN : AMBER },
    { label: 'Satisfaction client', value: data.kpis.satisfactionScore != null ? `${data.kpis.satisfactionScore}/5` : '—', color: GREEN },
    { label: 'Risques criticité élevée', value: String(data.smq.risksHigh), color: data.smq.risksHigh > 0 ? RED : GREEN },
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
        <View style={s.headerBand}>
          <Text style={s.headerTitle}>SOPAT — Rapport de direction SMQ</Text>
          <Text style={s.headerSub}>
            Année {data.year} · ISO 9001:2015 §9.3 · Généré le {data.generatedAt}
          </Text>
        </View>

        <Text style={s.sectionTitle}>Indicateurs clés</Text>
        <View style={s.kpiGrid}>
          {kpiCards.map((k) => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Performance SMQ {data.year} (FOR-MI-10)</Text>
        <View>
          {smqRows.map((r) => (
            <View key={r.label} style={s.row}>
              <Text style={s.cellLabel}>{r.label}</Text>
              <Text style={s.cellValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>
          Alertes &amp; échéances ({data.alerts.filter((a) => a.overdue).length} en retard)
        </Text>
        {data.alerts.length === 0 ? (
          <Text style={{ color: MUTED }}>Aucune alerte en cours.</Text>
        ) : (
          data.alerts.slice(0, 14).map((a, i) => (
            <View key={i} style={s.alertRow}>
              <Text style={{ flex: 3, color: a.overdue ? RED : AMBER, fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
                {a.label}
              </Text>
              <Text style={{ flex: 4, color: MUTED, fontSize: 9 }}>{a.detail}</Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: 9 }}>{a.dueDate ?? '—'}</Text>
            </View>
          ))
        )}

        <View style={s.footer} fixed>
          <Text>SOPAT — Société Paysagiste de Tunisie · Certifiée ISO 9001:2015</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
