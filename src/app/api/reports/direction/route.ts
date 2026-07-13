import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { auth } from '@/lib/auth'
import { getSmqKpis } from '@/lib/db/kpi-smq'
import { getDashboardKpis } from '@/lib/db/dashboard'
import { getDeadlineAlerts } from '@/lib/db/alerts'
import PptxGenJS from 'pptxgenjs'

export const dynamic = 'force-dynamic'

const GREEN = '2D5A27'
const RED = 'B91C1C'
const AMBER = 'B8870A'
const MUTED = '6B7280'

async function collectData(year: number) {
  const [smq, kpis, alerts] = await Promise.all([
    getSmqKpis(year),
    getDashboardKpis(),
    getDeadlineAlerts(),
  ])
  return {
    year,
    generatedAt: new Date().toLocaleDateString('fr-FR'),
    kpis: {
      activeProjects: kpis.activeProjects.total,
      onTimeDeliveryRate: kpis.onTimeDeliveryRate,
      openNcs: kpis.openNcs.count,
      overdueNcs: kpis.openNcs.overdue,
      ncSlaClosureRate: kpis.ncSlaClosureRate,
      satisfactionScore: kpis.satisfactionScore,
    },
    smq,
    alerts: alerts.map((a) => ({
      label: a.label,
      detail: a.detail,
      dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('fr-FR') : null,
      overdue: a.overdue,
    })),
  }
}

type ReportData = Awaited<ReturnType<typeof collectData>>

// ─── PPTX ─────────────────────────────────────────────────────────────────────

async function buildPptx(data: ReportData): Promise<Buffer> {
  const prs = new PptxGenJS()
  prs.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 })
  prs.layout = 'WIDE'

  // Couverture
  const cover = prs.addSlide()
  cover.background = { color: GREEN }
  cover.addText('SOPAT', { x: 0.8, y: 2.2, w: 11.7, h: 1, fontSize: 44, bold: true, color: 'FFFFFF' })
  cover.addText(`Rapport de direction SMQ — ${data.year}`, { x: 0.8, y: 3.3, w: 11.7, h: 0.8, fontSize: 26, color: 'D6E4D3' })
  cover.addText(`ISO 9001:2015 §9.3 · Généré le ${data.generatedAt}`, { x: 0.8, y: 4.2, w: 11.7, h: 0.5, fontSize: 14, color: 'D6E4D3' })

  // KPI
  const kpiSlide = prs.addSlide()
  kpiSlide.addText('Indicateurs clés', { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: GREEN })
  const cards: { label: string; value: string; color: string }[] = [
    { label: 'Projets actifs', value: String(data.kpis.activeProjects), color: GREEN },
    { label: 'Livraison dans les délais', value: `${data.kpis.onTimeDeliveryRate}%`, color: data.kpis.onTimeDeliveryRate >= 80 ? GREEN : AMBER },
    { label: 'NC ouvertes', value: String(data.kpis.openNcs), color: data.kpis.overdueNcs > 0 ? RED : GREEN },
    { label: 'Clôture NC dans les délais', value: `${data.kpis.ncSlaClosureRate}%`, color: data.kpis.ncSlaClosureRate >= 80 ? GREEN : AMBER },
    { label: 'Satisfaction client', value: data.kpis.satisfactionScore != null ? `${data.kpis.satisfactionScore}/5` : '—', color: GREEN },
    { label: 'Risques criticité élevée', value: String(data.smq.risksHigh), color: data.smq.risksHigh > 0 ? RED : GREEN },
  ]
  cards.forEach((c, i) => {
    const x = 0.6 + (i % 3) * 4.2
    const y = 1.4 + Math.floor(i / 3) * 2.6
    kpiSlide.addShape('roundRect', { x, y, w: 3.9, h: 2.2, fill: { color: 'F5F7F4' }, line: { color: 'D6E4D3' }, rectRadius: 0.08 })
    kpiSlide.addText(c.label.toUpperCase(), { x: x + 0.25, y: y + 0.25, w: 3.4, h: 0.5, fontSize: 11, color: MUTED })
    kpiSlide.addText(c.value, { x: x + 0.25, y: y + 0.9, w: 3.4, h: 1, fontSize: 40, bold: true, color: c.color })
  })

  // SMQ table
  const smqSlide = prs.addSlide()
  smqSlide.addText(`Performance SMQ ${data.year} (FOR-MI-10)`, { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: GREEN })
  const smqRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Indicateur', options: { bold: true, color: 'FFFFFF', fill: { color: GREEN } } },
      { text: 'Valeur', options: { bold: true, color: 'FFFFFF', fill: { color: GREEN } } },
    ],
    [{ text: `Non-conformités ${data.year} (total / ouvertes / clôturées)` }, { text: `${data.smq.ncTotal} / ${data.smq.ncOpen} / ${data.smq.ncClosed}` }],
    [{ text: 'Taux de clôture des NC' }, { text: `${data.smq.ncRate}%` }],
    [{ text: 'Taux d’efficacité des CAPA' }, { text: `${data.smq.capaRate}%` }],
    [{ text: `Programme d’audit réalisé (${data.smq.auditDone}/${data.smq.auditTotal})` }, { text: `${data.smq.auditRate}%` }],
    [{ text: 'Conformité check-lists SME & SST' }, { text: `${data.smq.hseRate}%` }],
    [{ text: 'Déchets suivis (kg)' }, { text: data.smq.wasteKg.toLocaleString('fr-FR') }],
  ]
  smqSlide.addTable(smqRows, { x: 0.6, y: 1.3, w: 12, fontSize: 14, border: { pt: 0.5, color: 'D6E4D3' }, rowH: 0.55 })

  // Alerts
  const alertSlide = prs.addSlide()
  const overdueCount = data.alerts.filter((a) => a.overdue).length
  alertSlide.addText(`Alertes & échéances (${overdueCount} en retard)`, { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: GREEN })
  if (data.alerts.length === 0) {
    alertSlide.addText('Aucune alerte en cours.', { x: 0.6, y: 1.5, w: 12, h: 0.6, fontSize: 16, color: MUTED })
  } else {
    const alertRows: PptxGenJS.TableRow[] = [
      [
        { text: 'Alerte', options: { bold: true, color: 'FFFFFF', fill: { color: GREEN } } },
        { text: 'Détail', options: { bold: true, color: 'FFFFFF', fill: { color: GREEN } } },
        { text: 'Échéance', options: { bold: true, color: 'FFFFFF', fill: { color: GREEN } } },
      ],
      ...data.alerts.slice(0, 10).map((a): PptxGenJS.TableRow => [
        { text: a.label, options: { color: a.overdue ? RED : AMBER, bold: true } },
        { text: a.detail },
        { text: a.dueDate ?? '—' },
      ]),
    ]
    alertSlide.addTable(alertRows, { x: 0.6, y: 1.3, w: 12, fontSize: 12, border: { pt: 0.5, color: 'D6E4D3' }, rowH: 0.45 })
  }

  return (await prs.write({ outputType: 'nodebuffer' })) as Buffer
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!['admin', 'direction'].includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à la direction' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const format = sp.get('format') ?? 'pdf'
  const year = Number(sp.get('year')) || new Date().getFullYear()

  const data = await collectData(year)

  if (format === 'pptx') {
    const buf = await buildPptx(data)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="SOPAT_Rapport_Direction_${year}.pptx"`,
      },
    })
  }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { DirectionReportDocument } = await import('@/components/pdf/DirectionReportDocument')
  const element = createElement(DirectionReportDocument, { data }) as unknown as Parameters<typeof renderToBuffer>[0]
  const buf = await renderToBuffer(element)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="SOPAT_Rapport_Direction_${year}.pdf"`,
    },
  })
}
