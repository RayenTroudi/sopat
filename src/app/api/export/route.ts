import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildWorkbook, type ExcelSheet } from '@/lib/export/excel'
import { getOffers, OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/db/commercial'
import { getClientBalances, getClientAccountEntries, ENTRY_TYPE_LABELS, type ClientEntryType } from '@/lib/db/client-accounts'
import { getExtraExpenses, getDeliveryNotes, EXPENSE_STATUS_LABELS, NOTE_TYPE_LABELS } from '@/lib/db/achat'
import { getEnvironmentalAspects, AES_CONDITION_LABELS, AES_STATUS_LABELS } from '@/lib/db/environmental-aspects'
import { getManagementReviews } from '@/lib/db/management-reviews'
import { getMeetings } from '@/lib/db/meetings'
import { getDocumentReviews, getDocumentReviewLinesForExport, DOC_REVIEW_STATUS_LABELS } from '@/lib/db/document-reviews'
import { getOrganizationalKnowledge, KNOWLEDGE_STATUS_LABELS } from '@/lib/db/organizational-knowledge'
import { listNcsForRegisterExport, listAudits, type NcStatus, type AuditStatus } from '@/lib/db/iso'
import { getRisksOpportunities } from '@/lib/db/risks-opportunities'
import { getStakeholders } from '@/lib/db/stakeholders'
import { listSuppliers } from '@/lib/db/suppliers'

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
      }, {
        // La grille du formulaire officiel : une ligne par document revu.
        name: 'Documents revus',
        columns: [
          { header: 'Revue', key: 'reference' },
          { header: 'Date', key: 'reviewDate', format: 'date' },
          { header: 'Processus', key: 'processCode' },
          { header: 'Réf. document', key: 'documentCode' },
          { header: 'Titre de document', key: 'title', width: 40 },
          { header: 'Création / modification / élimination', key: 'changeNeeded' },
          { header: 'Description', key: 'changeDescription', width: 40 },
          { header: 'Revue analyse risques & opportunités', key: 'riskReviewNeeded' },
          { header: 'Description', key: 'riskReviewDescription', width: 40 },
          { header: 'Commentaires', key: 'comments', width: 40 },
        ],
        rows: (await getDocumentReviewLinesForExport()).map((l) => ({
          reference: l.reference,
          reviewDate: l.reviewDate,
          processCode: l.processCode,
          documentCode: l.documentCode,
          // Le titre saisi prime ; à défaut, celui que porte le registre DMS.
          title: l.title ?? l.dmsTitle,
          changeNeeded: l.changeNeeded === null ? '' : l.changeNeeded ? 'Oui' : 'Non',
          changeDescription: l.changeDescription,
          riskReviewNeeded: l.riskReviewNeeded === null ? '' : l.riskReviewNeeded ? 'Oui' : 'Non',
          riskReviewDescription: l.riskReviewDescription,
          comments: l.comments,
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

// ─── Registres historiques ────────────────────────────────────────────────────

const NC_TYPE_FR: Record<string, string> = {
  technique: 'NC Technique', documentaire: 'NC Documentaire',
  reclamation_client: 'Réclamation Client', audit: 'Audit', systeme: 'NC Système',
}
const NC_SOURCE_FR: Record<string, string> = {
  interne: 'Interne', audit: 'Audit',
  reclamation_client: 'Réclamation Client', reclamation_pi: 'Réclamation PI',
}
const NC_STATUS_FR: Record<string, string> = {
  open: 'Ouvert', in_progress: 'En cours', closed: 'Clôturé', verified: 'Vérifié',
}

/**
 * A date, or the planning expression the register recorded instead
 * ("S3 Juin 2025", "Réunion du groupe"). Rendered as text because the column
 * holds both kinds of value.
 */
const dateOrText = (d: Date | null, text: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : (text ?? '')
const yesNo = (b: boolean | null) => (b ? 'Oui' : '')

REGISTERS['nc'] = {
  roles: ['admin', 'direction'],
  title: 'Registre des NC, PNC et réclamations (FOR-MI-05)',
  department: 'Management Qualité & Environnement',
  filename: 'registre-nc',
  async build(sp) {
    const yearParam = sp.get('year')
    const rows = await listNcsForRegisterExport({
      status: (sp.get('status') as NcStatus | null) ?? undefined,
      year: yearParam ? Number(yearParam) : undefined,
    })

    return [{
      name: 'FOR-MI-05',
      columns: [
        { header: 'N° Fiche', key: 'ficheNum', format: 'number' },
        { header: 'Référence', key: 'reference' },
        { header: 'Type de NC', key: 'ncType' },
        { header: 'Source de NC', key: 'ncSource' },
        { header: 'Détecteur', key: 'detector' },
        { header: 'Coordonnées', key: 'detectorEmail' },
        { header: 'Processus rattaché', key: 'dept' },
        { header: 'Document de référence', key: 'referenceDoc' },
        { header: 'Mois', key: 'ncMonth' },
        { header: 'Date', key: 'detectedAt', format: 'date' },
        { header: 'Identification de la NC', key: 'description', width: 60 },
        { header: 'Impact de la non-conformité', key: 'impact', width: 40 },
        { header: 'Autorisation de dérogation', key: 'derogationAuth' },
        { header: 'Rebut', key: 'rebut' },
        { header: 'Correction — Action(s)', key: 'correctionAction', width: 50 },
        { header: 'Correction — Responsable(s)', key: 'correctionResponsible' },
        { header: 'Correction — Date prévue', key: 'correctionPlanned' },
        { header: 'Correction — Date réalisée', key: 'correctionActual' },
        { header: "Correction — État d'avancement", key: 'correctionProgress' },
        { header: 'Analyse des causes', key: 'rootCause', width: 50 },
        { header: 'Actions correctives — Action(s)', key: 'capaAction', width: 50 },
        { header: 'Actions correctives — Responsable(s)', key: 'capaResponsible' },
        { header: 'Actions correctives — Date prévue', key: 'capaPlanned' },
        { header: 'Actions correctives — Date réalisée', key: 'capaActual' },
        { header: "Actions correctives — État d'avancement", key: 'capaProgress' },
        { header: "Date d'évaluation prévue", key: 'evalPlanned' },
        { header: "Date d'évaluation réalisée", key: 'evalActual' },
        { header: 'Réponse Client / PI — Date(s)', key: 'clientResponse' },
        { header: 'Réponse Client / PI — Référence', key: 'clientResponseRef' },
        { header: 'Désignation R/O — Risque', key: 'risk' },
        { header: 'Désignation R/O — Opportunité', key: 'opportunity' },
        { header: "Nécessité d'une 2e AC", key: 'needsSecondCapa' },
        { header: 'Date de clôture', key: 'closedAt', format: 'date' },
        { header: 'Statut', key: 'status' },
        { header: 'Projet', key: 'projectName' },
        { header: 'Code DMS', key: 'dmsDocumentCode' },
      ],
      rows: rows.map((nc) => {
        // The paper register has one Actions correctives block per fiche;
        // additional CAPAs are joined so nothing is dropped from the export.
        const capaAction = nc.capa.map((c) => c.actionDescription).filter(Boolean).join('\n')
        const capaResponsible = nc.capa.map((c) => c.responsibleName).filter(Boolean).join(', ')
        const capaProgress = nc.capa.map((c) => c.progressStatus).filter(Boolean).join(', ')
        const first = nc.capa[0]
        return {
          ficheNum: nc.ncFicheNum,
          reference: nc.reference,
          ncType: nc.ncType ? (NC_TYPE_FR[nc.ncType] ?? nc.ncType) : '',
          ncSource: nc.ncSource ? (NC_SOURCE_FR[nc.ncSource] ?? nc.ncSource) : '',
          detector: nc.detectorName ?? nc.detectedByName ?? '',
          detectorEmail: nc.detectorEmail ?? '',
          dept: nc.dept ?? '',
          referenceDoc: nc.referenceDoc ?? '',
          ncMonth: nc.ncMonth ?? '',
          detectedAt: nc.detectedAt,
          description: nc.description,
          impact: nc.impact ?? '',
          derogationAuth: yesNo(nc.derogationAuth),
          rebut: yesNo(nc.rebut),
          correctionAction: nc.immediateCorrection ?? '',
          correctionResponsible: nc.correctionResponsible ?? '',
          correctionPlanned: dateOrText(nc.correctionDeadlinePlanned, nc.correctionDeadlinePlannedText),
          correctionActual: dateOrText(nc.correctionDeadlineActual, nc.correctionDeadlineActualText),
          correctionProgress: nc.correctionProgress != null ? `${Math.round(nc.correctionProgress * 100)}%` : '',
          rootCause: nc.rootCause ?? '',
          capaAction,
          capaResponsible,
          capaPlanned: first ? dateOrText(first.deadlinePlanned, first.deadlinePlannedText) : '',
          capaActual: first ? dateOrText(first.deadlineActual, first.deadlineActualText) : '',
          capaProgress,
          evalPlanned: nc.evalDatePlanned
            ? new Date(nc.evalDatePlanned).toLocaleDateString('fr-FR')
            : (first ? dateOrText(first.evalDatePlanned, first.evalDatePlannedText) : ''),
          evalActual: nc.evalDateActual
            ? new Date(nc.evalDateActual).toLocaleDateString('fr-FR')
            : (first ? dateOrText(first.evalDateActual, first.evalDateActualText) : ''),
          clientResponse: nc.clientResponse ?? '',
          clientResponseRef: nc.clientResponseRef ?? '',
          risk: nc.isRisk ? (nc.riskDesignation ?? 'Oui') : '',
          opportunity: nc.isOpportunity ? (nc.opportunityDesignation ?? 'Oui') : '',
          needsSecondCapa: yesNo(nc.needsSecondCapa),
          closedAt: nc.closedAt,
          status: NC_STATUS_FR[nc.status] ?? nc.status,
          projectName: nc.projectName ?? '',
          dmsDocumentCode: nc.dmsDocumentCode ?? '',
        }
      }),
      summary: [
        { label: 'Total des écarts', value: rows.length },
        { label: 'NC Système', value: rows.filter((n) => n.ncType === 'systeme').length },
        { label: 'NC Technique', value: rows.filter((n) => n.ncType === 'technique').length },
        { label: 'Clôturées', value: rows.filter((n) => n.status === 'closed' || n.status === 'verified').length },
        { label: 'Ouvertes', value: rows.filter((n) => n.status === 'open' || n.status === 'in_progress').length },
      ],
    }]
  },
}

REGISTERS['audits'] = {
  roles: ['admin', 'direction'],
  title: "Registre des audits internes (FOR-MI-13)",
  department: 'Management Qualité & Environnement',
  filename: 'audits-internes',
  async build(sp) {
    const { rows } = await listAudits({
      status: (sp.get('status') as AuditStatus | null) ?? undefined,
      page: 1,
      pageSize: 10000,
    })
    return [{
      name: 'Audits',
      columns: [
        { header: 'Référence', key: 'reference' },
        { header: 'Date', key: 'auditDate', format: 'date' },
        { header: 'Processus audité', key: 'processAudited' },
        { header: 'Auditeur', key: 'auditorName' },
        { header: 'Périmètre', key: 'scope', width: 40 },
        { header: 'Constats', key: 'findings', width: 50 },
        { header: 'Statut', key: 'status' },
      ],
      rows: rows.map((a) => ({
        reference: a.reference,
        auditDate: a.auditDate,
        processAudited: a.processAudited,
        auditorName: a.auditorName,
        scope: a.scope,
        findings: a.findings,
        status: a.status,
      })),
    }]
  },
}

REGISTERS['risks-opportunities'] = {
  roles: ['admin', 'direction'],
  title: 'Registre des risques et opportunités (FOR-MI-07)',
  department: 'Management Qualité & Environnement',
  filename: 'risques-opportunites',
  async build(sp) {
    const type = sp.get('type') as 'risk' | 'opportunity' | null
    const rows = await getRisksOpportunities({ type: type ?? undefined, status: sp.get('status') ?? undefined })
    return [{
      name: 'R&O',
      columns: [
        { header: 'Référence', key: 'reference' },
        { header: 'Type', key: 'type' },
        { header: 'Catégorie', key: 'category' },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Gravité', key: 'gravity', format: 'number' },
        { header: 'Probabilité', key: 'probability', format: 'number' },
        { header: 'Criticité', key: 'criticality', format: 'number' },
        { header: 'Score', key: 'score', format: 'number' },
        { header: 'Statut', key: 'status' },
        { header: 'Responsable', key: 'owner' },
        { header: 'Échéance', key: 'targetDate', format: 'date' },
      ],
      rows: rows.map(({ ro }) => ({
        reference: ro.reference,
        type: ro.type === 'risk' ? 'Risque' : 'Opportunité',
        category: ro.category.replace(/_/g, ' '),
        description: ro.description,
        gravity: ro.gravity,
        probability: ro.probability,
        criticality: ro.criticality,
        score: ro.score,
        status: ro.status,
        owner: ro.owner,
        targetDate: ro.targetDate,
      })),
    }]
  },
}

REGISTERS['stakeholders'] = {
  roles: ['admin', 'direction'],
  title: 'Registre des parties intéressées (LIS-MI-07 / FOR-MI-08)',
  department: 'Management Qualité & Environnement',
  filename: 'parties-interessees',
  async build() {
    const rows = await getStakeholders()
    return [{
      name: 'PI',
      columns: [
        { header: 'Référence', key: 'reference' },
        { header: 'Nom', key: 'name' },
        { header: 'Type', key: 'type' },
        { header: 'Besoins & attentes', key: 'needs', width: 50 },
        { header: 'Influence', key: 'influence', format: 'number' },
        { header: 'Interaction', key: 'interaction', format: 'number' },
        { header: 'PIP', key: 'isPip' },
        { header: 'Contact', key: 'contactName' },
      ],
      rows: rows.map(({ sh }) => ({
        reference: sh.reference,
        name: sh.name,
        type: sh.type,
        needs: sh.needs,
        influence: sh.influence,
        interaction: sh.interaction,
        isPip: sh.isPip ? 'Oui' : 'Non',
        contactName: sh.contactName,
      })),
    }]
  },
}

REGISTERS['suppliers'] = {
  roles: ['admin', 'direction', 'etudes_chef', 'realisation_chef'],
  title: 'Liste des fournisseurs agréés (LIS-AC-01 / FOR-AC-11)',
  department: 'Achat',
  filename: 'fournisseurs',
  async build(sp) {
    const rows = await listSuppliers({
      search: sp.get('search') ?? undefined,
      category: sp.get('category') ?? undefined,
      status: sp.get('status') ?? undefined,
    })
    return [{
      name: 'Fournisseurs',
      columns: [
        { header: 'Code', key: 'supplierCode' },
        { header: 'Nom', key: 'name' },
        { header: 'Catégorie', key: 'category' },
        { header: 'Ville', key: 'city' },
        { header: 'Contact', key: 'contactName' },
        { header: 'Téléphone', key: 'phone' },
        { header: 'Statut ISO', key: 'isoStatus' },
        { header: 'Score sélection', key: 'selectionScore', format: 'number' },
        { header: 'Classe', key: 'selectionClass' },
      ],
      rows: rows.map((s) => ({
        supplierCode: s.supplierCode,
        name: s.name,
        category: s.category,
        city: s.city,
        contactName: s.contactName,
        phone: s.phone,
        isoStatus: s.isoStatus,
        selectionScore: s.selectionScore,
        selectionClass: s.selectionClass,
      })),
    }]
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
