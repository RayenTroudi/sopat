import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRseDashboardData, type RseDashboardData } from '@/lib/db/rse-dashboard'
import { buildWorkbook, type ExcelSheet } from '@/lib/export/excel'
import {
  PPTX_TEAL, PPTX_DARK, PPTX_WHITE, PPTX_WHITE_SOFT,
} from '@/lib/export/brand'
import PptxGenJS from 'pptxgenjs'

export const dynamic = 'force-dynamic'

// Exports du tableau de bord Impact RSE au thème « SOPAT Portfolio »
// (même identité que le rapport de direction : fond vert d'eau, cartes vert
// foncé, texte blanc, logo blanc).

const TEAL  = PPTX_TEAL
const DARK  = PPTX_DARK
const WHITE = PPTX_WHITE
const SOFT  = PPTX_WHITE_SOFT

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage:       'Nettoyage de plage',
  plantation:            'Plantation',
  sensibilisation:       'Sensibilisation',
  team_building:         'Team building',
  journee_environnement: 'Journée environnement',
  autre:                 'Autre',
}

const WASTE_TYPE_LABELS: Record<string, string> = {
  papier_carton:    'Papier / Carton',
  plastique:        'Plastique',
  verre:            'Verre',
  metal:            'Métal',
  dechets_verts:    'Déchets verts',
  dechets_chimiques: 'Déchets chimiques',
  electronique:     'Électronique',
  autre:            'Autre',
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel:      'Congé annuel',
  conge_maladie:     'Congé maladie',
  conge_maternite:   'Congé maternité',
  conge_paternite:   'Congé paternité',
  conge_sans_solde:  'Congé sans solde',
  jour_ferie:        'Jour férié',
  autre:             'Autre',
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  hotel:         'Hôtel',
  municipalite:  'Municipalité',
  entreprise:    'Entreprise',
  institution:   'Institution',
  autre:         'Autre',
}

function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ─── Excel (classeur thémé partagé — src/lib/export/excel.ts) ─────────────────

async function buildExcel(data: RseDashboardData, year: number): Promise<Buffer> {
  const { environmental: env, social, partnerships: part } = data

  const syntheseRows = [
    ...[
      ['Déchets collectés lors des événements (kg)', fmtNum(env.totalWasteKg, 1)],
      ['Arbres plantés lors des événements', fmtNum(env.totalTrees)],
      ['Participants aux événements RSE', fmtNum(env.totalParticipants)],
      ['Linéaire de plage nettoyé (m)', fmtNum(env.totalBeachCleanedM, 1)],
      ['Zones traitées', fmtNum(env.totalZonesTreated)],
      ['Couverture médias (événements)', fmtNum(env.mediaCoverageCount)],
      ['Portée réseaux sociaux', fmtNum(env.totalSocialMediaReach)],
      ['Articles de presse', fmtNum(env.totalPressArticles)],
      ['Score satisfaction moyen (événements)', env.avgSatisfaction != null ? `${fmtNum(env.avgSatisfaction, 1)}/10` : 'N/D'],
      ['Investissement total événements RSE (TND)', fmtNum(env.totalEventInvestment, 3)],
      ['Arbres/palmiers en projets d’aménagement', fmtNum(env.totalTreesInProjects)],
      ['Total végétaux en projets', fmtNum(env.totalPlantsInProjects)],
    ].map(([indicateur, valeur]) => ({ pilier: 'Environnemental', indicateur, valeur })),
    ...[
      ['Effectifs actifs', fmtNum(social.totalActiveEmployees)],
      ['Auditeurs internes qualifiés', fmtNum(social.internalAuditorsCount)],
      ['Sessions de formation réalisées', fmtNum(social.trainingSessions)],
      ['Participants aux formations', fmtNum(social.trainingParticipants)],
      ['Taux de présence aux formations', `${fmtNum(social.trainingCompletion)}%`],
      ['Score évaluation formation (moy.)', social.avgHotEvalScore != null ? fmtNum(social.avgHotEvalScore, 1) : 'N/D'],
      ['Jours de congé approuvés (année)', fmtNum(social.totalLeaveDays, 1)],
      ['Non-conformités clôturées (%)', `${fmtNum(social.ncsClosedRate)}%`],
      ['Taux de conformité HSE', social.hseComplianceRate != null ? `${fmtNum(social.hseComplianceRate)}%` : 'N/D'],
    ].map(([indicateur, valeur]) => ({ pilier: 'Social', indicateur, valeur })),
    ...[
      ['Partenariats actifs', fmtNum(part.activePartnerships)],
      ['Total partenariats', fmtNum(part.totalPartnerships)],
      ['Engagements respectés (%)', `${fmtNum(part.fulfillmentRate)}%`],
      ['Engagements en retard', fmtNum(part.overdueCommitments)],
    ].map(([indicateur, valeur]) => ({ pilier: 'Partenariats', indicateur, valeur })),
  ]

  const sheets: ExcelSheet[] = [
    {
      name: 'Synthèse',
      columns: [
        { header: 'Pilier', key: 'pilier', width: 18 },
        { header: 'Indicateur', key: 'indicateur', width: 48 },
        { header: 'Valeur', key: 'valeur', width: 20 },
      ],
      rows: syntheseRows,
    },
    {
      name: 'Tendances environnementales',
      columns: [
        { header: 'Année', key: 'year', format: 'number', width: 10 },
        { header: 'Déchets (kg)', key: 'wasteKg', format: 'number', width: 16 },
        { header: 'Arbres plantés', key: 'trees', format: 'number', width: 16 },
        { header: 'Participants', key: 'participants', format: 'number', width: 14 },
        { header: 'Nb événements', key: 'eventCount', format: 'number', width: 16 },
        { header: 'Plage nettoyée (m)', key: 'beachCleanedM', format: 'number', width: 18 },
      ],
      rows: env.yearlyTrends.map((r) => ({ ...r })),
    },
    {
      name: 'Événements par type',
      columns: [
        { header: 'Type d’événement', key: 'type', width: 30 },
        { header: 'Nombre', key: 'count', format: 'number', width: 12 },
      ],
      rows: env.eventsByType.map((r) => ({ type: EVENT_TYPE_LABELS[r.eventType] ?? r.eventType, count: r.count })),
    },
    {
      name: 'Gestion des déchets',
      columns: [
        { header: 'Type de déchet', key: 'type', width: 25 },
        { header: 'Quantité totale (kg)', key: 'totalKg', format: 'number', width: 20 },
        { header: 'Coût total (TND)', key: 'cost', format: 'currency', width: 18 },
      ],
      rows: env.wasteByType.map((r) => ({ type: WASTE_TYPE_LABELS[r.wasteType] ?? r.wasteType, totalKg: r.totalKg, cost: r.cost })),
    },
    {
      name: 'Formations',
      columns: [
        { header: 'Année', key: 'year', format: 'number', width: 10 },
        { header: 'Sessions réalisées', key: 'sessions', format: 'number', width: 20 },
        { header: 'Participants', key: 'participants', format: 'number', width: 16 },
      ],
      rows: social.trainingByYear.map((r) => ({ ...r })),
    },
    {
      name: 'Congés',
      columns: [
        { header: 'Type de congé', key: 'type', width: 25 },
        { header: 'Jours totaux', key: 'totalDays', format: 'number', width: 14 },
        { header: 'Nombre de demandes', key: 'count', format: 'number', width: 20 },
      ],
      rows: social.leaveByType.map((r) => ({ type: LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType, totalDays: r.totalDays, count: r.count })),
    },
    {
      name: 'Partenariats',
      columns: [
        { header: 'Type de partenaire', key: 'type', width: 25 },
        { header: 'Nombre', key: 'count', format: 'number', width: 12 },
      ],
      rows: part.partnersByType.map((r) => ({ type: PARTNER_TYPE_LABELS[r.partnerType] ?? r.partnerType, count: r.count })),
    },
    {
      name: 'Répartition géographique',
      columns: [
        { header: 'Lieu', key: 'location', width: 30 },
        { header: 'Événements', key: 'eventCount', format: 'number', width: 14 },
        { header: 'Participants', key: 'totalParticipants', format: 'number', width: 14 },
        { header: 'Déchets (kg)', key: 'totalWasteKg', format: 'number', width: 14 },
      ],
      rows: data.locations.map((r) => ({ ...r })),
    },
    {
      name: 'Événements récents',
      columns: [
        { header: 'Titre', key: 'title', width: 42 },
        { header: 'Date', key: 'date', format: 'date', width: 12 },
        { header: 'Type', key: 'type', width: 24 },
        { header: 'Participants', key: 'participants', format: 'number', width: 14 },
        { header: 'Déchets (kg)', key: 'wasteKg', format: 'number', width: 14 },
        { header: 'Arbres', key: 'trees', format: 'number', width: 10 },
      ],
      rows: data.recentEvents.map((r) => ({
        title: r.title,
        date: r.date,
        type: EVENT_TYPE_LABELS[r.eventType] ?? r.eventType,
        participants: r.participants,
        wasteKg: r.wasteKg,
        trees: r.trees,
      })),
    },
  ]

  return buildWorkbook({
    title: `Rapport Impact RSE — ${year}`,
    department: 'Responsabilité Sociale d’Entreprise',
    sheets,
  })
}

// ─── PowerPoint (thème portfolio) ─────────────────────────────────────────────

async function buildPptx(data: RseDashboardData, year: number): Promise<Buffer> {
  const prs = new PptxGenJS()
  prs.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 })
  prs.layout = 'WIDE'
  prs.title  = `SOPAT — Rapport RSE ${year}`
  prs.author = 'SOPAT ERP'

  const logoPath = path.join(process.cwd(), 'public', 'logo-sopat-white.png')
  const { environmental: env, social, partnerships: part } = data

  function themedSlide(title: string): PptxGenJS.Slide {
    const slide = prs.addSlide()
    slide.background = { color: TEAL }
    slide.addText(title, { x: 4.5, y: 0.35, w: 8.2, h: 0.7, fontSize: 26, color: WHITE, align: 'right' })
    slide.addShape('line', { x: 9.2, y: 1.15, w: 3.5, h: 0, line: { color: WHITE, width: 1 } })
    slide.addImage({ path: logoPath, x: 12.35, y: 6.6, w: 0.7, h: 0.7 })
    return slide
  }

  function labelValueColumns(slide: PptxGenJS.Slide, items: [string, string][], startY = 1.6) {
    items.forEach(([label, val], i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 0.6 + col * 6.3
      const y = startY + row * 0.62
      slide.addText(label, { x, y, w: 4.6, h: 0.45, fontSize: 12, color: SOFT })
      slide.addText(val, { x: x + 4.6, y, w: 1.6, h: 0.45, fontSize: 12, bold: true, color: WHITE, align: 'right' })
    })
  }

  function tableHeader(cells: string[]): PptxGenJS.TableRow {
    return cells.map((text) => ({ text, options: { bold: true, color: WHITE, fill: { color: DARK } } }))
  }

  // Couverture — page de garde du portfolio
  const cover = prs.addSlide()
  cover.background = { color: TEAL }
  cover.addImage({ path: logoPath, x: 5.42, y: 1.5, w: 2.5, h: 2.5 })
  cover.addText('SOPAT', { x: 0.8, y: 4.1, w: 11.7, h: 0.9, fontSize: 44, color: WHITE, align: 'center', charSpacing: 6 })
  cover.addText('SOCIÉTÉ DE PAYSAGE DE TUNISIE', { x: 0.8, y: 5.0, w: 11.7, h: 0.4, fontSize: 13, color: SOFT, align: 'center', charSpacing: 3 })
  cover.addShape('line', { x: 5.9, y: 5.6, w: 1.5, h: 0, line: { color: WHITE, width: 1 } })
  cover.addText(`Rapport Impact RSE — ${year}`, { x: 0.8, y: 5.8, w: 11.7, h: 0.6, fontSize: 20, color: WHITE, align: 'center' })
  cover.addText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { x: 0.8, y: 6.4, w: 11.7, h: 0.4, fontSize: 12, color: SOFT, align: 'center' })

  // Synthèse — cartes vert foncé
  const summary = themedSlide('Synthèse exécutive')
  const kpis = [
    { label: 'Déchets collectés',    val: `${fmtNum(env.totalWasteKg, 1)} kg` },
    { label: 'Arbres plantés',        val: fmtNum(env.totalTrees) },
    { label: 'Participants RSE',      val: fmtNum(env.totalParticipants) },
    { label: 'Événements réalisés',   val: `${fmtNum(env.completedEvents)} / ${fmtNum(env.totalEvents)}` },
    { label: 'Partenariats actifs',   val: fmtNum(part.activePartnerships) },
    { label: 'Engagements respectés', val: `${fmtNum(part.fulfillmentRate)}%` },
    { label: 'Employés actifs',       val: fmtNum(social.totalActiveEmployees) },
    { label: 'Formations réalisées',  val: fmtNum(social.trainingSessions) },
  ]
  kpis.forEach((k, i) => {
    const x = 0.6 + (i % 4) * 3.12
    const y = 1.6 + Math.floor(i / 4) * 2.5
    summary.addShape('roundRect', { x, y, w: 2.9, h: 2.1, fill: { color: DARK }, line: { color: DARK }, rectRadius: 0.1 })
    summary.addText(k.label.toUpperCase(), { x: x + 0.2, y: y + 0.22, w: 2.5, h: 0.6, fontSize: 10, color: SOFT })
    summary.addText(k.val, { x: x + 0.2, y: y + 0.95, w: 2.5, h: 0.9, fontSize: 28, bold: true, color: WHITE })
  })

  // Pilier environnemental
  const envSlide = themedSlide('Pilier Environnemental')
  labelValueColumns(envSlide, [
    ['Déchets collectés (événements)', `${fmtNum(env.totalWasteKg, 1)} kg`],
    ['Arbres plantés (événements)', fmtNum(env.totalTrees)],
    ['Linéaire de plage nettoyé', `${fmtNum(env.totalBeachCleanedM, 1)} m`],
    ['Zones traitées', fmtNum(env.totalZonesTreated)],
    ['Arbres en projets', fmtNum(env.totalTreesInProjects)],
    ['Total végétaux en projets', fmtNum(env.totalPlantsInProjects)],
    ['Investissement RSE (TND)', fmtNum(env.totalEventInvestment, 3)],
    ['Couverture médias', fmtNum(env.mediaCoverageCount)],
    ['Portée réseaux sociaux', fmtNum(env.totalSocialMediaReach)],
    ['Score satisfaction moyen', env.avgSatisfaction != null ? `${fmtNum(env.avgSatisfaction, 1)}/10` : 'N/D'],
  ])
  if (env.yearlyTrends.length > 0) {
    const rows: PptxGenJS.TableRow[] = [
      tableHeader(['Année', 'Déchets (kg)', 'Arbres', 'Participants', 'Événements']),
      ...env.yearlyTrends.map((r): PptxGenJS.TableRow => [
        { text: String(r.year), options: { color: WHITE, bold: true } },
        { text: fmtNum(r.wasteKg, 1), options: { color: SOFT } },
        { text: fmtNum(r.trees), options: { color: SOFT } },
        { text: fmtNum(r.participants), options: { color: SOFT } },
        { text: fmtNum(r.eventCount), options: { color: SOFT } },
      ]),
    ]
    envSlide.addTable(rows, { x: 0.6, y: 5.0, w: 12, fontSize: 11, border: { pt: 0.5, color: TEAL }, fill: { color: DARK }, rowH: 0.38 })
  }

  // Pilier social
  const socialSlide = themedSlide('Pilier Social')
  labelValueColumns(socialSlide, [
    ['Effectifs actifs', fmtNum(social.totalActiveEmployees)],
    ['Auditeurs internes qualifiés', fmtNum(social.internalAuditorsCount)],
    ['Sessions de formation', fmtNum(social.trainingSessions)],
    ['Participants formations', fmtNum(social.trainingParticipants)],
    ['Présence formations', `${fmtNum(social.trainingCompletion)}%`],
    ['Score évaluation moyen', social.avgHotEvalScore != null ? fmtNum(social.avgHotEvalScore, 1) : 'N/D'],
    ['Jours de congé approuvés', fmtNum(social.totalLeaveDays, 1)],
    ['NC clôturées', `${fmtNum(social.ncsClosedRate)}%`],
    ['Conformité HSE', social.hseComplianceRate != null ? `${fmtNum(social.hseComplianceRate)}%` : 'N/D'],
  ])

  // Pilier partenariats
  const partSlide = themedSlide('Pilier Partenariats & Communauté')
  labelValueColumns(partSlide, [
    ['Partenariats actifs', fmtNum(part.activePartnerships)],
    ['Total partenariats', fmtNum(part.totalPartnerships)],
    ['Taux engagements respectés', `${fmtNum(part.fulfillmentRate)}%`],
    ['Engagements en retard', fmtNum(part.overdueCommitments)],
  ])
  if (part.topPartners.length > 0) {
    const rows: PptxGenJS.TableRow[] = [
      tableHeader(['Partenaire', 'Type', 'Statut']),
      ...part.topPartners.map((p): PptxGenJS.TableRow => [
        { text: p.partnerName, options: { color: WHITE, bold: true } },
        { text: PARTNER_TYPE_LABELS[p.partnerType] ?? p.partnerType, options: { color: SOFT } },
        { text: p.status === 'actif' ? 'Actif' : p.status, options: { color: SOFT } },
      ]),
    ]
    partSlide.addTable(rows, { x: 0.6, y: 3.4, w: 12, fontSize: 12, border: { pt: 0.5, color: TEAL }, fill: { color: DARK }, rowH: 0.42 })
  }

  // Répartition géographique
  if (data.locations.length > 0) {
    const locSlide = themedSlide('Répartition géographique')
    const rows: PptxGenJS.TableRow[] = [
      tableHeader(['Lieu', 'Événements', 'Participants', 'Déchets (kg)']),
      ...data.locations.map((l): PptxGenJS.TableRow => [
        { text: l.location, options: { color: WHITE, bold: true } },
        { text: fmtNum(l.eventCount), options: { color: SOFT } },
        { text: fmtNum(l.totalParticipants), options: { color: SOFT } },
        { text: fmtNum(l.totalWasteKg, 1), options: { color: SOFT } },
      ]),
    ]
    locSlide.addTable(rows, { x: 0.6, y: 1.6, w: 12, fontSize: 12, border: { pt: 0.5, color: TEAL }, fill: { color: DARK }, rowH: 0.42 })
  }

  // Derniers événements
  if (data.recentEvents.length > 0) {
    const evtSlide = themedSlide('Derniers événements RSE')
    const rows: PptxGenJS.TableRow[] = [
      tableHeader(['Titre', 'Date', 'Type', 'Participants', 'Déchets (kg)', 'Arbres']),
      ...data.recentEvents.slice(0, 10).map((e): PptxGenJS.TableRow => {
        const dateStr = e.date ? new Date(e.date instanceof Date ? e.date : String(e.date)).toLocaleDateString('fr-FR') : ''
        return [
          { text: e.title.length > 40 ? `${e.title.slice(0, 40)}…` : e.title, options: { color: WHITE } },
          { text: dateStr, options: { color: SOFT } },
          { text: EVENT_TYPE_LABELS[e.eventType] ?? e.eventType, options: { color: SOFT } },
          { text: e.participants != null ? fmtNum(e.participants) : '—', options: { color: SOFT } },
          { text: e.wasteKg != null ? fmtNum(e.wasteKg, 1) : '—', options: { color: SOFT } },
          { text: e.trees != null ? fmtNum(e.trees) : '—', options: { color: SOFT } },
        ]
      }),
    ]
    evtSlide.addTable(rows, { x: 0.6, y: 1.6, w: 12, fontSize: 10, border: { pt: 0.5, color: TEAL }, fill: { color: DARK }, rowH: 0.4, colW: [4.2, 1.3, 2.5, 1.5, 1.5, 1] })
  }

  return (await prs.write({ outputType: 'nodebuffer' })) as Buffer
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'xlsx'
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const data = await getRseDashboardData(year)

  if (format === 'xlsx') {
    const buffer = await buildExcel(data, year)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="SOPAT_RSE_${year}.xlsx"`,
      },
    })
  }

  if (format === 'pptx') {
    const buffer = await buildPptx(data, year)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="SOPAT_RSE_${year}.pptx"`,
      },
    })
  }

  if (format === 'pdf') {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { RseReportDocument } = await import('@/components/pdf/RseReportDocument')
    const element = createElement(RseReportDocument, {
      data, year, generatedAt: new Date().toLocaleDateString('fr-FR'),
    }) as unknown as Parameters<typeof renderToBuffer>[0]
    const buffer = await renderToBuffer(element)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SOPAT_RSE_${year}.pdf"`,
      },
    })
  }

  if (format === 'json') {
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Format non supporté : ?format=xlsx, pptx, pdf ou json' }, { status: 400 })
}
