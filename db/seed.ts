/**
 * SOPAT Admin — Comprehensive demo seed
 *
 * Creates:
 *   5 users  (admin, etudes_chef, realisation_chef, entretien_chef, direction)
 *   5 plant species (supplementing the reference data already seeded separately)
 *  10 suppliers (mix of categories and ISO statuses)
 *   3 completed projects (full data: phases, plant list, budget, purchases, maintenance, satisfaction)
 *   2 active projects (1 en études, 1 en réalisation)
 *   3 closed NCs with CAPAs
 *   6 months of maintenance visit history on the first completed project
 *   project_activity_log entries throughout
 *
 * Run: npx tsx db/seed.ts
 * Safe to re-run: every table uses ON CONFLICT DO NOTHING or existence checks.
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { hash } from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import {
  users,
  plantSpecies,
  suppliers,
  supplierEvaluations,
  projects,
  projectPhases,
  plantListItems,
  budgetPredictions,
  budgetValidations,
  purchaseOrders,
  nonConformances,
  correctiveActions,
  maintenanceSchedules,
  maintenanceVisits,
  plantHealthRecords,
  clientSatisfaction,
  projectActivityLog,
  documents,
  auditLogs,
} from './schema'
import { seedPlantSpecies } from './seeds/plant-species'

const sqlConn = neon(process.env.DATABASE_URL!)
const db = drizzle(sqlConn)

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Days ago from now */
function daysAgo(n: number) { return new Date(Date.now() - n * 86_400_000) }
/** Months ago (approximate) */
function monthsAgo(n: number) { return daysAgo(n * 30) }
/** Days from now */
function daysFromNow(n: number) { return new Date(Date.now() + n * 86_400_000) }

// ─── Upsert helpers ──────────────────────────────────────────────────────────

async function upsertUser(data: {
  email: string; name: string; role: typeof users.$inferInsert['role']
  phone?: string
}) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1)
  if (existing) { console.log(`  skip user ${data.email}  (exists)`); return existing.id }
  const pw = await hash('sopat2025!', 12)
  const [row] = await db.insert(users).values({
    email: data.email, name: data.name, role: data.role,
    phone: data.phone ?? null,
    passwordHash: pw, isActive: true,
  }).returning({ id: users.id })
  console.log(`  + user ${data.email}`)
  return row!.id
}

async function upsertProject(ref: string, data: typeof projects.$inferInsert) {
  const [ex] = await db.select({ id: projects.id }).from(projects).where(eq(projects.reference, ref)).limit(1)
  if (ex) { console.log(`  skip project ${ref} (exists)`); return ex.id }
  const [row] = await db.insert(projects).values(data).returning({ id: projects.id })
  console.log(`  + project ${ref}`)
  return row!.id
}

async function upsertNC(ref: string, data: typeof nonConformances.$inferInsert) {
  const [ex] = await db.select({ id: nonConformances.id }).from(nonConformances).where(eq(nonConformances.reference, ref)).limit(1)
  if (ex) { console.log(`  skip NC ${ref} (exists)`); return ex.id }
  const [row] = await db.insert(nonConformances).values(data).returning({ id: nonConformances.id })
  console.log(`  + NC ${ref}`)
  return row!.id
}

async function upsertAudit(ref: string, data: typeof auditLogs.$inferInsert) {
  const [ex] = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.reference, ref)).limit(1)
  if (ex) return ex.id
  const [row] = await db.insert(auditLogs).values(data).returning({ id: auditLogs.id })
  return row!.id
}

async function logActivity(data: typeof projectActivityLog.$inferInsert) {
  await db.insert(projectActivityLog).values(data)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n══════════════════════════════════════════')
  console.log('  SOPAT — Seed démonstration')
  console.log('══════════════════════════════════════════\n')

  // ── 1. Reference plant species ────────────────────────────────────────────
  console.log('── Espèces végétales ──')
  await seedPlantSpecies()

  // Pull a handful of real IDs for use in plant lists
  const speciesRows = await db
    .select({ id: plantSpecies.id, botanicalName: plantSpecies.botanicalName })
    .from(plantSpecies)
    .limit(20)

  function speciesId(name: string) {
    return speciesRows.find(s => s.botanicalName.includes(name))?.id ?? null
  }

  // ── 2. Users ──────────────────────────────────────────────────────────────
  console.log('\n── Utilisateurs ──')

  const adminId = await upsertUser({
    email: 'admin@sopat.tn',
    name:  'Administrateur SOPAT',
    role:  'admin',
    phone: '+216 71 000 001',
  })

  const directionId = await upsertUser({
    email: 'direction@sopat.tn',
    name:  'Mme Leila Trabelsi',
    role:  'direction',
    phone: '+216 71 000 002',
  })

  const etudesChefId = await upsertUser({
    email: 'chef.etudes@sopat.tn',
    name:  'M. Karim Ben Salah',
    role:  'etudes_chef',
    phone: '+216 25 100 200',
  })

  const realisationChefId = await upsertUser({
    email: 'chef.realisation@sopat.tn',
    name:  'M. Nabil Mzoughi',
    role:  'realisation_chef',
    phone: '+216 25 100 300',
  })

  const entretienChefId = await upsertUser({
    email: 'chef.entretien@sopat.tn',
    name:  'Mme Fatma Boukadida',
    role:  'entretien_chef',
    phone: '+216 25 100 400',
  })

  // ── 3. Suppliers ──────────────────────────────────────────────────────────
  console.log('\n── Fournisseurs ──')

  type SupplierSeed = typeof suppliers.$inferInsert & { evalScore?: number; evalNote?: string }

  const SUPPLIER_DATA: SupplierSeed[] = [
    {
      name: 'Pépinière El Amal',
      category: 'pepiniere',
      contactName: 'Hmed Gharbi',
      email: 'contact@pepiniere-elamal.tn',
      phone: '+216 71 231 100',
      city: 'Tunis',
      address: 'Route de la Marsa, Tunis 1080',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 5,
      lastAuditDate: monthsAgo(3),
      notes: 'Principal fournisseur palmiers et arbres méditerranéens. Délais fiables.',
      isActive: true,
      createdBy: adminId,
      evalScore: 5,
      evalNote: 'Excellente qualité phytosanitaire, certification pépiniériste validée.',
    },
    {
      name: 'Pépinière Carthage Verte',
      category: 'pepiniere',
      contactName: 'Sami Jaziri',
      email: 'carthage.verte@gmail.com',
      phone: '+216 71 745 200',
      city: 'Carthage',
      address: 'Av. Bourguiba, Carthage 2016',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 4,
      lastAuditDate: monthsAgo(6),
      isActive: true,
      createdBy: adminId,
      evalScore: 4,
      evalNote: 'Bonne variété d\'espèces locales. Quelques retards de livraison en été.',
    },
    {
      name: 'Pépinière Méditerranée',
      category: 'pepiniere',
      contactName: 'Mounir Kraïem',
      email: 'info@pepiniere-med.tn',
      phone: '+216 73 512 800',
      city: 'Sousse',
      address: 'Zone Industrielle Sousse Sud',
      isoStatus: 'en_evaluation',
      isoApproved: false,
      evaluationScore: 3,
      lastAuditDate: monthsAgo(1),
      isActive: true,
      createdBy: adminId,
      evalScore: 3,
      evalNote: 'En cours de certification. Stock insuffisant pour grands projets.',
    },
    {
      name: 'Agrégats & Matériaux du Nord',
      category: 'materiaux',
      contactName: 'Ridha Dridi',
      email: 'r.dridi@agrmat.tn',
      phone: '+216 71 600 440',
      city: 'Bizerte',
      address: 'Route de Tunis KM 12, Bizerte',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 4,
      lastAuditDate: monthsAgo(5),
      isActive: true,
      createdBy: adminId,
      evalScore: 4,
      evalNote: 'Substrats et agrégats conformes aux normes. Livraison vrac disponible.',
    },
    {
      name: 'Béton & Pavés Sfax',
      category: 'materiaux',
      contactName: 'Khaled Msallem',
      email: 'contact@bps.tn',
      phone: '+216 74 221 900',
      city: 'Sfax',
      address: 'Route Aéroport, Sfax 3002',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 4,
      lastAuditDate: monthsAgo(8),
      isActive: true,
      createdBy: adminId,
      evalScore: 4,
      evalNote: 'Pavés et dallage haut de gamme. Certifié ISO 9001.',
    },
    {
      name: 'Agro-Équipements Tunisie',
      category: 'equipements',
      contactName: 'Walid Ben Amor',
      email: 'w.benamor@aet.tn',
      phone: '+216 71 880 260',
      city: 'Tunis',
      address: 'Avenue de la République, Tunis',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 5,
      lastAuditDate: monthsAgo(4),
      isActive: true,
      createdBy: adminId,
      evalScore: 5,
      evalNote: 'SAV réactif. Pièces de rechange disponibles.',
    },
    {
      name: 'Irrigation & Systèmes',
      category: 'equipements',
      contactName: 'Imen Chaâbane',
      email: 'imen@irrigation-sys.tn',
      phone: '+216 71 300 570',
      city: 'Ariana',
      address: 'Cité El Ghazala, Ariana',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 5,
      lastAuditDate: monthsAgo(2),
      isActive: true,
      createdBy: adminId,
      evalScore: 5,
      evalNote: 'Spécialiste goutte-à-goutte et arrosage automatique. Excellent suivi.',
    },
    {
      name: 'PhytoSolutions Maghreb',
      category: 'produits_phytosanitaires',
      contactName: 'Dr. Amor Kouki',
      email: 'a.kouki@phytosolutions.tn',
      phone: '+216 71 490 330',
      city: 'Tunis',
      address: 'ZI Charguia I, Tunis 2035',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 5,
      lastAuditDate: monthsAgo(3),
      notes: 'Produits homologués ministère agriculture. Fiches de données de sécurité fournies.',
      isActive: true,
      createdBy: adminId,
      evalScore: 5,
      evalNote: 'Produits certifiés. Traçabilité lot garantie. Formation applicateur incluse.',
    },
    {
      name: 'Transport & Logistique Verte',
      category: 'logistique',
      contactName: 'Tarek Ferchichi',
      email: 'tarek@tlv.tn',
      phone: '+216 71 700 120',
      city: 'Tunis',
      address: 'Rue Ibn Khaldoun, Tunis',
      isoStatus: 'approuve',
      isoApproved: true,
      evaluationScore: 4,
      lastAuditDate: monthsAgo(7),
      isActive: true,
      createdBy: adminId,
      evalScore: 4,
      evalNote: 'Transport frigorifique disponible pour les végétaux sensibles.',
    },
    {
      name: 'Général Agro Import',
      category: 'pepiniere',
      contactName: 'Mohamed Ferjani',
      email: 'mf@generalagroimport.tn',
      phone: '+216 71 200 890',
      city: 'Tunis',
      address: 'Route de Ceinture, Manouba',
      isoStatus: 'suspendu',
      isoApproved: false,
      evaluationScore: 2,
      lastAuditDate: monthsAgo(14),
      notes: 'Suspendu suite audit qualité janv. 2025 — non-conformité phytosanitaire.',
      isActive: true,
      createdBy: adminId,
      evalScore: 2,
      evalNote: 'Audit janv. 2025 : présence résidus pesticides non homologués. Suspension maintenue jusqu\'à re-certification.',
    },
  ]

  const supplierIds: string[] = []
  for (const { evalScore, evalNote, ...s } of SUPPLIER_DATA) {
    const [ex] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.name, s.name)).limit(1)
    let suppId: string
    if (ex) {
      console.log(`  skip supplier ${s.name} (exists)`)
      suppId = ex.id
    } else {
      const [row] = await db.insert(suppliers).values(s).returning({ id: suppliers.id })
      suppId = row!.id
      console.log(`  + supplier ${s.name}`)

      // Evaluation record
      if (evalScore) {
        await db.insert(supplierEvaluations).values({
          supplierId:    suppId,
          evaluatedBy:   adminId,
          evaluatorName: 'Administrateur SOPAT',
          score:         evalScore,
          notes:         evalNote ?? null,
          evaluatedAt:   monthsAgo(2),
          createdBy:     adminId,
        })
      }
    }
    supplierIds.push(suppId)
  }

  const [pepiniereElAmal, pepiniereCarthage,,agregats,,,irrigSys,phyto] = supplierIds

  // ── 4. ISO Documents ──────────────────────────────────────────────────────
  console.log('\n── Documents ISO ──')

  const docsData: typeof documents.$inferInsert[] = [
    {
      code: 'PRO-001', title: 'Procédure de maîtrise des documents', category: 'procedure',
      version: '2.1', status: 'active', ownerId: adminId,
      isoClause: '7.5', processAffected: null, effectiveDate: monthsAgo(365),
      reviewDate: daysFromNow(180), notes: 'Document de référence pour le système de gestion documentaire.',
      createdBy: adminId,
    },
    {
      code: 'PRO-002', title: 'Procédure de gestion des non-conformités', category: 'procedure',
      version: '1.3', status: 'active', ownerId: etudesChefId,
      isoClause: '8.7', processAffected: null, effectiveDate: monthsAgo(300),
      reviewDate: daysFromNow(90), notes: null, createdBy: adminId,
    },
    {
      code: 'INS-001', title: 'Instruction de plantation — arbres de grand développement', category: 'instruction',
      version: '1.0', status: 'active', ownerId: etudesChefId,
      isoClause: '8.5', processAffected: 'realisation' as const, effectiveDate: monthsAgo(200),
      reviewDate: daysFromNow(200), notes: null, createdBy: etudesChefId,
    },
    {
      code: 'INS-002', title: 'Instruction de traitement phytosanitaire', category: 'instruction',
      version: '1.1', status: 'active', ownerId: entretienChefId,
      isoClause: '8.5', processAffected: 'entretien' as const, effectiveDate: monthsAgo(150),
      reviewDate: daysFromNow(220), notes: 'Conforme à la réglementation DGPA.', createdBy: entretienChefId,
    },
    {
      code: 'FORM-001', title: 'Formulaire de réception de chantier', category: 'formulaire',
      version: '1.0', status: 'active', ownerId: realisationChefId,
      isoClause: '8.6', processAffected: 'realisation' as const, effectiveDate: monthsAgo(180),
      reviewDate: daysFromNow(180), notes: null, createdBy: realisationChefId,
    },
  ]

  for (const doc of docsData) {
    const [ex] = await db.select({ id: documents.id }).from(documents).where(eq(documents.code, doc.code!)).limit(1)
    if (!ex) {
      await db.insert(documents).values(doc)
      console.log(`  + doc ${doc.code}`)
    } else {
      console.log(`  skip doc ${doc.code} (exists)`)
    }
  }

  // ── 5. Internal Audits ────────────────────────────────────────────────────
  console.log('\n── Audits internes ──')

  await upsertAudit('AUD-2025-001', {
    reference: 'AUD-2025-001', auditorId: adminId,
    auditDate: monthsAgo(120), processAudited: 'Études & Conception',
    scope: 'Vérification de la conformité du processus études avec les exigences ISO 9001:2015 §8.3',
    findings: 'Constat 1 : absence de formulaire d\'enregistrement pour la revue du plan de conception — NC mineure soulevée (NC-2025-001). Constat 2 : plant list non systématiquement validée par le client avant passage en réalisation.',
    status: 'completed', completedAt: monthsAgo(115), createdBy: adminId,
  })

  await upsertAudit('AUD-2025-002', {
    reference: 'AUD-2025-002', auditorId: directionId,
    auditDate: monthsAgo(60), processAudited: 'Réalisation',
    scope: 'Audit de suivi des achats et du respect des budgets approuvés — §8.4 et §8.5',
    findings: 'Bonne maîtrise globale. Écart observé : bons de commande non systématiquement rattachés aux articles de la liste végétale — action corrective initiée.',
    status: 'completed', completedAt: monthsAgo(55), createdBy: adminId,
  })

  await upsertAudit('AUD-2025-003', {
    reference: 'AUD-2025-003', auditorId: adminId,
    auditDate: daysFromNow(30), processAudited: 'Entretien & Suivi',
    scope: 'Audit planifié du processus entretien — §8.5.1, §9.1.2',
    findings: null, status: 'scheduled', completedAt: null, createdBy: adminId,
  })

  // ── 6. Non-Conformances (closed, with CAPAs) ──────────────────────────────
  console.log('\n── Non-conformités ──')

  const nc1Id = await upsertNC('NC-2025-001', {
    reference: 'NC-2025-001',
    detectedAt: monthsAgo(118),
    detectedBy: etudesChefId,
    processAffected: 'etudes',
    description: 'Absence d\'enregistrement formel de la revue du plan de conception avant envoi au client. Trois projets transmis sans visa du chef d\'études.',
    rootCause: 'Procédure PRO-003 (revue de conception) non connue de l\'équipe nouvellement recrutée. Formation initiale insuffisante.',
    assignedTo: etudesChefId,
    deadline: monthsAgo(88),
    status: 'verified',
    closedAt: monthsAgo(95),
    closedBy: adminId,
    createdBy: adminId,
  })

  const [nc1CapaEx] = await db.select({ id: correctiveActions.id }).from(correctiveActions)
    .where(eq(correctiveActions.ncId, nc1Id)).limit(1)
  if (!nc1CapaEx) {
    await db.insert(correctiveActions).values({
      ncId: nc1Id,
      actionDescription: '1. Session de formation PRO-003 dispensée à l\'ensemble de l\'équipe études (PV joint). 2. Intégration du formulaire FORM-002 (Fiche de revue de conception) dans le workflow GitLab. 3. Contrôle mensuel par le chef d\'études pendant 3 mois.',
      responsibleId: etudesChefId,
      deadline: monthsAgo(100),
      status: 'closed',
      effectivenessVerified: true,
      verifiedAt: monthsAgo(90),
      verifiedBy: adminId,
      closedAt: monthsAgo(95),
      notes: 'Efficacité vérifiée : aucune récurrence constatée lors de l\'audit AUD-2025-002.',
      createdBy: adminId,
    })
    console.log('  + CAPA pour NC-2025-001')
  }

  const nc2Id = await upsertNC('NC-2025-002', {
    reference: 'NC-2025-002',
    detectedAt: monthsAgo(70),
    detectedBy: realisationChefId,
    processAffected: 'realisation',
    description: 'Livraison de Phoenix dactylifera (palmiers dattiers) par pépinière Général Agro Import présentant des signes d\'infection par le Rhynchophorus ferrugineus (charançon rouge). 4 plants sur 10 livrés affectés.',
    rootCause: 'Fournisseur non audité depuis 18 mois. Inspection phytosanitaire à réception non réalisée par l\'équipe de chantier. Manque de procédure formalisée pour l\'inspection de réception.',
    assignedTo: realisationChefId,
    deadline: monthsAgo(40),
    status: 'closed',
    closedAt: monthsAgo(45),
    closedBy: adminId,
    createdBy: adminId,
  })

  const [nc2CapaEx] = await db.select({ id: correctiveActions.id }).from(correctiveActions)
    .where(eq(correctiveActions.ncId, nc2Id)).limit(1)
  if (!nc2CapaEx) {
    await db.insert(correctiveActions).values({
      ncId: nc2Id,
      actionDescription: '1. Plants contaminés retournés au fournisseur et remplacés par la pépinière El Amal. 2. Fournisseur Général Agro Import suspendu (statut ISO mis à jour). 3. Création de l\'instruction INS-003 (Inspection phytosanitaire à réception). 4. Formation équipe réalisation sur la reconnaissance des ravageurs principaux.',
      responsibleId: realisationChefId,
      deadline: monthsAgo(50),
      status: 'closed',
      effectivenessVerified: true,
      verifiedAt: monthsAgo(42),
      verifiedBy: adminId,
      closedAt: monthsAgo(45),
      notes: 'Remplacement effectué. Nouvelle procédure appliquée sur les deux projets suivants sans incident.',
      createdBy: adminId,
    })
    console.log('  + CAPA pour NC-2025-002')
  }

  const nc3Id = await upsertNC('NC-2025-003', {
    reference: 'NC-2025-003',
    detectedAt: monthsAgo(30),
    detectedBy: entretienChefId,
    processAffected: 'entretien',
    description: 'Rapport de visite de maintenance du 05/04/2025 soumis avec 12 jours de retard. Délai contractuel : 48h après visite. Client Résidence Les Jasmins mécontent, signalement par email.',
    rootCause: 'Chef d\'entretien en congé maladie. Pas de procédure de délégation définie. Système de rappel automatique non configuré.',
    assignedTo: entretienChefId,
    deadline: monthsAgo(15),
    status: 'verified',
    closedAt: monthsAgo(18),
    closedBy: adminId,
    createdBy: adminId,
  })

  const [nc3CapaEx] = await db.select({ id: correctiveActions.id }).from(correctiveActions)
    .where(eq(correctiveActions.ncId, nc3Id)).limit(1)
  if (!nc3CapaEx) {
    await db.insert(correctiveActions).values({
      ncId: nc3Id,
      actionDescription: '1. Rapport manquant soumis et excuses présentées au client. 2. Définition d\'une procédure de délégation : en cas d\'absence du chef, le rapport est saisi par le technicien senior dans les 24h. 3. Configuration des rappels automatiques dans le système admin (J+1, J+2 après visite). 4. Communication au client avec geste commercial (visite offerte).',
      responsibleId: entretienChefId,
      deadline: monthsAgo(20),
      status: 'closed',
      effectivenessVerified: true,
      verifiedAt: monthsAgo(16),
      verifiedBy: adminId,
      closedAt: monthsAgo(18),
      notes: 'Client satisfait de la réponse apportée. Procédure de délégation documentée et signée.',
      createdBy: adminId,
    })
    console.log('  + CAPA pour NC-2025-003')
  }

  // ── 7. Projects ───────────────────────────────────────────────────────────
  console.log('\n── Projets ──')

  // ── 7a. Projet TERMINÉ 1 — Villa résidentielle, Carthage ─────────────────
  const p1Id = await upsertProject('SOPAT-2024-001', {
    reference: 'SOPAT-2024-001',
    name: 'Jardin Villa Les Orangers',
    clientName: 'M. & Mme Belhassen',
    clientEmail: 'belhassen.villa@gmail.com',
    clientPhone: '+216 22 300 100',
    siteAddress: '14 Rue Ibn Khaldoun, Carthage Salammbô, 2016',
    siteAreaM2: '520',
    projectType: 'residential',
    status: 'completed',
    startDate: monthsAgo(14),
    estimatedDeliveryDate: monthsAgo(9),
    actualDeliveryDate: monthsAgo(10),
    assignedEtudesChefId: etudesChefId,
    assignedRealisationChefId: realisationChefId,
    assignedEntretienChefId: entretienChefId,
    approvedBudget: '87500.000',
    notes: 'Villa R+1 avec terrasse et piscine. Client exigeant sur l\'authenticité méditerranéenne.',
    createdBy: etudesChefId,
  })

  // Phases for p1
  for (const [phase, status, startedAt, completedAt] of [
    ['etudes',      'completed', monthsAgo(14), monthsAgo(12)] as const,
    ['realisation', 'completed', monthsAgo(12), monthsAgo(10)] as const,
    ['entretien',   'completed', monthsAgo(10), monthsAgo(1)]  as const,
  ]) {
    const [ex] = await db.select({ id: projectPhases.id }).from(projectPhases)
      .where(sql`project_id = ${p1Id} AND phase = ${phase}`).limit(1)
    if (!ex) {
      await db.insert(projectPhases).values({
        projectId: p1Id, phase, status, startedAt, completedAt,
        signedOffAt: completedAt, signedOffBy: adminId, createdBy: etudesChefId,
      })
    }
  }

  // Plant list for p1
  const p1PlantIds: string[] = []
  const p1Plants = [
    { botanicalName: 'Phoenix dactylifera', commonName: 'Palmier dattier', category: 'palm' as const,   qty: '3', unit: 'unit' as const, price: '380.000', supplierId: pepiniereElAmal },
    { botanicalName: 'Olea europaea',        commonName: 'Olivier',          category: 'tree' as const,  qty: '5', unit: 'unit' as const, price: '220.000', supplierId: pepiniereElAmal },
    { botanicalName: 'Jacaranda mimosifolia',commonName: 'Jacaranda',         category: 'tree' as const,  qty: '3', unit: 'unit' as const, price: '180.000', supplierId: pepiniereCarthage },
    { botanicalName: 'Nerium oleander',      commonName: 'Laurier-rose',      category: 'shrub' as const, qty: '24',unit: 'unit' as const, price: '18.000',  supplierId: pepiniereElAmal },
    { botanicalName: 'Bougainvillea spectabilis', commonName: 'Bougainvillée', category: 'shrub' as const, qty: '8', unit: 'unit' as const, price: '22.000', supplierId: pepiniereCarthage },
    { botanicalName: 'Lavandula angustifolia', commonName: 'Lavande',         category: 'ground_cover' as const, qty: '60', unit: 'unit' as const, price: '6.500', supplierId: pepiniereElAmal },
    { botanicalName: 'Cynodon dactylon',     commonName: 'Gazon bermuda',     category: 'grass' as const, qty: '180',unit: 'm2' as const,  price: '4.200',  supplierId: pepiniereElAmal },
  ]
  for (const p of p1Plants) {
    const [ex] = await db.select({ id: plantListItems.id }).from(plantListItems)
      .where(sql`project_id = ${p1Id} AND botanical_name = ${p.botanicalName}`).limit(1)
    if (!ex) {
      const [row] = await db.insert(plantListItems).values({
        projectId: p1Id,
        plantSpeciesId: speciesId(p.botanicalName.split(' ')[0]!),
        botanicalName: p.botanicalName, commonName: p.commonName,
        category: p.category, quantity: p.qty, unit: p.unit,
        unitPriceEstimate: p.price, supplierId: p.supplierId ?? null,
        createdBy: etudesChefId,
      }).returning({ id: plantListItems.id })
      p1PlantIds.push(row!.id)
    }
  }

  // Budget prediction for p1
  const [p1BudgetEx] = await db.select({ id: budgetPredictions.id }).from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, p1Id)).limit(1)
  let p1PredId = p1BudgetEx?.id
  if (!p1BudgetEx) {
    const [row] = await db.insert(budgetPredictions).values({
      projectId: p1Id, version: 1,
      predictedTotal: '84200.000',
      confidenceLow:  '74000.000', confidenceHigh: '95000.000', confidenceScore: 78,
      breakdownPlants:    '36800.000', breakdownSoil:       '14200.000',
      breakdownLabor:     '22400.000', breakdownEquipment:  '7500.000',
      breakdownLogistics: '3300.000',
      topCostDrivers: ['Phoenix dactylifera (×3)', 'Gazon bermuda (180 m²)', 'Main d\'œuvre (14 jours)'],
      modelVersion: 'v1.2', similarProjectsUsed: 9, isFallback: false, status: 'accepted',
      rawInput: { project_type: 'residential', site_area_m2: 520, region: 'tunis', season: 'spring' },
      createdBy: etudesChefId,
    }).returning({ id: budgetPredictions.id })
    p1PredId = row!.id
    console.log('  + budget prediction p1')
  }

  // Budget validation for p1
  if (p1PredId) {
    const [vEx] = await db.select({ id: budgetValidations.id }).from(budgetValidations)
      .where(eq(budgetValidations.projectId, p1Id)).limit(1)
    if (!vEx) {
      await db.insert(budgetValidations).values({
        projectId: p1Id, predictionId: p1PredId, chefUserId: realisationChefId,
        status: 'validated',
        token: `demo-token-p1-${Date.now()}`,
        tokenExpiresAt: monthsAgo(11),
        validatedAt: monthsAgo(12),
        createdBy: etudesChefId,
      })
      console.log('  + budget validation p1')
    }
  }

  // Purchase orders for p1
  const p1Purchases = [
    { item: 'Phoenix dactylifera T60 — 3 unités', qty: '3', price: '395.000', total: '1185.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-087', date: monthsAgo(11) },
    { item: 'Olea europaea tronc 60cm — 5 unités', qty: '5', price: '215.000', total: '1075.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-088', date: monthsAgo(11) },
    { item: 'Jacaranda mimosifolia T18 — 3 unités', qty: '3', price: '175.000', total: '525.000', suppId: pepiniereCarthage, inv: 'FAC-CV-2024-031', date: monthsAgo(11) },
    { item: 'Nerium oleander diverses couleurs — 24 unités', qty: '24', price: '17.500', total: '420.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-089', date: monthsAgo(11) },
    { item: 'Bougainvillea spectabilis grimpant — 8 unités', qty: '8', price: '21.000', total: '168.000', suppId: pepiniereCarthage, inv: 'FAC-CV-2024-032', date: monthsAgo(11) },
    { item: 'Lavande — 60 unités', qty: '60', price: '6.500', total: '390.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-090', date: monthsAgo(11) },
    { item: 'Gazon Cynodon dactylon — 180 m²', qty: '180', price: '4.000', total: '720.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-091', date: monthsAgo(10) },
    { item: 'Terreau enrichi — 18 m³', qty: '18', price: '85.000', total: '1530.000', suppId: agregats, inv: 'FAC-AMN-2024-205', date: monthsAgo(11) },
    { item: 'Système irrigation goutte-à-goutte', qty: '1', price: '12400.000', total: '12400.000', suppId: irrigSys, inv: 'FAC-IS-2024-054', date: monthsAgo(11) },
    { item: 'Main d\'œuvre — 14 jours équipe 3 personnes', qty: '14', price: '1560.000', total: '21840.000', suppId: null, inv: 'INT-2024-P1-MOE', date: monthsAgo(10) },
    { item: 'Location matériel (pelle, transpalette)', qty: '1', price: '3200.000', total: '3200.000', suppId: null, inv: 'LOC-2024-P1-001', date: monthsAgo(11) },
    { item: 'Transport et logistique chantier', qty: '1', price: '2800.000', total: '2800.000', suppId: null, inv: 'TLV-2024-P1-012', date: monthsAgo(11) },
  ]
  const [firstPO] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, p1Id)).limit(1)
  if (!firstPO) {
    for (const po of p1Purchases) {
      await db.insert(purchaseOrders).values({
        projectId: p1Id, itemDescription: po.item,
        quantityPurchased: po.qty, unitPricePaid: po.price, totalCost: po.total,
        supplierId: po.suppId ?? null, supplierInvoiceNumber: po.inv,
        purchaseDate: po.date, purchasedBy: realisationChefId, status: 'invoiced',
        createdBy: realisationChefId,
      })
    }
    console.log(`  + ${p1Purchases.length} purchase orders p1`)
  }

  // Maintenance schedule for p1
  const [p1SchedEx] = await db.select({ id: maintenanceSchedules.id }).from(maintenanceSchedules)
    .where(eq(maintenanceSchedules.projectId, p1Id)).limit(1)
  let p1SchedId = p1SchedEx?.id
  if (!p1SchedEx) {
    const [row] = await db.insert(maintenanceSchedules).values({
      projectId: p1Id, visitFrequency: 'mensuel', visitFrequencyDays: 30,
      contractStartDate: monthsAgo(10), contractEndDate: daysFromNow(60),
      monthlyCost: '1200.000',
      assignedTeamId: entretienChefId, isActive: true,
      notes: 'Contrat annuel renouvelable. Inclut 2 traitements phytosanitaires/an.',
      createdBy: entretienChefId,
    }).returning({ id: maintenanceSchedules.id })
    p1SchedId = row!.id
    console.log('  + maintenance schedule p1')
  }

  // 6 months of maintenance visits for p1
  if (p1SchedId) {
    const [firstVisit] = await db.select({ id: maintenanceVisits.id }).from(maintenanceVisits)
      .where(eq(maintenanceVisits.projectId, p1Id)).limit(1)
    if (!firstVisit) {
      type VisitSeed = {
        monthsAgo: number
        type: typeof maintenanceVisits.$inferInsert['visitType']
        duration: string
        work: string
        products?: Array<{ name: string; quantity: number; unit: string }>
        issues?: string
        zones: Array<{ zoneName: string; status: 'healthy' | 'attention' | 'critical'; score: number; obs: string }>
      }
      const visits: VisitSeed[] = [
        {
          monthsAgo: 9, type: 'controle_general', duration: '4.00',
          work: 'Contrôle général post-livraison : vérification de la reprise de toutes les espèces plantées. Taille légère de formation des arbres. Ajustement des têtes d\'irrigation.',
          products: [{ name: 'Engrais starter (NPK 10-52-10)', quantity: 5, unit: 'kg' }],
          issues: 'Deux Bougainvillea montrant un jaunissement foliaire — probable stress de transplantation.',
          zones: [
            { zoneName: 'Palmiers', status: 'healthy', score: 5, obs: 'Reprise excellente des 3 Phoenix.' },
            { zoneName: 'Arbres', status: 'healthy', score: 4, obs: 'Olivier et Jacaranda bien établis.' },
            { zoneName: 'Arbustes', status: 'attention', score: 3, obs: 'Bougainvillea : jaunissement à surveiller.' },
            { zoneName: 'Gazon', status: 'healthy', score: 4, obs: 'Germination homogène, 85% de couverture.' },
          ],
        },
        {
          monthsAgo: 8, type: 'arrosage', duration: '2.50',
          work: 'Vérification du système d\'irrigation automatique. Réglage de la programmation (fréquence réduite suite pluies). Arrosage manuel des zones non couvertes par l\'arrosage automatique.',
          products: [],
          zones: [
            { zoneName: 'Palmiers', status: 'healthy', score: 5, obs: 'Croissance normale.' },
            { zoneName: 'Arbres', status: 'healthy', score: 5, obs: 'Bonne vigueur.' },
            { zoneName: 'Arbustes', status: 'healthy', score: 4, obs: 'Jaunissement résolu après fertilisation.' },
            { zoneName: 'Gazon', status: 'healthy', score: 5, obs: 'Couverture 100%, belle couleur.' },
          ],
        },
        {
          monthsAgo: 7, type: 'taille', duration: '5.00',
          work: 'Taille de formation des Lauriers-roses et des Bougainvillées. Élagage léger des branches basses des Jacarandas. Désherbage général des massifs. Taille du gazon.',
          products: [{ name: 'Désherb ant total (Glyphosate 360)', quantity: 0.5, unit: 'L' }],
          zones: [
            { zoneName: 'Palmiers', status: 'healthy', score: 5, obs: 'Nettoyage des stipes réalisé.' },
            { zoneName: 'Arbres', status: 'healthy', score: 5, obs: 'Forme bien équilibrée après taille.' },
            { zoneName: 'Arbustes', status: 'healthy', score: 5, obs: 'Lauriers-roses en fleur.' },
            { zoneName: 'Gazon', status: 'healthy', score: 5, obs: 'Taillé à 4 cm. Aspect impeccable.' },
          ],
        },
        {
          monthsAgo: 6, type: 'traitement_phytosanitaire', duration: '3.00',
          work: 'Traitement préventif contre les cochenilles et les pucerons sur les Lauriers-roses. Traitement fongique contre l\'oïdium sur les Bougainvillées. Application de soufre mouillable sur les Olivi ers.',
          products: [
            { name: 'Confidor (Imidaclopride 200 g/L)', quantity: 1, unit: 'L' },
            { name: 'Soufre mouillable 80%', quantity: 3, unit: 'kg' },
            { name: 'Carbendazime 50%', quantity: 0.5, unit: 'L' },
          ],
          zones: [
            { zoneName: 'Palmiers', status: 'healthy', score: 5, obs: 'Aucun ravageur observé.' },
            { zoneName: 'Arbres', status: 'healthy', score: 4, obs: 'Traces légères d\'oïdium traitées.' },
            { zoneName: 'Arbustes', status: 'attention', score: 3, obs: 'Cochenilles sur Lauriers-roses — traitement appliqué, à contrôler.' },
            { zoneName: 'Gazon', status: 'healthy', score: 5, obs: 'RAS.' },
          ],
        },
        {
          monthsAgo: 4, type: 'fertilisation', duration: '3.50',
          work: 'Fertilisation de printemps : apport d\'engrais à libération lente en surface, incorporation par arrosage. Apport de compost en paillage autour des arbres. Regarnissage gazon sur zones clairsemées (100 m²).',
          products: [
            { name: 'Engrais granulé NPK 15-5-20 + oligo-éléments', quantity: 12, unit: 'kg' },
            { name: 'Compost mûr', quantity: 200, unit: 'kg' },
          ],
          zones: [
            { zoneName: 'Palmiers', status: 'healthy', score: 5, obs: 'Excellente vigueur printanière.' },
            { zoneName: 'Arbres', status: 'healthy', score: 5, obs: 'Feuillaison abondante.' },
            { zoneName: 'Arbustes', status: 'healthy', score: 5, obs: 'Cochenilles disparues. Plein développement.' },
            { zoneName: 'Gazon', status: 'healthy', score: 4, obs: 'Regarnissage réalisé, levée en cours.' },
          ],
        },
        {
          monthsAgo: 2, type: 'controle_general', duration: '4.50',
          work: 'Contrôle semestriel complet. Taille de maintenance des haies et arbustes. Vérification intégralité du système d\'irrigation (changement de 2 micro-diffuseurs défectueux). Bilan de l\'état sanitaire général. Présentation du bilan au client.',
          products: [{ name: 'Micro-diffuseurs 180° débit 40 L/h', quantity: 2, unit: 'unité' }],
          zones: [
            { zoneName: 'Palmiers', status: 'healthy', score: 5, obs: 'Les 3 Phoenix en parfaite santé. Client très satisfait.' },
            { zoneName: 'Arbres', status: 'healthy', score: 5, obs: 'Jacaranda en fleur, spectaculaire.' },
            { zoneName: 'Arbustes', status: 'healthy', score: 5, obs: 'Tous les arbustes en pleine forme.' },
            { zoneName: 'Gazon', status: 'healthy', score: 5, obs: 'Couverture parfaite, couleur verte dense.' },
          ],
        },
      ]

      for (const v of visits) {
        const visitDate = monthsAgo(v.monthsAgo)
        const [vRow] = await db.insert(maintenanceVisits).values({
          scheduleId:              p1SchedId!,
          projectId:               p1Id,
          visitDate,
          visitType:               v.type,
          durationHours:           v.duration,
          teamMemberId:            entretienChefId,
          workDone:                v.work,
          workChecklist:           { taille: v.type === 'taille', arrosage: v.type === 'arrosage', desherbage: v.type === 'taille', traitement: v.type === 'traitement_phytosanitaire', fertilisation: v.type === 'fertilisation', nettoyage: true },
          productsUsed:            v.products ?? [],
          issuesFound:             v.issues ?? null,
          nextVisitRecommendation: `Prochaine visite dans ${v.monthsAgo <= 4 ? '4' : '6'} semaines.`,
          createdBy:               entretienChefId,
        }).returning({ id: maintenanceVisits.id })

        const visitId = vRow!.id
        for (const z of v.zones) {
          await db.insert(plantHealthRecords).values({
            visitId, projectId: p1Id,
            zoneName:     z.zoneName,
            healthStatus: z.status,
            healthScore:  z.score,
            observations: z.obs,
            createdBy:    entretienChefId,
          })
        }
      }
      console.log(`  + ${visits.length} maintenance visits + health records p1`)
    }
  }

  // Client satisfaction for p1
  const [satEx] = await db.select({ id: clientSatisfaction.id }).from(clientSatisfaction)
    .where(eq(clientSatisfaction.projectId, p1Id)).limit(1)
  if (!satEx) {
    await db.insert(clientSatisfaction).values([
      {
        projectId: p1Id, score: 5, recordedBy: entretienChefId, isoClause: '9.1.2',
        recordedAt: monthsAgo(9),
        comments: 'Travail remarquable, le jardin est exactement comme nous l\'avions imaginé. L\'équipe est sérieuse et ponctuelle. Nous recommandons vivement SOPAT.',
        createdBy: entretienChefId,
      },
      {
        projectId: p1Id, score: 5, recordedBy: entretienChefId, isoClause: '9.1.2',
        recordedAt: monthsAgo(3),
        comments: 'Six mois après livraison, tout est toujours impeccable. Le suivi entretien est excellent.',
        createdBy: entretienChefId,
      },
    ])
    console.log('  + client satisfaction p1')
  }

  // Activity log for p1
  const [actEx] = await db.select({ id: projectActivityLog.id }).from(projectActivityLog)
    .where(eq(projectActivityLog.projectId, p1Id)).limit(1)
  if (!actEx) {
    await logActivity({ projectId: p1Id, actorId: etudesChefId, actorName: 'M. Karim Ben Salah', action: 'project.created', newState: { status: 'etudes' }, occurredAt: monthsAgo(14), createdBy: etudesChefId })
    await logActivity({ projectId: p1Id, actorId: etudesChefId, actorName: 'M. Karim Ben Salah', action: 'project.phase_transition', previousState: { phase: 'etudes' }, newState: { phase: 'realisation' }, occurredAt: monthsAgo(12), createdBy: etudesChefId })
    await logActivity({ projectId: p1Id, actorId: realisationChefId, actorName: 'M. Nabil Mzoughi', action: 'budget.validated_by_chef', newState: { amount: 87500 }, occurredAt: monthsAgo(12), createdBy: realisationChefId })
    await logActivity({ projectId: p1Id, actorId: realisationChefId, actorName: 'M. Nabil Mzoughi', action: 'project.phase_transition', previousState: { phase: 'realisation' }, newState: { phase: 'entretien' }, occurredAt: monthsAgo(10), createdBy: realisationChefId })
    console.log('  + activity log p1')
  }

  // ── 7b. Projet TERMINÉ 2 — Espace commercial, La Marsa ───────────────────
  const p2Id = await upsertProject('SOPAT-2024-002', {
    reference: 'SOPAT-2024-002',
    name: 'Aménagement Galerie Carthage Mall',
    clientName: 'Société Immobilière Carthage (SIC)',
    clientEmail: 'aménagement@carthage-mall.tn',
    clientPhone: '+216 71 780 050',
    siteAddress: 'Avenue Taïeb Mhiri, La Marsa 2078',
    siteAreaM2: '1250',
    projectType: 'commercial',
    status: 'completed',
    startDate: monthsAgo(18),
    estimatedDeliveryDate: monthsAgo(12),
    actualDeliveryDate: monthsAgo(11),
    assignedEtudesChefId: etudesChefId,
    assignedRealisationChefId: realisationChefId,
    assignedEntretienChefId: entretienChefId,
    approvedBudget: '178000.000',
    notes: 'Parvis et espaces verts intérieurs du centre commercial. Forte contrainte de calendrier (ouverture fixe).',
    createdBy: etudesChefId,
  })

  for (const [phase, status, startedAt, completedAt] of [
    ['etudes',      'completed', monthsAgo(18), monthsAgo(16)] as const,
    ['realisation', 'completed', monthsAgo(16), monthsAgo(11)] as const,
    ['entretien',   'completed', monthsAgo(11), monthsAgo(2)]  as const,
  ]) {
    const [ex] = await db.select({ id: projectPhases.id }).from(projectPhases)
      .where(sql`project_id = ${p2Id} AND phase = ${phase}`).limit(1)
    if (!ex) {
      await db.insert(projectPhases).values({
        projectId: p2Id, phase, status, startedAt, completedAt,
        signedOffAt: completedAt, signedOffBy: adminId, createdBy: etudesChefId,
      })
    }
  }

  // Budget prediction p2
  const [p2BudEx] = await db.select({ id: budgetPredictions.id }).from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, p2Id)).limit(1)
  let p2PredId = p2BudEx?.id
  if (!p2BudEx) {
    const [row] = await db.insert(budgetPredictions).values({
      projectId: p2Id, version: 1,
      predictedTotal: '168000.000',
      confidenceLow: '149000.000', confidenceHigh: '189000.000', confidenceScore: 72,
      breakdownPlants: '68000.000', breakdownSoil: '28000.000',
      breakdownLabor:  '52000.000', breakdownEquipment: '14000.000', breakdownLogistics: '6000.000',
      topCostDrivers: ['Palmiers Washingtonia (×12)', 'Main d\'œuvre (28 jours)', 'Substrats (120 m³)'],
      modelVersion: 'v1.2', similarProjectsUsed: 6, isFallback: false, status: 'accepted',
      rawInput: { project_type: 'commercial', site_area_m2: 1250, region: 'tunis', season: 'autumn' },
      createdBy: etudesChefId,
    }).returning({ id: budgetPredictions.id })
    p2PredId = row!.id
  }

  if (p2PredId) {
    const [vEx] = await db.select({ id: budgetValidations.id }).from(budgetValidations)
      .where(eq(budgetValidations.projectId, p2Id)).limit(1)
    if (!vEx) {
      await db.insert(budgetValidations).values({
        projectId: p2Id, predictionId: p2PredId, chefUserId: realisationChefId,
        status: 'modified',
        modificationReason: 'Ajout de 8 Washingtonia robusta supplémentaires à la demande du client suite révision du plan d\'architecte. Augmentation de 10 000 TND.',
        token: `demo-token-p2-${Date.now()}`,
        tokenExpiresAt: monthsAgo(15),
        modifiedAt: monthsAgo(16),
        createdBy: etudesChefId,
      })
    }
  }

  // Purchases p2
  const [p2POEx] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, p2Id)).limit(1)
  if (!p2POEx) {
    const p2Purchases = [
      { item: 'Washingtonia robusta T80 — 12 unités', qty: '12', price: '520.000', total: '6240.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-112' },
      { item: 'Ficus nitida haie 1.5m — 45 unités', qty: '45', price: '35.000', total: '1575.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-113' },
      { item: 'Bougainvillea spectabilis — 30 unités', qty: '30', price: '22.000', total: '660.000', suppId: pepiniereCarthage, inv: 'FAC-CV-2024-048' },
      { item: 'Gazon Stenotaphrum — 800 m²', qty: '800', price: '3.800', total: '3040.000', suppId: pepiniereElAmal, inv: 'FAC-EA-2024-114' },
      { item: 'Terreau professionnel 100 L — 120 m³', qty: '120', price: '82.000', total: '9840.000', suppId: agregats, inv: 'FAC-AMN-2024-218' },
      { item: 'Système irrigation automatique + programmateur', qty: '1', price: '28500.000', total: '28500.000', suppId: irrigSys, inv: 'FAC-IS-2024-068' },
      { item: 'Main d\'œuvre — 28 jours (équipe 4)', qty: '28', price: '2100.000', total: '58800.000', suppId: null, inv: 'INT-2024-P2-MOE' },
      { item: 'Dalles béton et bordures', qty: '1', price: '18400.000', total: '18400.000', suppId: null, inv: 'BPS-2024-P2-001' },
      { item: 'Logistique et transport', qty: '1', price: '4800.000', total: '4800.000', suppId: null, inv: 'TLV-2024-P2-009' },
    ]
    for (const po of p2Purchases) {
      await db.insert(purchaseOrders).values({
        projectId: p2Id, itemDescription: po.item,
        quantityPurchased: po.qty, unitPricePaid: po.price, totalCost: po.total,
        supplierId: po.suppId ?? null, supplierInvoiceNumber: po.inv,
        purchaseDate: monthsAgo(13), purchasedBy: realisationChefId, status: 'invoiced',
        createdBy: realisationChefId,
      })
    }
    console.log(`  + ${p2Purchases.length} purchase orders p2`)
  }

  // Satisfaction p2
  const [sat2Ex] = await db.select({ id: clientSatisfaction.id }).from(clientSatisfaction)
    .where(eq(clientSatisfaction.projectId, p2Id)).limit(1)
  if (!sat2Ex) {
    await db.insert(clientSatisfaction).values({
      projectId: p2Id, score: 4, recordedBy: entretienChefId, isoClause: '9.1.2',
      recordedAt: monthsAgo(10),
      comments: 'Livraison dans les délais malgré les contraintes de l\'ouverture. Quelques retouches demandées sur les massifs du parvis, traitées rapidement. Satisfaits dans l\'ensemble.',
      createdBy: entretienChefId,
    })
    console.log('  + satisfaction p2')
  }

  // ── 7c. Projet TERMINÉ 3 — Espace public, Sousse ─────────────────────────
  const p3Id = await upsertProject('SOPAT-2024-003', {
    reference: 'SOPAT-2024-003',
    name: 'Réaménagement Place Farhat Hached',
    clientName: 'Municipalité de Sousse',
    clientEmail: 'travaux@mairie-sousse.tn',
    clientPhone: '+216 73 225 100',
    siteAddress: 'Place Farhat Hached, Sousse 4000',
    siteAreaM2: '3200',
    projectType: 'public',
    status: 'completed',
    startDate: monthsAgo(22),
    estimatedDeliveryDate: monthsAgo(14),
    actualDeliveryDate: monthsAgo(16),
    assignedEtudesChefId: etudesChefId,
    assignedRealisationChefId: realisationChefId,
    assignedEntretienChefId: entretienChefId,
    approvedBudget: '342000.000',
    notes: 'Appel d\'offres public. Espace à fort passage piétonnier. Espèces résistantes à la sécheresse exigées.',
    createdBy: etudesChefId,
  })

  for (const [phase, status, startedAt, completedAt] of [
    ['etudes',      'completed', monthsAgo(22), monthsAgo(20)] as const,
    ['realisation', 'completed', monthsAgo(20), monthsAgo(16)] as const,
    ['entretien',   'completed', monthsAgo(16), monthsAgo(4)]  as const,
  ]) {
    const [ex] = await db.select({ id: projectPhases.id }).from(projectPhases)
      .where(sql`project_id = ${p3Id} AND phase = ${phase}`).limit(1)
    if (!ex) {
      await db.insert(projectPhases).values({
        projectId: p3Id, phase, status, startedAt, completedAt,
        signedOffAt: completedAt, signedOffBy: adminId, createdBy: etudesChefId,
      })
    }
  }

  // Budget + purchases (compact version for p3)
  const [p3BudEx] = await db.select({ id: budgetPredictions.id }).from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, p3Id)).limit(1)
  let p3PredId = p3BudEx?.id
  if (!p3BudEx) {
    const [row] = await db.insert(budgetPredictions).values({
      projectId: p3Id, version: 1,
      predictedTotal: '358000.000',
      confidenceLow: '315000.000', confidenceHigh: '402000.000', confidenceScore: 65,
      breakdownPlants: '132000.000', breakdownSoil: '62000.000',
      breakdownLabor: '108000.000', breakdownEquipment: '38000.000', breakdownLogistics: '18000.000',
      topCostDrivers: ['Palmiers Phoenix (×20)', 'Main d\'œuvre (48 jours)', 'Infrastructures béton'],
      modelVersion: 'v1.2', similarProjectsUsed: 4, isFallback: false, status: 'accepted',
      rawInput: { project_type: 'public', site_area_m2: 3200, region: 'sousse', season: 'winter' },
      createdBy: etudesChefId,
    }).returning({ id: budgetPredictions.id })
    p3PredId = row!.id
  }

  if (p3PredId) {
    const [vEx] = await db.select({ id: budgetValidations.id }).from(budgetValidations)
      .where(eq(budgetValidations.projectId, p3Id)).limit(1)
    if (!vEx) {
      await db.insert(budgetValidations).values({
        projectId: p3Id, predictionId: p3PredId, chefUserId: realisationChefId,
        status: 'validated',
        token: `demo-token-p3-${Date.now()}`,
        tokenExpiresAt: monthsAgo(19),
        validatedAt: monthsAgo(20),
        createdBy: etudesChefId,
      })
    }
  }

  const [p3POEx] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, p3Id)).limit(1)
  if (!p3POEx) {
    const p3Purchases = [
      { item: 'Phoenix dactylifera T80 — 20 unités',      qty: '20',  price: '420.000',  total: '8400.000',  inv: 'FAC-EA-2023-201' },
      { item: 'Washingtonia robusta T60 — 15 unités',     qty: '15',  price: '480.000',  total: '7200.000',  inv: 'FAC-EA-2023-202' },
      { item: 'Agave americana — 80 unités',              qty: '80',  price: '45.000',   total: '3600.000',  inv: 'FAC-CV-2023-082' },
      { item: 'Cupressus sempervirens T200 — 40 unités',  qty: '40',  price: '95.000',   total: '3800.000',  inv: 'FAC-EA-2023-203' },
      { item: 'Gazon bermuda — 1800 m²',                  qty: '1800',price: '3.600',    total: '6480.000',  inv: 'FAC-EA-2023-204' },
      { item: 'Terreau + substrat drainant — 250 m³',     qty: '250', price: '78.000',   total: '19500.000', inv: 'FAC-AMN-2023-310' },
      { item: 'Réseau irrigation intégral',               qty: '1',   price: '52000.000',total: '52000.000', inv: 'FAC-IS-2023-099' },
      { item: 'Main d\'œuvre 48 jours (équipe 5)',        qty: '48',  price: '2600.000', total: '124800.000',inv: 'INT-2023-P3-MOE' },
      { item: 'Infrastructure béton (allées, bancs)',     qty: '1',   price: '88000.000',total: '88000.000', inv: 'CONST-2023-P3-001' },
      { item: 'Éclairage extérieur paysager',             qty: '1',   price: '22000.000',total: '22000.000', inv: 'ELEC-2023-P3-001' },
    ]
    for (const po of p3Purchases) {
      await db.insert(purchaseOrders).values({
        projectId: p3Id, itemDescription: po.item,
        quantityPurchased: po.qty, unitPricePaid: po.price, totalCost: po.total,
        supplierId: null, supplierInvoiceNumber: po.inv,
        purchaseDate: monthsAgo(18), purchasedBy: realisationChefId, status: 'invoiced',
        createdBy: realisationChefId,
      })
    }
    console.log(`  + ${p3Purchases.length} purchase orders p3`)
  }

  const [sat3Ex] = await db.select({ id: clientSatisfaction.id }).from(clientSatisfaction)
    .where(eq(clientSatisfaction.projectId, p3Id)).limit(1)
  if (!sat3Ex) {
    await db.insert(clientSatisfaction).values({
      projectId: p3Id, score: 4, recordedBy: entretienChefId, isoClause: '9.1.2',
      recordedAt: monthsAgo(15),
      comments: 'Réalisation de qualité. La place est appréciée des citoyens. Deux palmiers ont nécessité un remplacement sous garantie, traité professionnellement.',
      createdBy: entretienChefId,
    })
    console.log('  + satisfaction p3')
  }

  // ── 7d. Projet ACTIF — En phase Études, Sidi Bou Saïd ────────────────────
  const p4Id = await upsertProject('SOPAT-2025-004', {
    reference: 'SOPAT-2025-004',
    name: 'Jardin Méditerranéen Résidence Sidi Bou',
    clientName: 'Mme Raoudha Mezghani',
    clientEmail: 'r.mezghani@hotmail.com',
    clientPhone: '+216 98 500 720',
    siteAddress: 'Rue Sidi Chbaane, Sidi Bou Saïd 2026',
    siteAreaM2: '680',
    projectType: 'residential',
    status: 'etudes',
    startDate: monthsAgo(3),
    estimatedDeliveryDate: daysFromNow(90),
    assignedEtudesChefId: etudesChefId,
    assignedRealisationChefId: realisationChefId,
    assignedEntretienChefId: entretienChefId,
    approvedBudget: null,
    notes: 'Propriété avec vue mer. Client souhaite un style andalou-méditerranéen avec espèces locales. Contrainte : sol très calcaire, nécessite amendement important.',
    createdBy: etudesChefId,
  })

  for (const [phase, status, startedAt] of [
    ['etudes',      'in_progress', monthsAgo(3)] as const,
    ['realisation', 'pending',     null]          as const,
    ['entretien',   'pending',     null]           as const,
  ]) {
    const [ex] = await db.select({ id: projectPhases.id }).from(projectPhases)
      .where(sql`project_id = ${p4Id} AND phase = ${phase}`).limit(1)
    if (!ex) {
      await db.insert(projectPhases).values({
        projectId: p4Id, phase, status, startedAt, completedAt: null,
        createdBy: etudesChefId,
      })
    }
  }

  // Partial plant list for p4 (études still ongoing)
  const p4Plants = [
    { bot: 'Phoenix dactylifera',      com: 'Palmier dattier',    cat: 'palm' as const,         qty: '2', unit: 'unit' as const, price: '400.000', suppId: pepiniereElAmal },
    { bot: 'Olea europaea',            com: 'Olivier multi-tiges',cat: 'tree' as const,         qty: '4', unit: 'unit' as const, price: '280.000', suppId: pepiniereElAmal },
    { bot: 'Ceratonia siliqua',        com: 'Caroubier',          cat: 'tree' as const,         qty: '2', unit: 'unit' as const, price: '195.000', suppId: pepiniereCarthage },
    { bot: 'Nerium oleander',          com: 'Laurier-rose blanc', cat: 'shrub' as const,        qty: '18',unit: 'unit' as const, price: '20.000',  suppId: pepiniereElAmal },
    { bot: 'Lavandula angustifolia',   com: 'Lavande',            cat: 'ground_cover' as const, qty: '80',unit: 'unit' as const, price: '6.000',   suppId: pepiniereElAmal },
    { bot: 'Rosmarinus officinalis',   com: 'Romarin',            cat: 'ground_cover' as const, qty: '40',unit: 'unit' as const, price: '5.500',   suppId: pepiniereElAmal },
    { bot: 'Cynodon dactylon',         com: 'Gazon bermuda',      cat: 'grass' as const,        qty: '200',unit: 'm2' as const, price: '4.000',   suppId: pepiniereElAmal },
  ]
  const [p4PlantEx] = await db.select({ id: plantListItems.id }).from(plantListItems)
    .where(eq(plantListItems.projectId, p4Id)).limit(1)
  if (!p4PlantEx) {
    for (const p of p4Plants) {
      await db.insert(plantListItems).values({
        projectId: p4Id, botanicalName: p.bot, commonName: p.com,
        category: p.cat, quantity: p.qty, unit: p.unit,
        unitPriceEstimate: p.price, supplierId: p.suppId ?? null,
        plantSpeciesId: speciesId(p.bot.split(' ')[0]!),
        createdBy: etudesChefId,
      })
    }
    console.log(`  + ${p4Plants.length} plant list items p4`)
  }

  await logActivity({ projectId: p4Id, actorId: etudesChefId, actorName: 'M. Karim Ben Salah', action: 'project.created', newState: { status: 'etudes' }, occurredAt: monthsAgo(3), createdBy: etudesChefId })
    .catch(() => {})

  // ── 7e. Projet ACTIF — En phase Réalisation, Hammamet ────────────────────
  const p5Id = await upsertProject('SOPAT-2025-005', {
    reference: 'SOPAT-2025-005',
    name: 'Parc Résidentiel Les Jasmins — Phase 2',
    clientName: 'Promoteur Immobilier Hammamet Invest',
    clientEmail: 'direction@hammamet-invest.tn',
    clientPhone: '+216 72 280 900',
    siteAddress: 'Zone Touristique Sud, Hammamet 8050',
    siteAreaM2: '2100',
    projectType: 'residential',
    status: 'realisation',
    startDate: monthsAgo(5),
    estimatedDeliveryDate: daysFromNow(45),
    assignedEtudesChefId: etudesChefId,
    assignedRealisationChefId: realisationChefId,
    assignedEntretienChefId: entretienChefId,
    approvedBudget: '198500.000',
    notes: 'Résidence touristique haut de gamme. 180 villas. Espaces communs et 4 cours intérieures. Budget ferme, pénalités de retard contractuelles.',
    createdBy: etudesChefId,
  })

  for (const [phase, status, startedAt, completedAt] of [
    ['etudes',      'completed',  monthsAgo(5), monthsAgo(4)]  as const,
    ['realisation', 'in_progress',monthsAgo(4), null]          as const,
    ['entretien',   'pending',    null,          null]          as const,
  ]) {
    const [ex] = await db.select({ id: projectPhases.id }).from(projectPhases)
      .where(sql`project_id = ${p5Id} AND phase = ${phase}`).limit(1)
    if (!ex) {
      await db.insert(projectPhases).values({
        projectId: p5Id, phase, status, startedAt, completedAt,
        signedOffAt: completedAt, signedOffBy: completedAt ? adminId : null,
        createdBy: etudesChefId,
      })
    }
  }

  // Budget prediction + validation p5
  const [p5BudEx] = await db.select({ id: budgetPredictions.id }).from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, p5Id)).limit(1)
  let p5PredId = p5BudEx?.id
  if (!p5BudEx) {
    const [row] = await db.insert(budgetPredictions).values({
      projectId: p5Id, version: 1,
      predictedTotal: '192000.000',
      confidenceLow: '171000.000', confidenceHigh: '215000.000', confidenceScore: 75,
      breakdownPlants: '78000.000', breakdownSoil: '36000.000',
      breakdownLabor: '58000.000', breakdownEquipment: '14000.000', breakdownLogistics: '6000.000',
      topCostDrivers: ['Gazon et couvre-sols (2100 m²)', 'Main d\'œuvre (32 jours)', 'Palmiers et arbres (×35)'],
      modelVersion: 'v1.2', similarProjectsUsed: 7, isFallback: false, status: 'accepted',
      rawInput: { project_type: 'residential', site_area_m2: 2100, region: 'sousse', season: 'spring' },
      createdBy: etudesChefId,
    }).returning({ id: budgetPredictions.id })
    p5PredId = row!.id
  }

  if (p5PredId) {
    const [vEx] = await db.select({ id: budgetValidations.id }).from(budgetValidations)
      .where(eq(budgetValidations.projectId, p5Id)).limit(1)
    if (!vEx) {
      await db.insert(budgetValidations).values({
        projectId: p5Id, predictionId: p5PredId, chefUserId: realisationChefId,
        status: 'validated', token: `demo-token-p5-${Date.now()}`,
        tokenExpiresAt: monthsAgo(3), validatedAt: monthsAgo(4),
        createdBy: etudesChefId,
      })
    }
  }

  // Partial purchases p5 (~60% spent)
  const [p5POEx] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, p5Id)).limit(1)
  if (!p5POEx) {
    const p5Purchases = [
      { item: 'Phoenix canariensis T70 — 8 unités',  qty: '8',   price: '460.000',  total: '3680.000',  date: monthsAgo(3), inv: 'FAC-EA-2025-031' },
      { item: 'Washingtonia robusta T60 — 12 unités',qty: '12',  price: '490.000',  total: '5880.000',  date: monthsAgo(3), inv: 'FAC-EA-2025-032' },
      { item: 'Ficus benjamina T200 — 15 unités',    qty: '15',  price: '120.000',  total: '1800.000',  date: monthsAgo(3), inv: 'FAC-CV-2025-018' },
      { item: 'Bougainvillea — 60 unités',            qty: '60',  price: '22.000',   total: '1320.000',  date: monthsAgo(2), inv: 'FAC-CV-2025-019' },
      { item: 'Gazon Saint-Augustin — 1400 m²',      qty: '1400',price: '4.200',    total: '5880.000',  date: monthsAgo(2), inv: 'FAC-EA-2025-033' },
      { item: 'Terreau substrat — 150 m³',            qty: '150', price: '80.000',   total: '12000.000', date: monthsAgo(3), inv: 'FAC-AMN-2025-052' },
      { item: 'Irrigation partielle (cours 1 et 2)', qty: '1',   price: '38000.000',total: '38000.000', date: monthsAgo(3), inv: 'FAC-IS-2025-027' },
      { item: 'Main d\'œuvre 18 jours (équipe 5)',    qty: '18',  price: '2500.000', total: '45000.000', date: monthsAgo(2), inv: 'INT-2025-P5-MOE' },
    ]
    for (const po of p5Purchases) {
      await db.insert(purchaseOrders).values({
        projectId: p5Id, itemDescription: po.item,
        quantityPurchased: po.qty, unitPricePaid: po.price, totalCost: po.total,
        supplierId: null, supplierInvoiceNumber: po.inv,
        purchaseDate: po.date, purchasedBy: realisationChefId, status: 'invoiced',
        createdBy: realisationChefId,
      })
    }
    console.log(`  + ${p5Purchases.length} purchase orders p5 (~60% budget)`)
  }

  await logActivity({ projectId: p5Id, actorId: realisationChefId, actorName: 'M. Nabil Mzoughi', action: 'realisation.purchase_created', newState: { item: 'Phoenix canariensis', total: 3680 }, occurredAt: monthsAgo(3), createdBy: realisationChefId })
    .catch(() => {})
  await logActivity({ projectId: p5Id, actorId: realisationChefId, actorName: 'M. Nabil Mzoughi', action: 'realisation.site_photo_uploaded', newState: { milestone: 'mobilisation' }, occurredAt: monthsAgo(4), createdBy: realisationChefId })
    .catch(() => {})

  // ── 8. System settings (company info) ────────────────────────────────────
  console.log('\n── Paramètres système ──')
  const { systemSettings } = await import('./schema')

  const [settingsEx] = await db.select({ id: systemSettings.id }).from(systemSettings)
    .where(eq(systemSettings.key, 'company')).limit(1)
  if (!settingsEx) {
    await db.insert(systemSettings).values({
      key: 'company',
      value: {
        name: 'SOPAT',
        address: 'Avenue Habib Bourguiba, Tunis 1001, Tunisie',
        isoCertificateNumber: 'CERT-ISO-9001-2025-TN-0042',
        isoCertificateExpiry: '2026-09-15',
      },
      updatedBy: adminId,
    })
    await db.insert(systemSettings).values({
      key: 'notifications',
      value: {
        budgetAlert:         ['admin', 'realisation_chef'],
        ncAssigned:          ['admin'],
        phaseTransition:     ['admin', 'etudes_chef', 'realisation_chef', 'entretien_chef'],
        maintenanceReminder: ['entretien_chef', 'entretien_team'],
      },
      updatedBy: adminId,
    })
    console.log('  + company settings + notifications config')
  } else {
    console.log('  skip system settings (exists)')
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════')
  console.log('  Seed terminé avec succès ✓')
  console.log('══════════════════════════════════════════')
  console.log('\nComptes de démonstration (mot de passe : sopat2025!) :')
  console.log('  admin@sopat.tn             Administrateur')
  console.log('  direction@sopat.tn         Direction')
  console.log('  chef.etudes@sopat.tn       Chef d\'études')
  console.log('  chef.realisation@sopat.tn  Chef de réalisation')
  console.log('  chef.entretien@sopat.tn    Chef d\'entretien')
  console.log('')
  process.exit(0)
}

seed().catch((err) => {
  console.error('\n❌ Seed échoué :', err)
  process.exit(1)
})
