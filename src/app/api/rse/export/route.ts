import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRseDashboardData, type RseDashboardData } from '@/lib/db/rse-dashboard'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'

export const dynamic = 'force-dynamic'

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

function fmtDate(d: Date | string | null): string {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('fr-FR')
}

function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ─── Excel export ─────────────────────────────────────────────────────────────

function buildExcel(data: RseDashboardData, year: number): Buffer {
  const wb = XLSX.utils.book_new()

  // --- Summary sheet ---
  const summaryRows = [
    ['RAPPORT RSE — SOPAT', ''],
    [`Année de rapport : ${year}`, `Généré le : ${new Date().toLocaleDateString('fr-FR')}`],
    ['', ''],
    ['PILIER ENVIRONNEMENTAL', ''],
    ['Indicateur', 'Valeur'],
    ['Déchets collectés lors des événements (kg)', fmtNum(data.environmental.totalWasteKg, 1)],
    ['Arbres plantés lors des événements', fmtNum(data.environmental.totalTrees)],
    ['Participants aux événements RSE', fmtNum(data.environmental.totalParticipants)],
    ['Linéaire de plage nettoyé (m)', fmtNum(data.environmental.totalBeachCleanedM, 1)],
    ['Zones traitées', fmtNum(data.environmental.totalZonesTreated)],
    ['Couverture médias (événements)', fmtNum(data.environmental.mediaCoverageCount)],
    ['Portée réseaux sociaux', fmtNum(data.environmental.totalSocialMediaReach)],
    ['Articles de presse', fmtNum(data.environmental.totalPressArticles)],
    ['Score satisfaction moyen (événements)', data.environmental.avgSatisfaction != null ? `${fmtNum(data.environmental.avgSatisfaction, 1)}/10` : 'N/D'],
    ['Investissement total événements RSE (TND)', fmtNum(data.environmental.totalEventInvestment, 3)],
    ['Arbres/palmiers en projets d\'aménagement', fmtNum(data.environmental.totalTreesInProjects)],
    ['Total végétaux en projets', fmtNum(data.environmental.totalPlantsInProjects)],
    ['', ''],
    ['PILIER SOCIAL', ''],
    ['Indicateur', 'Valeur'],
    ['Effectifs actifs', fmtNum(data.social.totalActiveEmployees)],
    ['Auditeurs internes qualifiés', fmtNum(data.social.internalAuditorsCount)],
    ['Sessions de formation réalisées', fmtNum(data.social.trainingSessions)],
    ['Participants aux formations', fmtNum(data.social.trainingParticipants)],
    ['Taux de présence aux formations', `${fmtNum(data.social.trainingCompletion)}%`],
    ['Score évaluation formation (moy.)', data.social.avgHotEvalScore != null ? fmtNum(data.social.avgHotEvalScore, 1) : 'N/D'],
    ['Jours de congé approuvés (année)', fmtNum(data.social.totalLeaveDays, 1)],
    ['Non-conformités clôturées (%)', `${fmtNum(data.social.ncsClosedRate)}%`],
    ['Taux de conformité HSE', data.social.hseComplianceRate != null ? `${fmtNum(data.social.hseComplianceRate)}%` : 'N/D'],
    ['', ''],
    ['PILIER PARTENARIATS', ''],
    ['Indicateur', 'Valeur'],
    ['Partenariats actifs', fmtNum(data.partnerships.activePartnerships)],
    ['Total partenariats', fmtNum(data.partnerships.totalPartnerships)],
    ['Engagements respectés (%)', `${fmtNum(data.partnerships.fulfillmentRate)}%`],
    ['Engagements en retard', fmtNum(data.partnerships.overdueCommitments)],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse')

  // --- Environmental trends ---
  const envHeaders = ['Année', 'Déchets (kg)', 'Arbres plantés', 'Participants', 'Nb événements', 'Plage nettoyée (m)']
  const envRows = data.environmental.yearlyTrends.map((r) => [
    r.year, r.wasteKg, r.trees, r.participants, r.eventCount, r.beachCleanedM,
  ])
  const wsEnv = XLSX.utils.aoa_to_sheet([envHeaders, ...envRows])
  wsEnv['!cols'] = envHeaders.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, wsEnv, 'Tendances environnementales')

  // --- Events by type ---
  const typeHeaders = ['Type d\'événement', 'Nombre']
  const typeRows = data.environmental.eventsByType.map((r) => [
    EVENT_TYPE_LABELS[r.eventType] ?? r.eventType,
    r.count,
  ])
  const wsTypes = XLSX.utils.aoa_to_sheet([typeHeaders, ...typeRows])
  wsTypes['!cols'] = [{ wch: 30 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsTypes, 'Événements par type')

  // --- Internal waste tracking ---
  const wasteHeaders = ['Type de déchet', 'Quantité totale (kg)', 'Coût total (TND)']
  const wasteRows = data.environmental.wasteByType.map((r) => [
    WASTE_TYPE_LABELS[r.wasteType] ?? r.wasteType,
    r.totalKg,
    r.cost,
  ])
  const wsWaste = XLSX.utils.aoa_to_sheet([wasteHeaders, ...wasteRows])
  wsWaste['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsWaste, 'Gestion des déchets')

  // --- Formations ---
  const trainHeaders = ['Année', 'Sessions réalisées', 'Participants']
  const trainRows = data.social.trainingByYear.map((r) => [r.year, r.sessions, r.participants])
  const wsTrain = XLSX.utils.aoa_to_sheet([trainHeaders, ...trainRows])
  wsTrain['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsTrain, 'Formations')

  // --- Congés par type ---
  const leaveHeaders = ['Type de congé', 'Jours totaux', 'Nombre de demandes']
  const leaveRows = data.social.leaveByType.map((r) => [
    LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType,
    r.totalDays,
    r.count,
  ])
  const wsLeave = XLSX.utils.aoa_to_sheet([leaveHeaders, ...leaveRows])
  wsLeave['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsLeave, 'Congés')

  // --- Partnerships ---
  const partHeaders = ['Type de partenaire', 'Nombre']
  const partRows = data.partnerships.partnersByType.map((r) => [
    PARTNER_TYPE_LABELS[r.partnerType] ?? r.partnerType,
    r.count,
  ])
  const wsPartners = XLSX.utils.aoa_to_sheet([partHeaders, ...partRows])
  wsPartners['!cols'] = [{ wch: 25 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsPartners, 'Partenariats')

  // --- Locations ---
  const locHeaders = ['Lieu', 'Événements', 'Participants', 'Déchets (kg)']
  const locRows = data.locations.map((r) => [
    r.location, r.eventCount, r.totalParticipants, r.totalWasteKg,
  ])
  const wsLoc = XLSX.utils.aoa_to_sheet([locHeaders, ...locRows])
  wsLoc['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsLoc, 'Répartition géographique')

  // --- Recent events ---
  const evtHeaders = ['Titre', 'Date', 'Type', 'Participants', 'Déchets (kg)', 'Arbres']
  const evtRows = data.recentEvents.map((r) => [
    r.title,
    fmtDate(r.date),
    EVENT_TYPE_LABELS[r.eventType] ?? r.eventType,
    r.participants ?? '',
    r.wasteKg != null ? r.wasteKg : '',
    r.trees ?? '',
  ])
  const wsEvt = XLSX.utils.aoa_to_sheet([evtHeaders, ...evtRows])
  wsEvt['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsEvt, 'Événements récents')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ─── PowerPoint builder ───────────────────────────────────────────────────────

async function buildPptx(data: RseDashboardData, year: number): Promise<Buffer> {
  const prs = new PptxGenJS()
  prs.layout  = 'LAYOUT_WIDE'
  prs.title   = `SOPAT — Rapport RSE ${year}`
  prs.author  = 'SOPAT Platform'

  const GREEN_DARK = '#1A5C36'
  const GREEN      = '#1C7A48'
  const WHITE      = '#FFFFFF'
  const GRAY       = '#6B7280'
  const LIGHT_BG   = '#F8FAF9'
  const BORDER     = '#D1D5DB'

  // ── Slide 1: Cover ──
  const cover = prs.addSlide()
  cover.background = { color: GREEN_DARK }
  cover.addText('RAPPORT RSE', {
    x: 0.8, y: 1.0, w: 10, h: 0.8,
    fontSize: 36, bold: true, color: WHITE, fontFace: 'Calibri',
  })
  cover.addText('Responsabilité Sociale d\'Entreprise', {
    x: 0.8, y: 1.9, w: 10, h: 0.5,
    fontSize: 20, color: '#A7D9BC', fontFace: 'Calibri',
  })
  cover.addText(`Exercice ${year}`, {
    x: 0.8, y: 2.6, w: 6, h: 0.5,
    fontSize: 16, color: WHITE, fontFace: 'Calibri',
  })
  cover.addText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, {
    x: 0.8, y: 3.1, w: 6, h: 0.4,
    fontSize: 12, color: '#A7D9BC', fontFace: 'Calibri',
  })
  cover.addText('SOPAT', {
    x: 0.8, y: 5.2, w: 5, h: 0.4,
    fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri',
  })

  // ── Slide 2: Executive Summary ──
  const summary = prs.addSlide()
  summary.background = { color: LIGHT_BG }
  summary.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: GREEN } })
  summary.addText('Synthèse Exécutive', {
    x: 0.4, y: 0.1, w: 12, h: 0.5,
    fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri',
  })
  summary.addText(`Rapport RSE ${year} — SOPAT`, {
    x: 0.4, y: 0.85, w: 12, h: 0.35,
    fontSize: 11, color: GRAY, fontFace: 'Calibri',
  })

  const kpis = [
    { label: 'Déchets collectés',       val: `${fmtNum(data.environmental.totalWasteKg, 1)} kg` },
    { label: 'Arbres plantés',           val: fmtNum(data.environmental.totalTrees) },
    { label: 'Participants RSE',         val: fmtNum(data.environmental.totalParticipants) },
    { label: 'Événements réalisés',      val: `${fmtNum(data.environmental.completedEvents)} / ${fmtNum(data.environmental.totalEvents)}` },
    { label: 'Partenariats actifs',      val: fmtNum(data.partnerships.activePartnerships) },
    { label: 'Engagements respectés',    val: `${fmtNum(data.partnerships.fulfillmentRate)}%` },
    { label: 'Employés actifs',          val: fmtNum(data.social.totalActiveEmployees) },
    { label: 'Formations réalisées',     val: fmtNum(data.social.trainingSessions) },
  ]

  const cols = 4
  kpis.forEach((k, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 0.3 + col * 3.2
    const y = 1.4 + row * 1.65
    summary.addShape(prs.ShapeType.rect, { x, y, w: 3.0, h: 1.4, fill: { color: WHITE }, line: { color: BORDER, pt: 1 } })
    summary.addShape(prs.ShapeType.rect, { x, y, w: 0.05, h: 1.4, fill: { color: GREEN } })
    summary.addText(k.val, { x: x + 0.15, y: y + 0.12, w: 2.7, h: 0.55, fontSize: 22, bold: true, color: GREEN_DARK, fontFace: 'Calibri' })
    summary.addText(k.label, { x: x + 0.15, y: y + 0.72, w: 2.7, h: 0.5, fontSize: 10, color: GRAY, fontFace: 'Calibri', wrap: true })
  })

  // ── Slide 3: Environmental ──
  const envSlide = prs.addSlide()
  envSlide.background = { color: LIGHT_BG }
  envSlide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: GREEN } })
  envSlide.addText('Pilier Environnemental', {
    x: 0.4, y: 0.1, w: 12, h: 0.5, fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri',
  })
  const envItems: [string, string][] = [
    ['Déchets collectés (événements)', `${fmtNum(data.environmental.totalWasteKg, 1)} kg`],
    ['Arbres plantés (événements)', fmtNum(data.environmental.totalTrees)],
    ['Linéaire de plage nettoyé', `${fmtNum(data.environmental.totalBeachCleanedM, 1)} m`],
    ['Zones traitées', fmtNum(data.environmental.totalZonesTreated)],
    ['Arbres en projets', fmtNum(data.environmental.totalTreesInProjects)],
    ['Total végétaux en projets', fmtNum(data.environmental.totalPlantsInProjects)],
    ['Investissement RSE (TND)', fmtNum(data.environmental.totalEventInvestment, 3)],
    ['Couverture médias', fmtNum(data.environmental.mediaCoverageCount)],
    ['Portée réseaux sociaux', fmtNum(data.environmental.totalSocialMediaReach)],
    ['Score satisfaction moyen', data.environmental.avgSatisfaction != null ? `${fmtNum(data.environmental.avgSatisfaction, 1)}/10` : 'N/D'],
  ]
  envItems.forEach(([label, val], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.3 + col * 6.4
    const y = 0.9 + row * 0.7
    envSlide.addText(`${label}: `, { x, y, w: 4.5, h: 0.4, fontSize: 11, color: GRAY, fontFace: 'Calibri' })
    envSlide.addText(val, { x: x + 4.5, y, w: 1.5, h: 0.4, fontSize: 11, bold: true, color: GREEN_DARK, fontFace: 'Calibri' })
  })

  if (data.environmental.yearlyTrends.length > 0) {
    envSlide.addText('Tendances annuelles', {
      x: 0.3, y: 4.55, w: 6, h: 0.3, fontSize: 11, bold: true, color: GREEN_DARK, fontFace: 'Calibri',
    })
    const rows: PptxGenJS.TableRow[] = [
      ['Année', 'Déchets (kg)', 'Arbres', 'Participants', 'Événements'].map((cell) => ({
        text: cell, options: { bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri', fontSize: 10, align: 'center' as const },
      })),
      ...data.environmental.yearlyTrends.map((r, ri) =>
        [String(r.year), fmtNum(r.wasteKg, 1), fmtNum(r.trees), fmtNum(r.participants), fmtNum(r.eventCount)].map((cell) => ({
          text: cell,
          options: { color: GREEN_DARK, fill: { color: ri % 2 === 0 ? '#EDF5F0' : WHITE }, fontFace: 'Calibri', fontSize: 10, align: 'center' as const },
        }))
      ),
    ]
    envSlide.addTable(rows, { x: 0.3, y: 4.9, w: 12.5, h: 0.36 * (rows.length), colW: [1.5, 2.5, 2, 2.5, 2] })
  }

  // ── Slide 4: Social ──
  const socialSlide = prs.addSlide()
  socialSlide.background = { color: LIGHT_BG }
  socialSlide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '#1D4ED8' } })
  socialSlide.addText('Pilier Social', {
    x: 0.4, y: 0.1, w: 12, h: 0.5, fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri',
  })
  const socialItems: [string, string][] = [
    ['Effectifs actifs', fmtNum(data.social.totalActiveEmployees)],
    ['Auditeurs internes qualifiés', fmtNum(data.social.internalAuditorsCount)],
    ['Sessions de formation', fmtNum(data.social.trainingSessions)],
    ['Participants formations', fmtNum(data.social.trainingParticipants)],
    ['Présence formations', `${fmtNum(data.social.trainingCompletion)}%`],
    ['Score évaluation moyen', data.social.avgHotEvalScore != null ? fmtNum(data.social.avgHotEvalScore, 1) : 'N/D'],
    ['Jours de congé approuvés', fmtNum(data.social.totalLeaveDays, 1)],
    ['NC clôturées', `${fmtNum(data.social.ncsClosedRate)}%`],
    ['Conformité HSE', data.social.hseComplianceRate != null ? `${fmtNum(data.social.hseComplianceRate)}%` : 'N/D'],
  ]
  socialItems.forEach(([label, val], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.3 + col * 6.4
    const y = 0.9 + row * 0.75
    socialSlide.addText(`${label}: `, { x, y, w: 4.5, h: 0.4, fontSize: 11, color: GRAY, fontFace: 'Calibri' })
    socialSlide.addText(val, { x: x + 4.5, y, w: 1.5, h: 0.4, fontSize: 11, bold: true, color: '#1D4ED8', fontFace: 'Calibri' })
  })

  // ── Slide 5: Partnerships ──
  const partSlide = prs.addSlide()
  partSlide.background = { color: LIGHT_BG }
  partSlide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '#B45309' } })
  partSlide.addText('Pilier Partenariats & Communauté', {
    x: 0.4, y: 0.1, w: 12, h: 0.5, fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri',
  })
  const partItems: [string, string][] = [
    ['Partenariats actifs', fmtNum(data.partnerships.activePartnerships)],
    ['Total partenariats', fmtNum(data.partnerships.totalPartnerships)],
    ['Taux engagements respectés', `${fmtNum(data.partnerships.fulfillmentRate)}%`],
    ['Engagements en retard', fmtNum(data.partnerships.overdueCommitments)],
    ['Participants RSE', fmtNum(data.environmental.totalParticipants)],
    ['Portée réseaux sociaux', fmtNum(data.environmental.totalSocialMediaReach)],
  ]
  partItems.forEach(([label, val], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.3 + col * 6.4
    const y = 0.9 + row * 0.75
    partSlide.addText(`${label}: `, { x, y, w: 4.5, h: 0.4, fontSize: 11, color: GRAY, fontFace: 'Calibri' })
    partSlide.addText(val, { x: x + 4.5, y, w: 1.5, h: 0.4, fontSize: 11, bold: true, color: '#B45309', fontFace: 'Calibri' })
  })

  if (data.partnerships.topPartners.length > 0) {
    partSlide.addText('Partenaires actifs', {
      x: 0.3, y: 4.15, w: 6, h: 0.3, fontSize: 11, bold: true, color: '#B45309', fontFace: 'Calibri',
    })
    const rows: PptxGenJS.TableRow[] = [
      ['Partenaire', 'Type', 'Statut'].map((cell) => ({
        text: cell, options: { bold: true, color: WHITE, fill: { color: '#B45309' }, fontFace: 'Calibri', fontSize: 10 },
      })),
      ...data.partnerships.topPartners.map((p, ri) =>
        [
          p.partnerName,
          PARTNER_TYPE_LABELS[p.partnerType] ?? p.partnerType,
          p.status === 'actif' ? 'Actif' : p.status,
        ].map((cell) => ({
          text: cell,
          options: { color: '#4a3000', fill: { color: ri % 2 === 0 ? '#FEF9EE' : WHITE }, fontFace: 'Calibri', fontSize: 10 },
        }))
      ),
    ]
    partSlide.addTable(rows, { x: 0.3, y: 4.5, w: 12.5, h: 0.36 * rows.length, colW: [7.5, 3, 2] })
  }

  // ── Slide 6: Geographic distribution ──
  if (data.locations.length > 0) {
    const locSlide = prs.addSlide()
    locSlide.background = { color: LIGHT_BG }
    locSlide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: GREEN } })
    locSlide.addText('Répartition Géographique', {
      x: 0.4, y: 0.1, w: 12, h: 0.5, fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri',
    })
    const rows: PptxGenJS.TableRow[] = [
      ['Lieu', 'Événements', 'Participants', 'Déchets (kg)'].map((cell) => ({
        text: cell, options: { bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri', fontSize: 11, align: 'center' as const },
      })),
      ...data.locations.map((loc, ri) =>
        [loc.location, fmtNum(loc.eventCount), fmtNum(loc.totalParticipants), fmtNum(loc.totalWasteKg, 1)].map((cell) => ({
          text: cell,
          options: { color: GREEN_DARK, fill: { color: ri % 2 === 0 ? '#EDF5F0' : WHITE }, fontFace: 'Calibri', fontSize: 11 },
        }))
      ),
    ]
    locSlide.addTable(rows, { x: 0.3, y: 0.9, w: 12.5, h: 0.42 * rows.length, colW: [5.5, 2.5, 2.5, 2] })
  }

  // ── Slide 7: Recent Events ──
  if (data.recentEvents.length > 0) {
    const evtSlide = prs.addSlide()
    evtSlide.background = { color: LIGHT_BG }
    evtSlide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: GREEN } })
    evtSlide.addText('Derniers Événements RSE', {
      x: 0.4, y: 0.1, w: 12, h: 0.5, fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri',
    })
    const rows: PptxGenJS.TableRow[] = [
      ['Titre', 'Date', 'Type', 'Participants', 'Déchets (kg)', 'Arbres'].map((cell) => ({
        text: cell, options: { bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri', fontSize: 9, align: 'center' as const },
      })),
      ...data.recentEvents.slice(0, 10).map((e, ri) => {
        const dateStr = e.date ? new Date(e.date instanceof Date ? e.date : String(e.date)).toLocaleDateString('fr-FR') : ''
        return [
          e.title.length > 35 ? e.title.slice(0, 35) + '…' : e.title,
          dateStr,
          EVENT_TYPE_LABELS[e.eventType] ?? e.eventType,
          e.participants != null ? fmtNum(e.participants) : '—',
          e.wasteKg != null ? fmtNum(e.wasteKg, 1) : '—',
          e.trees != null ? fmtNum(e.trees) : '—',
        ].map((cell) => ({
          text: cell,
          options: { color: GREEN_DARK, fill: { color: ri % 2 === 0 ? '#EDF5F0' : WHITE }, fontFace: 'Calibri', fontSize: 9 },
        }))
      }),
    ]
    evtSlide.addTable(rows, { x: 0.3, y: 0.9, w: 12.5, h: 0.38 * rows.length, colW: [4.5, 1.5, 2.5, 1.5, 1.5, 1] })
  }

  const buf = (await prs.write({ outputType: 'nodebuffer' })) as Buffer
  return buf
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'xlsx'
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const data = await getRseDashboardData(year)

  if (format === 'xlsx') {
    const buffer = buildExcel(data, year)
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

  if (format === 'json') {
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unsupported format. Use ?format=xlsx, ?format=pptx or ?format=json' }, { status: 400 })
}
