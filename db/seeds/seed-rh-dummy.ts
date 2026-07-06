import { db } from '../index'
import { sql } from 'drizzle-orm'
import {
  users, employeeProfiles, jobPositions, leaveRequests, trainingParticipants,
  trainingSessions, recruitmentRequests, performanceEvaluations, integrationPlans,
  attendanceSheets, missionOrders, equipmentReceipts, personnelFileChecklists,
  substitutes, exitAuthorizations,
} from '../schema'

// ─── Real user IDs from the DB ────────────────────────────────────────────────
const ADMIN    = '8490ab62-a88e-4e00-8e17-a307922f9a40' // Administrateur SOPAT
const LEILA    = '2f32b2d7-11b9-46f6-ada6-021d1c88d84a' // Mme Leila Trabelsi (direction)
const KARIM    = 'e4451d4f-3ce7-4608-a125-b581847a0be3' // M. Karim Ben Salah (etudes_chef)
const NABIL    = '8db3b807-ee00-444c-abd4-f185a7599067' // M. Nabil Mzoughi (realisation_chef)
const FATMA    = '496039bb-a8db-4f6e-a224-2659e72d2dfb' // Mme Fatma Boukadida (entretien_chef)

async function main() {
  console.log('Seeding RH dummy data...')

  // ── 1. Create 3 extra RH users ──────────────────────────────────────────────
  const [rania, mondher, sonia] = await Promise.all([
    db.execute(sql`
      INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Mme Rania Gharbi', 'rania.gharbi@sopat.tn', 'rh_agent', 'dummy', now(), now())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `),
    db.execute(sql`
      INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
      VALUES (gen_random_uuid(), 'M. Mondher Zaïed', 'mondher.zaied@sopat.tn', 'etudes_team', 'dummy', now(), now())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `),
    db.execute(sql`
      INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Mme Sonia Maâloul', 'sonia.maaloul@sopat.tn', 'realisation_team', 'dummy', now(), now())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `),
  ])

  const RANIA   = (rania.rows[0] as { id: string }).id
  const MONDHER = (mondher.rows[0] as { id: string }).id
  const SONIA   = (sonia.rows[0] as { id: string }).id

  console.log(`Users: Rania=${RANIA}, Mondher=${MONDHER}, Sonia=${SONIA}`)

  // ── 2. Job Positions ─────────────────────────────────────────────────────────
  const [jp1, jp2, jp3] = await db.insert(jobPositions).values([
    {
      code: 'FP-001',
      title: 'Chef de Projet Paysage',
      department: 'Réalisation',
      hierarchicalSuperior: 'Directeur Technique',
      initialTraining: 'Ingénieur en Paysage ou Horticulture, BAC+5',
      continuousTraining: 'Formation ISO 9001, Gestion de projet, AutoCAD',
      mainMissions: 'Planification et suivi des chantiers paysagers, coordination des équipes terrain, relation client, reporting hebdomadaire.',
      attributions: 'Établir le planning d\'exécution, superviser la qualité des travaux, valider les réceptions de chantier.',
      indispensableCriteria: 'Diplôme ingénieur, 3 ans d\'expérience en aménagement paysager, permis B.',
      desirableCriteria: 'Maîtrise AutoCAD, connaissance des plantes méditerranéennes, anglais technique.',
      workTechniques: [
        { label: 'Lecture de plans', weight: 20 },
        { label: 'Gestion de budget chantier', weight: 25 },
        { label: 'Management d\'équipe', weight: 30 },
        { label: 'Maîtrise AutoCAD / SketchUp', weight: 25 },
      ],
      updatedDate: '2024-03-15',
      createdBy: ADMIN,
    },
    {
      code: 'FP-002',
      title: 'Technicien Horticole',
      department: 'Entretien',
      hierarchicalSuperior: 'Chef d\'Équipe Entretien',
      initialTraining: 'BTS Horticulture ou équivalent',
      continuousTraining: 'Phytosanitaire, Taille ornementale, HSE',
      mainMissions: 'Entretien des espaces verts, taille et tonte, arrosage automatique, phytosanitaire.',
      indispensableCriteria: 'BTS ou Licence Pro Horticulture, permis B.',
      desirableCriteria: 'Certificat phytosanitaire, expérience irrigation.',
      workTechniques: [
        { label: 'Taille et tonte', weight: 30 },
        { label: 'Arrosage automatique', weight: 25 },
        { label: 'Traitement phytosanitaire', weight: 25 },
        { label: 'Reconnaissance des espèces', weight: 20 },
      ],
      updatedDate: '2024-01-10',
      createdBy: ADMIN,
    },
    {
      code: 'FP-003',
      title: 'Responsable Qualité',
      department: 'Qualité',
      hierarchicalSuperior: 'Direction Générale',
      initialTraining: 'Master Qualité, Sécurité, Environnement ou équivalent',
      continuousTraining: 'ISO 9001 Lead Auditor, Outils qualité (8D, AMDEC)',
      mainMissions: 'Pilotage du SMQ, animation des audits internes, traitement des non-conformités, veille réglementaire.',
      indispensableCriteria: 'Diplôme BAC+4/5 en Qualité, 5 ans d\'expérience en SMQ ISO 9001.',
      workTechniques: [
        { label: 'Audit qualité interne', weight: 30 },
        { label: 'Analyse des non-conformités', weight: 30 },
        { label: 'Rédaction procédures', weight: 20 },
        { label: 'Indicateurs qualité (KPI)', weight: 20 },
      ],
      updatedDate: '2024-06-01',
      createdBy: ADMIN,
    },
  ]).returning({ id: jobPositions.id })

  console.log('Job positions created:', jp1.id, jp2.id, jp3.id)

  // ── 3. Employee Profiles ──────────────────────────────────────────────────────
  await db.insert(employeeProfiles).values([
    {
      userId: KARIM,
      matricule: 'EMP-003',
      cin: '08745621',
      matriculeCnss: 'CNSS-14532',
      familySituation: 'marie',
      contractType: 'cdi',
      contractStartDate: '2018-09-01',
      jobPositionId: jp1.id,
      jobTitle: 'Chef de Projet Paysage',
      leaveBalanceDays: '12.5',
      createdBy: ADMIN,
    },
    {
      userId: NABIL,
      matricule: 'EMP-004',
      cin: '09123456',
      matriculeCnss: 'CNSS-19877',
      familySituation: 'celibataire',
      contractType: 'cdi',
      contractStartDate: '2020-03-15',
      jobPositionId: jp2.id,
      jobTitle: 'Technicien Horticole Senior',
      leaveBalanceDays: '8.0',
      createdBy: ADMIN,
    },
    {
      userId: MONDHER,
      matricule: 'EMP-008',
      cin: '12654789',
      matriculeCnss: 'CNSS-22145',
      familySituation: 'marie',
      contractType: 'cdd',
      contractStartDate: '2023-01-10',
      contractEndDate: '2025-01-09',
      jobPositionId: jp1.id,
      jobTitle: 'Dessinateur Projeteur',
      leaveBalanceDays: '4.5',
      createdBy: ADMIN,
    },
    {
      userId: SONIA,
      matricule: 'EMP-012',
      cin: '10987654',
      matriculeCnss: 'CNSS-28901',
      familySituation: 'mariee',
      contractType: 'civp',
      contractStartDate: '2024-04-01',
      contractEndDate: '2025-03-31',
      jobPositionId: jp2.id,
      jobTitle: 'Agente Horticole',
      leaveBalanceDays: '2.0',
      createdBy: ADMIN,
    },
  ]).onConflictDoNothing()

  // ── 4. Leave Requests ────────────────────────────────────────────────────────
  await db.insert(leaveRequests).values([
    {
      userId: KARIM,
      leaveType: 'conge_annuel',
      startDate: '2025-07-14',
      endDate: '2025-07-25',
      durationDays: '10',
      reason: 'Congé estival annuel',
      status: 'approuve',
      supervisorApproval: 'approuve',
      rhApproval: 'approuve',
      createdBy: KARIM,
    },
    {
      userId: NABIL,
      leaveType: 'conge_maladie',
      startDate: '2025-06-10',
      endDate: '2025-06-12',
      durationDays: '3',
      reason: 'Grippe avec fièvre, certificat médical joint.',
      status: 'approuve',
      supervisorApproval: 'approuve',
      rhApproval: 'approuve',
      createdBy: NABIL,
    },
    {
      userId: MONDHER,
      leaveType: 'conge_annuel',
      startDate: '2025-08-04',
      endDate: '2025-08-08',
      durationDays: '5',
      reason: 'Vacances familiales.',
      status: 'en_attente',
      supervisorApproval: 'en_attente',
      rhApproval: 'en_attente',
      createdBy: MONDHER,
    },
    {
      userId: SONIA,
      leaveType: 'conge_annuel',
      startDate: '2025-09-15',
      endDate: '2025-09-17',
      durationDays: '3',
      status: 'en_attente',
      supervisorApproval: 'en_attente',
      rhApproval: 'en_attente',
      createdBy: SONIA,
    },
    {
      userId: FATMA,
      leaveType: 'conge_maternite',
      startDate: '2025-05-01',
      endDate: '2025-06-29',
      durationDays: '60',
      reason: 'Congé maternité légal.',
      status: 'approuve',
      supervisorApproval: 'approuve',
      rhApproval: 'approuve',
      directionApproval: 'approuve',
      createdBy: FATMA,
    },
  ]).onConflictDoNothing()

  // ── 5. Training Sessions ──────────────────────────────────────────────────────
  const [tr1, tr2, tr3] = await db.insert(trainingSessions).values([
    {
      theme: 'ISO 9001:2015 — Sensibilisation et audit interne',
      thematic: 'QMS',
      trainingOrg: 'Bureau Veritas Tunisie',
      location: 'Hôtel Africa, Tunis',
      plannedStartDate: '2025-03-10',
      plannedEndDate: '2025-03-11',
      actualStartDate: '2025-03-10',
      actualEndDate: '2025-03-11',
      year: 2025,
      status: 'realise',
      objective: 'Comprendre les exigences de la norme ISO 9001:2015 et former les auditeurs internes de l\'entreprise.',
      createdBy: ADMIN,
    },
    {
      theme: 'Techniques de taille ornementale avancées',
      thematic: 'Métiers',
      trainingOrg: 'IRESA — Institut des Régions Arides',
      location: 'SOPAT — Siège Monastir',
      plannedStartDate: '2025-05-20',
      plannedEndDate: '2025-05-20',
      actualStartDate: '2025-05-20',
      actualEndDate: '2025-05-20',
      year: 2025,
      status: 'realise',
      objective: 'Maîtriser les techniques de taille des arbres d\'ornement et des haies complexes.',
      createdBy: ADMIN,
    },
    {
      theme: 'Phytosanitaire — Homologation et sécurité',
      thematic: 'HSE',
      trainingOrg: 'DGPA — Direction Générale de la Protection et de l\'Agriculture',
      location: 'En ligne',
      plannedStartDate: '2025-10-08',
      plannedEndDate: '2025-10-09',
      year: 2025,
      status: 'planifie',
      objective: 'Obtenir les habilitations légales pour l\'utilisation des produits phytosanitaires en milieu urbain.',
      createdBy: ADMIN,
    },
  ]).returning({ id: trainingSessions.id })

  await db.insert(trainingParticipants).values([
    { trainingSessionId: tr1.id, userId: KARIM,   attended: true,  hotEvalScore: '4.2', coldEvalScore: '3.8', createdBy: ADMIN },
    { trainingSessionId: tr1.id, userId: NABIL,   attended: true,  hotEvalScore: '3.9', createdBy: ADMIN },
    { trainingSessionId: tr1.id, userId: FATMA,   attended: true,  hotEvalScore: '4.5', coldEvalScore: '4.1', createdBy: ADMIN },
    { trainingSessionId: tr2.id, userId: NABIL,   attended: true,  hotEvalScore: '4.0', createdBy: ADMIN },
    { trainingSessionId: tr2.id, userId: SONIA,   attended: true,  hotEvalScore: '3.7', createdBy: ADMIN },
    { trainingSessionId: tr2.id, userId: MONDHER, attended: false, createdBy: ADMIN },
    { trainingSessionId: tr3.id, userId: NABIL,   attended: false, createdBy: ADMIN },
    { trainingSessionId: tr3.id, userId: SONIA,   attended: false, createdBy: ADMIN },
  ]).onConflictDoNothing()

  // ── 6. Recruitment Requests ───────────────────────────────────────────────────
  await db.insert(recruitmentRequests).values([
    {
      postTitle: 'Chef de Projet Paysage Confirmé',
      requestingDept: 'Réalisation',
      reason: 'Croissance du portefeuille projets de +40% en 2024. Besoin d\'un 2ème chef de projet pour gérer les nouvelles commandes.',
      requiredSkills: 'Ingénieur en paysage, 5+ ans d\'expérience, permis B obligatoire.',
      proposedStatus: 'CDI',
      studyLevel: 'Ingénieur / BAC+5',
      studySpecialty: 'Paysage, Horticulture',
      experienceDuration: '5 ans minimum',
      status: 'en_cours',
      openedDate: '2025-05-01',
      createdBy: ADMIN,
    },
    {
      postTitle: 'Agente de Bureau / Secrétaire',
      requestingDept: 'Administration',
      reason: 'Remplacement d\'un départ à la retraite prévu en août 2025.',
      requiredSkills: 'BTS Secrétariat, maîtrise Pack Office, bonnes capacités rédactionnelles en français et arabe.',
      proposedStatus: 'CDI',
      studyLevel: 'BTS / BAC+2',
      studySpecialty: 'Secrétariat, Gestion',
      status: 'ouvert',
      openedDate: '2025-06-15',
      createdBy: LEILA,
    },
    {
      postTitle: 'Stagiaire Paysagiste',
      requestingDept: 'Étude',
      reason: 'Accueil d\'un stagiaire de fin d\'études pour renforcer l\'équipe étude sur la saison estivale.',
      requiredSkills: 'Étudiant en master paysage ou architecture, maîtrise AutoCAD / SketchUp.',
      proposedStatus: 'Stage',
      studyLevel: 'Master / BAC+5',
      studySpecialty: 'Paysage, Architecture',
      status: 'pourvu',
      openedDate: '2025-03-01',
      closedDate: '2025-05-15',
      createdBy: KARIM,
    },
  ]).onConflictDoNothing()

  // ── 7. Performance Evaluations ────────────────────────────────────────────────
  await db.insert(performanceEvaluations).values([
    {
      userId: KARIM,
      evaluatorId: LEILA,
      evaluationDate: '2025-01-15',
      currentPosition: 'Chef de Projet Paysage',
      seniorityCompany: '6 ans',
      seniorityPosition: '4 ans',
      workTechniquesCriteria: [
        { label: 'Lecture de plans', score: 4, desired: 4 },
        { label: 'Gestion de budget chantier', score: 3, desired: 4 },
        { label: 'Management d\'équipe', score: 4, desired: 4 },
        { label: 'Maîtrise AutoCAD', score: 3, desired: 3 },
      ],
      workTechniquesScore: '3.50',
      attendanceScore: '4.00',
      rigorScore: '3.75',
      disciplineScore: '3.88',
      improvementScore: '3.50',
      smqRespectScore: '4.00',
      riskAnalysisScore: '3.25',
      qualityScore: '3.58',
      communicationScore: '4.00',
      teamworkScore: '3.75',
      managementScore: '3.50',
      learningScore: '3.25',
      integrationScore: '3.63',
      globalScore: '3.65',
      globalScorePct: '91.25',
      nextObjectives: 'Améliorer la gestion budgétaire des projets complexes. Obtenir la certification lead auditor ISO 9001.',
      remarks: 'Excellent collaborateur, très impliqué. Potentiel d\'évolution vers un poste de directeur de projets.',
      createdBy: LEILA,
    },
    {
      userId: NABIL,
      evaluatorId: FATMA,
      evaluationDate: '2025-01-20',
      currentPosition: 'Technicien Horticole Senior',
      seniorityCompany: '5 ans',
      seniorityPosition: '5 ans',
      workTechniquesCriteria: [
        { label: 'Taille et tonte', score: 4, desired: 4 },
        { label: 'Arrosage automatique', score: 3, desired: 4 },
        { label: 'Traitement phytosanitaire', score: 3, desired: 4 },
        { label: 'Reconnaissance des espèces', score: 4, desired: 4 },
      ],
      workTechniquesScore: '3.50',
      attendanceScore: '3.00',
      rigorScore: '3.50',
      disciplineScore: '3.25',
      improvementScore: '3.00',
      smqRespectScore: '3.25',
      riskAnalysisScore: '3.00',
      qualityScore: '3.08',
      communicationScore: '3.25',
      teamworkScore: '3.50',
      managementScore: '3.00',
      learningScore: '3.25',
      integrationScore: '3.25',
      globalScore: '3.27',
      globalScorePct: '81.75',
      nextObjectives: 'Suivre la formation phytosanitaire prévue en octobre. Améliorer l\'assiduité.',
      createdBy: FATMA,
    },
  ]).onConflictDoNothing()

  // ── 8. Integration Plans ──────────────────────────────────────────────────────
  await db.insert(integrationPlans).values([
    {
      userId: MONDHER,
      pilotId: KARIM,
      plannedStartDate: '2023-01-10',
      plannedEndDate: '2023-02-10',
      items: [
        { theme: 'Accueil et présentation de l\'entreprise', responsible: 'RH', plannedDate: '2023-01-10', actualDate: '2023-01-10', status: 'done', comment: 'Réalisé le premier jour' },
        { theme: 'Présentation du SMQ et des procédures qualité', responsible: 'Responsable Qualité', plannedDate: '2023-01-12', actualDate: '2023-01-12', status: 'done', comment: '' },
        { theme: 'Présentation du poste et des missions', responsible: 'Karim Ben Salah', plannedDate: '2023-01-10', actualDate: '2023-01-10', status: 'done', comment: '' },
        { theme: 'Formation AutoCAD — modules avancés', responsible: 'Karim Ben Salah', plannedDate: '2023-01-16', actualDate: '2023-01-18', status: 'done', comment: 'Décalé de 2 jours' },
        { theme: 'Visite des chantiers en cours', responsible: 'Karim Ben Salah', plannedDate: '2023-01-20', actualDate: '2023-01-20', status: 'done', comment: '' },
        { theme: 'Évaluation de fin d\'intégration', responsible: 'RH + Supérieur', plannedDate: '2023-02-10', actualDate: '2023-02-10', status: 'done', comment: 'Résultat : Satisfaisant' },
      ],
      notes: 'Intégration réussie. Mondher s\'est bien adapté à l\'équipe et aux outils.',
      createdBy: ADMIN,
    },
    {
      userId: SONIA,
      pilotId: FATMA,
      plannedStartDate: '2024-04-01',
      plannedEndDate: '2024-05-01',
      items: [
        { theme: 'Accueil et visite des sites', responsible: 'RH', plannedDate: '2024-04-01', actualDate: '2024-04-01', status: 'done', comment: '' },
        { theme: 'Présentation des procédures d\'entretien', responsible: 'Fatma Boukadida', plannedDate: '2024-04-03', actualDate: '2024-04-03', status: 'done', comment: '' },
        { theme: 'Formation taille et tonte', responsible: 'Chef équipe terrain', plannedDate: '2024-04-08', actualDate: '2024-04-10', status: 'done', comment: 'Reporté de 2 jours' },
        { theme: 'Formation phytosanitaire (initiation)', responsible: 'Technicien HSE', plannedDate: '2024-04-15', status: 'in_progress', comment: '' },
        { theme: 'Évaluation de fin d\'intégration', responsible: 'RH + Supérieur', plannedDate: '2024-05-01', status: 'pending', comment: '' },
      ],
      createdBy: ADMIN,
    },
  ]).onConflictDoNothing()

  // ── 9. Attendance Sheets (FOR-RH-13) ─────────────────────────────────────────
  await db.insert(attendanceSheets).values([
    {
      userId: KARIM,
      month: 6,
      year: 2025,
      daysWorked: 21,
      salaryAdvance: '500.000',
      supervisorId: LEILA,
      notes: 'Déplacement chantier Sfax le 12/06.',
      entries: Array.from({ length: 21 }, (_, i) => ({
        day: i + 1,
        entryTime: '07:55',
        lunchOut: '12:00',
        lunchIn: '13:00',
        exitTime: i === 11 ? '20:00' : '17:05',
        notes: i === 11 ? 'Déplacement Sfax' : '',
      })),
      createdBy: ADMIN,
    },
    {
      userId: NABIL,
      month: 6,
      year: 2025,
      daysWorked: 19,
      supervisorId: FATMA,
      notes: '3 jours maladie (10-12 juin).',
      entries: [
        ...Array.from({ length: 9 }, (_, i) => ({
          day: i + 1,
          entryTime: '08:00',
          lunchOut: '12:00',
          lunchIn: '13:00',
          exitTime: '17:00',
          notes: '',
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          day: i + 13,
          entryTime: '08:00',
          lunchOut: '12:00',
          lunchIn: '13:00',
          exitTime: '17:00',
          notes: '',
        })),
      ],
      createdBy: ADMIN,
    },
    {
      userId: MONDHER,
      month: 6,
      year: 2025,
      daysWorked: 20,
      supervisorId: KARIM,
      entries: Array.from({ length: 20 }, (_, i) => ({
        day: i + 1,
        entryTime: '08:00',
        lunchOut: '12:00',
        lunchIn: '13:00',
        exitTime: '17:00',
        notes: '',
      })),
      createdBy: ADMIN,
    },
  ]).onConflictDoNothing()

  // ── 10. Mission Orders (FOR-RH-41) ────────────────────────────────────────────
  await db.insert(missionOrders).values([
    {
      userId: KARIM,
      cinNumber: '08745621',
      cinIssuedAt: 'Monastir',
      destination: 'Sfax — Chantier Résidence Les Oliviers',
      missionPurpose: 'Suivi de chantier phase réalisation, réception intermédiaire des travaux de plantation et d\'arrosage automatique.',
      startDate: '2025-06-12',
      endDate: '2025-06-13',
      status: 'approved',
      gmApprovedAt: new Date('2025-06-10T10:30:00'),
      gmApprovedBy: LEILA,
      rhApprovedAt: new Date('2025-06-10T14:00:00'),
      rhApprovedBy: ADMIN,
      createdBy: KARIM,
    },
    {
      userId: NABIL,
      cinNumber: '09123456',
      cinIssuedAt: 'Sousse',
      destination: 'Hammamet — Hôtel Palmier Resort',
      missionPurpose: 'Intervention phytosanitaire d\'urgence suite à infestation cochenilles sur palmiers. Traitement et rapport d\'intervention.',
      startDate: '2025-07-03',
      endDate: '2025-07-03',
      status: 'pending',
      createdBy: NABIL,
    },
    {
      userId: MONDHER,
      cinNumber: '12654789',
      cinIssuedAt: 'Tunis',
      destination: 'Tunis — Client Ministère de l\'Équipement',
      missionPurpose: 'Présentation du dossier d\'étude paysagère pour le projet d\'aménagement du Boulevard Environnemental de la Marsa.',
      startDate: '2025-07-15',
      endDate: '2025-07-15',
      status: 'draft',
      createdBy: MONDHER,
    },
  ]).onConflictDoNothing()

  // ── 11. Equipment Receipts (FOR-RH-28) ────────────────────────────────────────
  await db.insert(equipmentReceipts).values([
    {
      userId: KARIM,
      issuedDate: '2018-09-01',
      deliveredBy: ADMIN,
      items: [
        { description: 'Ordinateur portable Dell Latitude 5540', quantity: 1, serialNumber: 'DL-5540-2018-09' },
        { description: 'Souris sans fil Logitech MX Master', quantity: 1, serialNumber: '' },
        { description: 'Badge d\'accès SOPAT', quantity: 1, serialNumber: 'BADGE-003' },
        { description: 'Tenue de travail (2 ensembles)', quantity: 2, serialNumber: '' },
        { description: 'EPI terrain : casque, gants, chaussures sécurité', quantity: 1, serialNumber: '' },
      ],
      createdBy: ADMIN,
    },
    {
      userId: NABIL,
      issuedDate: '2020-03-15',
      deliveredBy: ADMIN,
      items: [
        { description: 'Tronçonneuse STIHL MS 261', quantity: 1, serialNumber: 'STIHL-261-2020-004' },
        { description: 'Taille-haie électrique Husqvarna 520iHD60', quantity: 1, serialNumber: 'HUS-520-2020-011' },
        { description: 'EPI complet : casque forestier, gants anti-coupures, jambières', quantity: 1, serialNumber: '' },
        { description: 'Badge d\'accès SOPAT', quantity: 1, serialNumber: 'BADGE-004' },
        { description: 'Tenue de travail (3 ensembles)', quantity: 3, serialNumber: '' },
      ],
      createdBy: ADMIN,
    },
    {
      userId: SONIA,
      issuedDate: '2024-04-01',
      deliveredBy: FATMA,
      items: [
        { description: 'Tenue de travail (2 ensembles)', quantity: 2, serialNumber: '' },
        { description: 'Gants de travail', quantity: 2, serialNumber: '' },
        { description: 'Badge d\'accès SOPAT', quantity: 1, serialNumber: 'BADGE-012' },
      ],
      returnedDate: '2025-03-31',
      returnedNotes: 'Matériel rendu en bon état à la fin du contrat CIVP.',
      createdBy: FATMA,
    },
  ]).onConflictDoNothing()

  // ── 12. Personnel File Checklists (FOR-RH-34) ─────────────────────────────────
  await db.insert(personnelFileChecklists).values([
    {
      userId: KARIM,
      hasCin: true, hasBirthCertificate: true, hasPhotos: true, hasInfoSheet: true,
      hasBulletin3: true, hasCnss: true, hasRib: true, hasMedicalCert: false,
      hasDiplomas: true, hasPrevPayslip: true, hasDriversLicense: true, hasPrevEmploymentCert: true,
      supervisorId: LEILA,
      rhSignedAt: new Date('2018-09-01'),
      supervisorSignedAt: new Date('2018-09-01'),
      employeeSignedAt: new Date('2018-09-01'),
      createdBy: ADMIN,
    },
    {
      userId: NABIL,
      hasCin: true, hasBirthCertificate: true, hasPhotos: true, hasInfoSheet: true,
      hasBulletin3: false, hasCnss: true, hasRib: true, hasMedicalCert: false,
      hasDiplomas: true, hasPrevPayslip: false, hasDriversLicense: true, hasPrevEmploymentCert: false,
      supervisorId: FATMA,
      rhSignedAt: new Date('2020-03-15'),
      supervisorSignedAt: new Date('2020-03-15'),
      employeeSignedAt: new Date('2020-03-16'),
      createdBy: ADMIN,
    },
    {
      userId: SONIA,
      hasCin: true, hasBirthCertificate: true, hasPhotos: true, hasInfoSheet: true,
      hasBulletin3: false, hasCnss: true, hasRib: true, hasMedicalCert: false,
      hasDiplomas: true, hasPrevPayslip: false, hasDriversLicense: false, hasPrevEmploymentCert: false,
      supervisorId: FATMA,
      rhSignedAt: new Date('2024-04-01'),
      supervisorSignedAt: new Date('2024-04-01'),
      employeeSignedAt: new Date('2024-04-01'),
      createdBy: FATMA,
    },
  ]).onConflictDoNothing()

  // ── 13. Substitutes (LIS-RH-01) ──────────────────────────────────────────────
  await db.insert(substitutes).values([
    {
      positionLabel: 'Chef de Projet Paysage',
      holderUserId: KARIM,
      substituteUserId: MONDHER,
      updatedDate: '2025-01-01',
      isActive: true,
      createdBy: ADMIN,
    },
    {
      positionLabel: 'Chef d\'Équipe Entretien',
      holderUserId: FATMA,
      substituteUserId: NABIL,
      updatedDate: '2025-01-01',
      isActive: true,
      createdBy: ADMIN,
    },
    {
      positionLabel: 'Responsable Administration',
      holderUserId: LEILA,
      substituteUserId: RANIA,
      updatedDate: '2025-03-15',
      isActive: true,
      createdBy: ADMIN,
    },
  ]).onConflictDoNothing()

  // ── 14. Exit Authorizations (FOR-RH-15) ───────────────────────────────────────
  await db.insert(exitAuthorizations).values([
    {
      userId: MONDHER,
      startTime: new Date('2025-06-18T10:00:00'),
      endTime: new Date('2025-06-18T12:00:00'),
      durationHours: '2.0',
      reason: 'Rendez-vous médecin spécialiste (ophtalmologue).',
      status: 'approuve',
      supervisorApproval: 'approuve',
      supervisorApprovedBy: KARIM,
      rhApproval: 'approuve',
      rhApprovedBy: ADMIN,
      createdBy: MONDHER,
    },
    {
      userId: SONIA,
      startTime: new Date('2025-07-02T14:00:00'),
      endTime: new Date('2025-07-02T15:30:00'),
      durationHours: '1.5',
      reason: 'Démarche administrative — Renouvellement CIN.',
      status: 'en_attente',
      supervisorApproval: 'en_attente',
      rhApproval: 'en_attente',
      createdBy: SONIA,
    },
    {
      userId: NABIL,
      startTime: new Date('2025-06-25T09:00:00'),
      endTime: new Date('2025-06-25T11:00:00'),
      durationHours: '2.0',
      reason: 'Accompagnement à l\'hôpital — enfant malade.',
      status: 'approuve',
      supervisorApproval: 'approuve',
      supervisorApprovedBy: FATMA,
      rhApproval: 'approuve',
      rhApprovedBy: ADMIN,
      createdBy: NABIL,
    },
  ]).onConflictDoNothing()

  console.log('✅ RH dummy data seeded successfully!')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
