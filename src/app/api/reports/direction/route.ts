import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { auth } from '@/lib/auth'
import { getSmqKpis } from '@/lib/db/kpi-smq'
import { getDashboardKpis } from '@/lib/db/dashboard'
import { getDeadlineAlerts } from '@/lib/db/alerts'
import PptxGenJS from 'pptxgenjs'
import path from 'path'
import {
  PPTX_TEAL, PPTX_DARK, PPTX_WHITE, PPTX_WHITE_SOFT, PPTX_ALERT_RED, PPTX_ALERT_AMBER,
} from '@/lib/export/brand'

export const dynamic = 'force-dynamic'

// Thème « SOPAT Portfolio » : fond vert d'eau, cartes vert foncé, texte blanc,
// titres soulignés d'un filet fin blanc, logo blanc.
const TEAL  = PPTX_TEAL
const DARK  = PPTX_DARK
const WHITE = PPTX_WHITE
const SOFT  = PPTX_WHITE_SOFT
const RED   = PPTX_ALERT_RED
const AMBER = PPTX_ALERT_AMBER

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

  const logoPath = path.join(process.cwd(), 'public', 'logo-sopat-white.png')

  // Titre de page façon portfolio : en haut à droite, souligné d'un filet blanc,
  // logo blanc en bas à droite.
  function themedSlide(title: string): PptxGenJS.Slide {
    const slide = prs.addSlide()
    slide.background = { color: TEAL }
    slide.addText(title, { x: 4.5, y: 0.35, w: 8.2, h: 0.7, fontSize: 26, color: WHITE, align: 'right' })
    slide.addShape('line', { x: 9.2, y: 1.15, w: 3.5, h: 0, line: { color: WHITE, width: 1 } })
    slide.addImage({ path: logoPath, x: 12.35, y: 6.6, w: 0.7, h: 0.7 })
    return slide
  }

  // Couverture — logo blanc centré sur fond vert d'eau, comme la page de garde
  // du portfolio.
  const cover = prs.addSlide()
  cover.background = { color: TEAL }
  cover.addImage({ path: logoPath, x: 5.42, y: 1.5, w: 2.5, h: 2.5 })
  cover.addText('SOPAT', { x: 0.8, y: 4.1, w: 11.7, h: 0.9, fontSize: 44, color: WHITE, align: 'center', charSpacing: 6 })
  cover.addText('SOCIÉTÉ DE PAYSAGE DE TUNISIE', { x: 0.8, y: 5.0, w: 11.7, h: 0.4, fontSize: 13, color: SOFT, align: 'center', charSpacing: 3 })
  cover.addShape('line', { x: 5.9, y: 5.6, w: 1.5, h: 0, line: { color: WHITE, width: 1 } })
  cover.addText(`Rapport de direction SMQ — ${data.year}`, { x: 0.8, y: 5.8, w: 11.7, h: 0.6, fontSize: 20, color: WHITE, align: 'center' })
  cover.addText(`ISO 9001:2015 §9.3 · Généré le ${data.generatedAt}`, { x: 0.8, y: 6.4, w: 11.7, h: 0.4, fontSize: 12, color: SOFT, align: 'center' })

  // KPI — cartes vert foncé arrondies, texte blanc
  const kpiSlide = themedSlide('Indicateurs clés')
  const cards: { label: string; value: string; color: string }[] = [
    { label: 'Projets actifs', value: String(data.kpis.activeProjects), color: WHITE },
    { label: 'Livraison dans les délais', value: `${data.kpis.onTimeDeliveryRate}%`, color: data.kpis.onTimeDeliveryRate >= 80 ? WHITE : AMBER },
    { label: 'NC ouvertes', value: String(data.kpis.openNcs), color: data.kpis.overdueNcs > 0 ? RED : WHITE },
    { label: 'Clôture NC dans les délais', value: `${data.kpis.ncSlaClosureRate}%`, color: data.kpis.ncSlaClosureRate >= 80 ? WHITE : AMBER },
    { label: 'Satisfaction client', value: data.kpis.satisfactionScore != null ? `${data.kpis.satisfactionScore}/5` : '—', color: WHITE },
    { label: 'Risques criticité élevée', value: String(data.smq.risksHigh), color: data.smq.risksHigh > 0 ? RED : WHITE },
  ]
  cards.forEach((c, i) => {
    const x = 0.6 + (i % 3) * 4.2
    const y = 1.6 + Math.floor(i / 3) * 2.6
    kpiSlide.addShape('roundRect', { x, y, w: 3.9, h: 2.2, fill: { color: DARK }, line: { color: DARK }, rectRadius: 0.1 })
    kpiSlide.addText(c.label.toUpperCase(), { x: x + 0.25, y: y + 0.25, w: 3.4, h: 0.5, fontSize: 11, color: SOFT })
    kpiSlide.addText(c.value, { x: x + 0.25, y: y + 0.9, w: 3.4, h: 1, fontSize: 40, bold: true, color: c.color })
  })

  // SMQ table — en-tête vert foncé, corps vert foncé translucide, texte blanc
  const smqSlide = themedSlide(`Performance SMQ ${data.year} (FOR-MI-10)`)
  const smqRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Indicateur', options: { bold: true, color: WHITE, fill: { color: DARK } } },
      { text: 'Valeur', options: { bold: true, color: WHITE, fill: { color: DARK } } },
    ],
    ...[
      [`Non-conformités ${data.year} (total / ouvertes / clôturées)`, `${data.smq.ncTotal} / ${data.smq.ncOpen} / ${data.smq.ncClosed}`],
      ['Taux de clôture des NC', `${data.smq.ncRate}%`],
      ['Taux d’efficacité des CAPA', `${data.smq.capaRate}%`],
      [`Programme d’audit réalisé (${data.smq.auditDone}/${data.smq.auditTotal})`, `${data.smq.auditRate}%`],
      ['Conformité check-lists SME & SST', `${data.smq.hseRate}%`],
      ['Déchets suivis (kg)', data.smq.wasteKg.toLocaleString('fr-FR')],
    ].map((r): PptxGenJS.TableRow => [
      { text: r[0], options: { color: SOFT } },
      { text: r[1], options: { color: WHITE, bold: true } },
    ]),
  ]
  smqSlide.addTable(smqRows, { x: 0.6, y: 1.6, w: 12, fontSize: 14, border: { pt: 0.5, color: TEAL }, fill: { color: DARK }, rowH: 0.55 })

  // Alerts
  const overdueCount = data.alerts.filter((a) => a.overdue).length
  const alertSlide = themedSlide(`Alertes & échéances (${overdueCount} en retard)`)
  if (data.alerts.length === 0) {
    alertSlide.addText('Aucune alerte en cours.', { x: 0.6, y: 1.8, w: 12, h: 0.6, fontSize: 16, color: SOFT })
  } else {
    const alertRows: PptxGenJS.TableRow[] = [
      [
        { text: 'Alerte', options: { bold: true, color: WHITE, fill: { color: DARK } } },
        { text: 'Détail', options: { bold: true, color: WHITE, fill: { color: DARK } } },
        { text: 'Échéance', options: { bold: true, color: WHITE, fill: { color: DARK } } },
      ],
      ...data.alerts.slice(0, 10).map((a): PptxGenJS.TableRow => [
        { text: a.label, options: { color: a.overdue ? RED : AMBER, bold: true } },
        { text: a.detail, options: { color: SOFT } },
        { text: a.dueDate ?? '—', options: { color: WHITE } },
      ]),
    ]
    alertSlide.addTable(alertRows, { x: 0.6, y: 1.6, w: 12, fontSize: 12, border: { pt: 0.5, color: TEAL }, fill: { color: DARK }, rowH: 0.45 })
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
