import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildWorkbook, type ExcelSheet } from '@/lib/export/excel'
import { getOffers, OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/db/commercial'
import { getClientBalances, getClientAccountEntries, ENTRY_TYPE_LABELS, type ClientEntryType } from '@/lib/db/client-accounts'
import { getExtraExpenses, getDeliveryNotes, EXPENSE_STATUS_LABELS, NOTE_TYPE_LABELS } from '@/lib/db/achat'
import { getEnvironmentalAspects, AES_CONDITION_LABELS, AES_STATUS_LABELS } from '@/lib/db/environmental-aspects'
import { getManagementReviews } from '@/lib/db/management-reviews'
import { getMeetings } from '@/lib/db/meetings'
import { getDocumentReviews, DOC_REVIEW_STATUS_LABELS } from '@/lib/db/document-reviews'
import { getOrganizationalKnowledge, KNOWLEDGE_STATUS_LABELS } from '@/lib/db/organizational-knowledge'

export const dynamic = 'force-dynamic'

type RegisterDef = {
  roles: string[]
  title: string
  department: string
  filename: string
  build: (sp: URLSearchParams) => Promise<ExcelSheet[]>
}

const REVIEW_STATUS: Record<string, string> = { planned: 'Planifiée', held: 'Tenue', closed: 'Clôturée' }

const REGISTERS: Record<string, RegisterDef> = {
  offers: {
    roles: ['admin', 'direction', 'etudes_chef'],
    title: 'Tableau de suivi des offres (FOR-CO-01)',
    department: 'Commercial',
    filename: 'suivi-des-offres',
    async build(sp) {
      const status = sp.get('status') as OfferStatus | null
      const rows = await getOffers({ status: status ?? undefined })
      return [{
        name: 'Offres',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Client', key: 'client' },
          { header: 'Projet', key: 'projectTitle' },
          { header: 'Type', key: 'projectType' },
          { header: 'Montant', key: 'amount', format: 'currency' },
          { header: 'Devise', key: 'currency', width: 8 },
          { header: 'Envoyée le', key: 'sentDate', format: 'date' },
          { header: 'Statut', key: 'status' },
          { header: 'Décision le', key: 'decisionDate', format: 'date' },
          { header: 'Responsable', key: 'responsible' },
        ],
        rows: rows.map(({ offer, clientCompany }) => ({
          reference: offer.reference,
          client: clientCompany ?? offer.clientName,
          projectTitle: offer.projectTitle,
          projectType: offer.projectType,
          amount: offer.amount,
          currency: offer.currency,
          sentDate: offer.sentDate,
          status: OFFER_STATUS_LABELS[offer.status as OfferStatus],
          decisionDate: offer.decisionDate,
          responsible: offer.responsible,
        })),
        summary: [
          { label: 'Nombre d’offres', value: rows.length },
          { label: 'Gagnées', value: rows.filter(({ offer }) => offer.status === 'gagnee').length },
          { label: 'Perdues', value: rows.filter(({ offer }) => offer.status === 'perdue').length },
        ],
      }]
    },
  },
  'client-balances': {
    roles: ['admin', 'direction', 'etudes_chef'],
    title: 'État de solde client (FOR-CO-03)',
    department: 'Commercial',
    filename: 'etat-de-solde-client',
    async build(sp) {
      const clientId = sp.get('client') ?? undefined
      const [balances, entries] = await Promise.all([
        getClientBalances(),
        getClientAccountEntries({ clientId }),
      ])
      return [
        {
          name: 'Soldes',
          columns: [
            { header: 'Client', key: 'clientName' },
            { header: 'Facturé', key: 'invoiced', format: 'currency' },
            { header: 'Avoirs', key: 'credited', format: 'currency' },
            { header: 'Encaissé', key: 'collected', format: 'currency' },
            { header: 'Solde', key: 'balance', format: 'currency' },
          ],
          rows: balances.map((b) => ({ ...b })),
          summary: [
            { label: 'Total facturé', value: balances.reduce((s, b) => s + b.invoiced, 0) },
            { label: 'Total encaissé', value: balances.reduce((s, b) => s + b.collected, 0) },
            { label: 'Solde global', value: balances.reduce((s, b) => s + b.balance, 0) },
          ],
        },
        {
          name: 'Écritures',
          columns: [
            { header: 'Date', key: 'entryDate', format: 'date' },
            { header: 'Client', key: 'clientName' },
            { header: 'Projet', key: 'projectName' },
            { header: 'Type', key: 'entryType' },
            { header: 'Montant', key: 'amount', format: 'currency' },
            { header: 'Devise', key: 'currency', width: 8 },
            { header: 'Réf. pièce', key: 'reference' },
            { header: 'Notes', key: 'notes', width: 40 },
          ],
          rows: entries.map(({ entry, clientName, projectName }) => ({
            entryDate: entry.entryDate,
            clientName,
            projectName,
            entryType: ENTRY_TYPE_LABELS[entry.entryType as ClientEntryType],
            amount: entry.amount,
            currency: entry.currency,
            reference: entry.reference,
            notes: entry.notes,
          })),
        },
      ]
    },
  },
  'extra-expenses': {
    roles: ['admin', 'direction', 'realisation_chef', 'etudes_chef'],
    title: 'Extra dépenses (FOR-AC-01)',
    department: 'Achat',
    filename: 'extra-depenses',
    async build(sp) {
      const status = sp.get('status') ?? undefined
      const rows = await getExtraExpenses({ status })
      return [{
        name: 'Dépenses',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Date', key: 'expenseDate', format: 'date' },
          { header: 'Projet', key: 'projectName' },
          { header: 'Catégorie', key: 'category' },
          { header: 'Description', key: 'description', width: 40 },
          { header: 'Montant', key: 'amount', format: 'currency' },
          { header: 'Devise', key: 'currency', width: 8 },
          { header: 'Statut', key: 'status' },
          { header: 'Demandeur', key: 'creatorName' },
        ],
        rows: rows.map(({ expense, projectName, creatorName }) => ({
          reference: expense.reference,
          expenseDate: expense.expenseDate,
          projectName,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          status: EXPENSE_STATUS_LABELS[expense.status],
          creatorName,
        })),
        summary: [
          { label: 'Total approuvé (TND)', value: rows.filter(({ expense }) => expense.status === 'approved').reduce((s, { expense }) => s + Number(expense.amount), 0) },
        ],
      }]
    },
  },
  'delivery-notes': {
    roles: ['admin', 'direction', 'realisation_chef', 'etudes_chef'],
    title: 'Bons de livraison & retour (FOR-AC-06 / FOR-AC-05)',
    department: 'Achat',
    filename: 'bons-livraison-retour',
    async build(sp) {
      const type = sp.get('type') as 'livraison' | 'retour' | null
      const rows = await getDeliveryNotes({ type: type ?? undefined })
      return [{
        name: 'Bons',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Type', key: 'noteType' },
          { header: 'Date', key: 'noteDate', format: 'date' },
          { header: 'Projet', key: 'projectName' },
          { header: 'Fournisseur / Destinataire', key: 'counterparty' },
          { header: 'Nb articles', key: 'itemCount', format: 'number' },
          { header: 'Articles', key: 'itemsText', width: 60 },
          { header: 'Observations', key: 'observations', width: 40 },
        ],
        rows: rows.map(({ note, projectName, supplierName }) => ({
          reference: note.reference,
          noteType: NOTE_TYPE_LABELS[note.noteType],
          noteDate: note.noteDate,
          projectName,
          counterparty: supplierName ?? note.counterparty,
          itemCount: (note.items ?? []).length,
          itemsText: (note.items ?? []).map((it) => `${it.designation} (${it.quantity} ${it.unit})`).join(' ; '),
          observations: note.observations,
        })),
      }]
    },
  },
  aspects: {
    roles: ['admin', 'direction'],
    title: 'Registre des aspects environnementaux (PLA-MI-04/05)',
    department: 'Management Qualité & Environnement',
    filename: 'aspects-environnementaux',
    async build(sp) {
      const rows = await getEnvironmentalAspects({ significantOnly: sp.get('significant') === '1' })
      return [{
        name: 'AES',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Activité', key: 'activity', width: 30 },
          { header: 'Aspect', key: 'aspect', width: 30 },
          { header: 'Impact', key: 'impact', width: 30 },
          { header: 'Condition', key: 'condition' },
          { header: 'Fréquence', key: 'frequency', format: 'number' },
          { header: 'Gravité', key: 'gravity', format: 'number' },
          { header: 'F×G', key: 'significance', format: 'number' },
          { header: 'Significatif', key: 'isSignificant' },
          { header: 'Mesures de maîtrise', key: 'controlMeasures', width: 40 },
          { header: 'Statut', key: 'status' },
        ],
        rows: rows.map(({ aspect }) => ({
          reference: aspect.reference,
          activity: aspect.activity,
          aspect: aspect.aspect,
          impact: aspect.impact,
          condition: AES_CONDITION_LABELS[aspect.condition],
          frequency: aspect.frequency,
          gravity: aspect.gravity,
          significance: aspect.significance,
          isSignificant: aspect.isSignificant ? 'Oui' : 'Non',
          controlMeasures: aspect.controlMeasures,
          status: AES_STATUS_LABELS[aspect.status],
        })),
      }]
    },
  },
  'management-reviews': {
    roles: ['admin', 'direction'],
    title: 'Revues de direction (FOR-MQ-15)',
    department: 'Management Qualité & Environnement',
    filename: 'revues-de-direction',
    async build() {
      const rows = await getManagementReviews()
      return [{
        name: 'Revues',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Date', key: 'reviewDate', format: 'date' },
          { header: 'Statut', key: 'status' },
          { header: 'Participants', key: 'participants', width: 40 },
          { header: 'Conclusions', key: 'conclusions', width: 50 },
        ],
        rows: rows.map(({ review }) => ({
          reference: review.reference,
          reviewDate: review.reviewDate,
          status: REVIEW_STATUS[review.status],
          participants: review.participants,
          conclusions: review.conclusions,
        })),
      }]
    },
  },
  meetings: {
    roles: ['admin', 'direction'],
    title: 'PV de réunion (FOR-MI-04)',
    department: 'Management Qualité & Environnement',
    filename: 'pv-de-reunion',
    async build() {
      const rows = await getMeetings()
      return [{
        name: 'PV',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Date', key: 'meetingDate', format: 'date' },
          { header: 'Type', key: 'meetingType' },
          { header: 'Lieu', key: 'location' },
          { header: 'Participants', key: 'participants', width: 40 },
          { header: 'Décisions', key: 'decisions', width: 50 },
        ],
        rows: rows.map(({ meeting }) => ({
          reference: meeting.reference,
          meetingDate: meeting.meetingDate,
          meetingType: meeting.meetingType,
          location: meeting.location,
          participants: meeting.participants,
          decisions: meeting.decisions,
        })),
      }]
    },
  },
  'document-reviews': {
    roles: ['admin', 'direction'],
    title: 'Revues documentaires (FOR-MI-01)',
    department: 'Management Qualité & Environnement',
    filename: 'revues-documentaires',
    async build() {
      const rows = await getDocumentReviews()
      return [{
        name: 'Revues',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Date', key: 'reviewDate', format: 'date' },
          { header: 'Périmètre', key: 'scope', width: 40 },
          { header: 'Docs revus', key: 'documentsCount', format: 'number' },
          { header: 'Constats', key: 'findings', width: 40 },
          { header: 'Décisions', key: 'decisions', width: 40 },
          { header: 'Prochaine revue', key: 'nextReviewDate', format: 'date' },
          { header: 'Statut', key: 'status' },
        ],
        rows: rows.map(({ review }) => ({
          reference: review.reference,
          reviewDate: review.reviewDate,
          scope: review.scope,
          documentsCount: review.documentsCount,
          findings: review.findings,
          decisions: review.decisions,
          nextReviewDate: review.nextReviewDate,
          status: DOC_REVIEW_STATUS_LABELS[review.status],
        })),
      }]
    },
  },
  knowledge: {
    roles: ['admin', 'direction'],
    title: 'Connaissances organisationnelles (ORG-MI-09)',
    department: 'Management Qualité & Environnement',
    filename: 'connaissances-organisationnelles',
    async build() {
      const rows = await getOrganizationalKnowledge()
      return [{
        name: 'Connaissances',
        columns: [
          { header: 'Référence', key: 'reference' },
          { header: 'Domaine', key: 'domain' },
          { header: 'Connaissance', key: 'title', width: 40 },
          { header: 'Détenteur', key: 'holder' },
          { header: 'Criticité', key: 'criticality', format: 'number' },
          { header: 'Préservation', key: 'preservationMethod', width: 40 },
          { header: 'Plan de transfert', key: 'transferPlan', width: 40 },
          { header: 'Statut', key: 'status' },
        ],
        rows: rows.map(({ knowledge }) => ({
          reference: knowledge.reference,
          domain: knowledge.domain,
          title: knowledge.title,
          holder: knowledge.holder,
          criticality: knowledge.criticality,
          preservationMethod: knowledge.preservationMethod,
          transferPlan: knowledge.transferPlan,
          status: KNOWLEDGE_STATUS_LABELS[knowledge.status],
        })),
      }]
    },
  },
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const registerKey = sp.get('register') ?? ''
  const def = REGISTERS[registerKey]
  if (!def) return NextResponse.json({ error: 'Registre inconnu' }, { status: 400 })
  if (!def.roles.includes(session.user.role))
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })

  const sheets = await def.build(sp)
  const buffer = await buildWorkbook({
    title: def.title,
    department: def.department,
    sheets,
  })

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sopat-${def.filename}-${date}.xlsx"`,
    },
  })
}
