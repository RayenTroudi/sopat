import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  real,
  decimal,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'direction',
  'etudes_chef',
  'etudes_team',
  'realisation_chef',
  'realisation_team',
  'entretien_chef',
  'entretien_team',
  'rh_manager',
  'rh_agent',
])

export const projectTypeEnum = pgEnum('project_type', [
  'ingenierie_territoriale',
  'espace_public',
  'siege_social',
  'hotelier_touristique',
  'residentiel',
  'interieur',
])

export const currencyEnum = pgEnum('currency', [
  'TND', 'EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD',
])

export const clientSectorEnum = pgEnum('client_sector', [
  'banque',
  'hotellerie',
  'automobile',
  'institutionnel_public',
  'institutionnel_prive',
  'residentiel_prive',
  'diplomatique',
  'autre',
])

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'etudes',
  'realisation',
  'entretien',
  'completed',
  'cancelled',
])

export const phaseEnum = pgEnum('phase', ['etudes', 'realisation', 'entretien'])

export const phaseStatusEnum = pgEnum('phase_status', [
  'pending',
  'in_progress',
  'awaiting_signoff',
  'completed',
])

export const zoneTypeEnum = pgEnum('zone_type', [
  'entree',
  'piscine',
  'rooftop',
  'restaurant',
  'aquapark',
  'acces_plage',
  'etage',
  'cour_interieure',
  'parking',
  'jardin_chef',
  'autre',
])

export const zoneStatusEnum = pgEnum('zone_status', [
  'etude',
  'realisation',
  'entretien',
  'termine',
])

export const plantCategoryEnum = pgEnum('plant_category', [
  'tree',
  'shrub',
  'ground_cover',
  'climber',
  'palm',
  'grass',
  'aquatic',
  'other',
])

export const plantUnitEnum = pgEnum('plant_unit', [
  'unit',
  'm2',
  'm3',
  'kg',
  'liter',
  'ml',
])

export const predictionStatusEnum = pgEnum('prediction_status', [
  'pending',
  'accepted',
  'overridden',
])

export const validationStatusEnum = pgEnum('validation_status', [
  'pending',
  'validated',
  'modified',
  'expired',
])

export const purchaseStatusEnum = pgEnum('purchase_status', [
  'pending',
  'ordered',
  'received',
  'invoiced',
])

export const assetTypeEnum = pgEnum('asset_type', [
  'render_3d',
  'plan_autocad',
  'specification',
  'site_photo',
  'invoice',
  'reception_document',
  'contract',
  'rse_convention',
  'rse_communication',
  'other',
  'portfolio_pdf',
])

export const ncStatusEnum = pgEnum('nc_status', [
  'open',
  'in_progress',
  'closed',
  'verified',
])

export const ncTypeEnum = pgEnum('nc_type', [
  'technique',
  'documentaire',
  'reclamation_client',
  'audit',
  'systeme',
])

export const ncOwnerTypeEnum = pgEnum('nc_owner_type', [
  'interne',
  'externe',
])

export const ncSourceEnum = pgEnum('nc_source', [
  'interne',
  'audit',
  'reclamation_client',
  'reclamation_pi',
])

export const ncDeptEnum = pgEnum('nc_dept', [
  'AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH',
])

export const capaStatusEnum = pgEnum('capa_status', [
  'open',
  'in_progress',
  'closed',
])

export const auditStatusEnum = pgEnum('audit_status', [
  'scheduled',
  'in_progress',
  'completed',
])

export const auditProgramStatusEnum = pgEnum('audit_program_status', [
  'planifie',
  'en_cours',
  'realise',
  'reporte',
  'annule',
])

export const documentStatusEnum = pgEnum('document_status', [
  'draft',
  'active',
  'obsolete',
])

export const documentCategoryEnum = pgEnum('document_category', [
  'procedure',
  'instruction',
  'formulaire',
  'enregistrement',
  'autre',
])

export const emailStatusEnum = pgEnum('email_status', [
  'pending',
  'sent',
  'opened',
  'validated',
  'expired',
  'failed',
])

export const visitFrequencyTypeEnum = pgEnum('visit_frequency_type', [
  'journaliere',
  'hebdomadaire',
  'quinzaine',
])

export const visitTypeEnum = pgEnum('visit_type', [
  'taille',
  'arrosage',
  'traitement_phytosanitaire',
  'fertilisation',
  'controle_general',
  'other',
])

export const healthStatusEnum = pgEnum('health_status', [
  'healthy',
  'attention',
  'critical',
])

export const supplierCategoryEnum = pgEnum('supplier_category', [
  // Legacy generic categories
  'pepiniere',
  'materiaux',
  'equipements',
  'produits_phytosanitaires',
  'logistique',
  'location_engins',
  'autre',
  // FOR-AC-11 sheet categories (real categories from SOPAT supplier register)
  'plantes',
  'terre_vegetale',
  'gazon',
  'matiere_decorative',
  'bac_fleurs',
  'parc_auto',
  'equipements_bureautique',
  'services',
  'sous_traitants',
])

export const supplierStatusEnum = pgEnum('supplier_status', [
  'approuve',
  'en_evaluation',
  'suspendu',
])

export const nurseryHealthEnum = pgEnum('nursery_health', [
  'healthy',
  'attention',
  'critical',
  'dead',
])

export const nurseryMovementTypeEnum = pgEnum('nursery_movement_type', [
  'reception',          // stock received from outside
  'internal_use',       // consumed on a project (réalisation)
  'reservation',        // reserved for a project (études)
  'reservation_cancel', // reservation cancelled
  'loss',               // damaged / dead stock
  'transfer',           // moved between locations
  'adjustment',         // manual correction
])

export const nurserySourceEnum = pgEnum('nursery_source', [
  'fournisseur_externe',
  'pepiniere_sopat',
])

export const interactionTypeEnum = pgEnum('interaction_type', [
  'appel', 'email', 'reunion', 'visite_site', 'autre',
])

export const residentialSubtypeEnum = pgEnum('residential_subtype', [
  'villa_privee',
  'residence_collective',
  'appartement',
])

// ─── SMQ Enums ────────────────────────────────────────────────────────────────

export const roTypeEnum = pgEnum('ro_type', ['risk', 'opportunity'])

export const roCategoryEnum = pgEnum('ro_category', [
  'contexte_interne',
  'contexte_externe',
  'partie_interessee',
  'processus',
  'environnement',
  'autre',
])

export const roStatusEnum = pgEnum('ro_status', [
  'identified',
  'treated',
  'monitored',
  'closed',
])

export const stakeholderTypeEnum = pgEnum('stakeholder_type', [
  'client',
  'fournisseur',
  'partenaire',
  'employe',
  'actionnaire',
  'autorite_reglementaire',
  'communaute',
  'autre',
])

export const feedbackChannelEnum = pgEnum('feedback_channel', [
  'enquete_satisfaction',
  'reunion',
  'email',
  'reclamation',
  'audit',
  'autre',
])

export const regulatoryStatusEnum = pgEnum('regulatory_status', [
  'applicable',
  'non_applicable',
  'en_veille',
])

export const wasteTypeEnum = pgEnum('waste_type', [
  'papier_carton',
  'plastique',
  'verre',
  'metal',
  'dechets_verts',
  'dechets_chimiques',
  'electronique',
  'autre',
])

export const wasteDisposalEnum = pgEnum('waste_disposal', [
  'tri_selectif',
  'collecte_municipale',
  'prestataire_agree',
  'incineration',
  'autre',
])

export const hseSubmissionStatusEnum = pgEnum('hse_submission_status', [
  'conforme',
  'non_conforme',
  'partiel',
])

export const planActivityStatusEnum = pgEnum('plan_activity_status', [
  'planifie',
  'realise_dans_delai',
  'realise_avec_retard',
  'non_realise',
  'cloture',
])

export const communicationDirectionEnum = pgEnum('communication_direction', [
  'interne',
  'externe',
])

// ─── Shared column helpers ─────────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('etudes_team'),
  phone: varchar('phone', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  isInternalAuditor: boolean('is_internal_auditor').notNull().default(false),
  auditorDomain: text('auditor_domain'),
  auditorQualifiedDate: date('auditor_qualified_date'),
  auditorQualificationProof: varchar('auditor_qualification_proof', { length: 500 }),
  ...timestamps,
  deletedAt: timestamp('deleted_at'),
  createdBy: uuid('created_by'),
}, (t) => [
  index('users_role_idx').on(t.role),
  index('users_email_idx').on(t.email),
])

// ─── Clients (CRM) ───────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  companyName:          varchar('company_name', { length: 255 }).notNull(),
  displayName:          varchar('display_name', { length: 255 }).notNull(),
  clientType:           varchar('client_type', { length: 50 }).notNull(),
  country:              varchar('country', { length: 2 }).notNull().default('TN'),
  city:                 varchar('city', { length: 100 }),
  address:              text('address'),
  primaryContactName:   varchar('primary_contact_name', { length: 255 }),
  primaryContactTitle:  varchar('primary_contact_title', { length: 255 }),
  primaryContactEmail:  varchar('primary_contact_email', { length: 255 }),
  primaryContactPhone:  varchar('primary_contact_phone', { length: 50 }),
  secondaryContactName:  varchar('secondary_contact_name', { length: 255 }),
  secondaryContactEmail: varchar('secondary_contact_email', { length: 255 }),
  logoCloudinaryId:     uuid('logo_cloudinary_id'),
  isFeatured:           boolean('is_featured').notNull().default(false),
  notes:                text('notes'),
  sectorFreeText:       text('sector_free_text'),
  clientPotential:      text('client_potential'),
  dmsDocumentCode:      varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  deletedAt:            timestamp('deleted_at'),
  createdBy:            uuid('created_by').notNull(),
}, (t) => [
  index('clients_client_type_idx').on(t.clientType),
  index('clients_country_idx').on(t.country),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  siteAddress: text('site_address').notNull(),
  siteAreaM2: decimal('site_area_m2', { precision: 10, scale: 2 }),
  projectType: projectTypeEnum('project_type').notNull(),
  status: projectStatusEnum('status').notNull().default('draft'),
  startDate: timestamp('start_date'),
  estimatedDeliveryDate: timestamp('estimated_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  assignedEtudesChefId: uuid('assigned_etudes_chef_id'),
  assignedRealisationChefId: uuid('assigned_realisation_chef_id'),
  assignedEntretienChefId: uuid('assigned_entretien_chef_id'),
  approvedBudget: decimal('approved_budget', { precision: 12, scale: 3 }),
  notes: text('notes'),
  coordinateurTerrain: varchar('coordinateur_terrain', { length: 255 }),
  // ── Extended project type fields ──
  country: varchar('country', { length: 2 }).notNull().default('TN'),
  currency: currencyEnum('currency').notNull().default('TND'),
  clientSector: clientSectorEnum('client_sector'),
  clientAnonymized: boolean('client_anonymized').notNull().default(false),
  conceptTitle: varchar('concept_title', { length: 255 }),
  conceptDescription: text('concept_description'),
  designVocabulary: text('design_vocabulary').array(),
  plantPalettePhilosophy: text('plant_palette_philosophy').array(),
  linearMeters: decimal('linear_meters', { precision: 10, scale: 2 }),
  floorCount: integer('floor_count'),
  municipalityClient: varchar('municipality_client', { length: 255 }),
  territorySurfaceKm2: decimal('territory_surface_km2', { precision: 12, scale: 4 }),
  numberOfMunicipalities: integer('number_of_municipalities'),
  lightingIncluded: boolean('lighting_included').notNull().default(false),
  residentialSubtype: residentialSubtypeEnum('residential_subtype'),
  actualRevenue: decimal('actual_revenue', { precision: 14, scale: 3 }),
  clientId: uuid('client_id'),
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  deletedAt: timestamp('deleted_at'),
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('projects_status_idx').on(t.status),
  index('projects_created_by_idx').on(t.createdBy),
  index('projects_etudes_chef_idx').on(t.assignedEtudesChefId),
  index('projects_realisation_chef_idx').on(t.assignedRealisationChefId),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.assignedEtudesChefId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.assignedRealisationChefId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.assignedEntretienChefId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.clientId], foreignColumns: [clients.id] }),
])

// ─── Project Zones ────────────────────────────────────────────────────────────

export const projectZones = pgTable('project_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  zoneName: varchar('zone_name', { length: 255 }).notNull(),
  zoneType: zoneTypeEnum('zone_type').notNull().default('autre'),
  floorNumber: integer('floor_number'),
  surfaceM2: decimal('surface_m2', { precision: 10, scale: 2 }),
  plantPaletteNotes: text('plant_palette_notes'),
  lightingNotes: text('lighting_notes'),
  status: zoneStatusEnum('status').notNull().default('etude'),
  cloudinaryPlanId: uuid('cloudinary_plan_id'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('project_zones_project_id_idx').on(t.projectId),
  index('project_zones_status_idx').on(t.status),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Exchange Rates ───────────────────────────────────────────────────────────

export const exchangeRates = pgTable('exchange_rates', {
  id:            uuid('id').primaryKey().defaultRandom(),
  fromCurrency:  currencyEnum('from_currency').notNull(),
  toCurrency:    currencyEnum('to_currency').notNull().default('TND'),
  rate:          decimal('rate', { precision: 18, scale: 6 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source:        varchar('source', { length: 255 }),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('exchange_rates_currency_date_uidx').on(t.fromCurrency, t.toCurrency, t.effectiveDate),
])

// ─── Client Interactions (CRM) ───────────────────────────────────────────────

export const clientInteractions = pgTable('client_interactions', {
  id:              uuid('id').primaryKey().defaultRandom(),
  clientId:        uuid('client_id').notNull(),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  date:            date('date').notNull(),
  summary:         text('summary').notNull(),
  outcome:         text('outcome'),
  nextAction:      text('next_action'),
  nextActionDate:  date('next_action_date'),
  loggedBy:        uuid('logged_by').notNull(),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('client_interactions_client_id_idx').on(t.clientId),
  foreignKey({ columns: [t.clientId], foreignColumns: [clients.id] }),
  foreignKey({ columns: [t.loggedBy], foreignColumns: [users.id] }),
])

// ─── Project Phases ───────────────────────────────────────────────────────────

export const projectPhases = pgTable('project_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  phase: phaseEnum('phase').notNull(),
  status: phaseStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  signedOffAt: timestamp('signed_off_at'),
  signedOffBy: uuid('signed_off_by'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('project_phases_project_id_idx').on(t.projectId),
  index('project_phases_status_idx').on(t.status),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.signedOffBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Plant Species (reference table) ─────────────────────────────────────────

export const plantSpecies = pgTable('plant_species', {
  id: uuid('id').primaryKey().defaultRandom(),
  botanicalName: varchar('botanical_name', { length: 255 }).notNull().unique(),
  commonNameFr: varchar('common_name_fr', { length: 255 }),
  category: plantCategoryEnum('category').notNull(),
  defaultUnit: plantUnitEnum('default_unit').notNull().default('unit'),
  // LIS-ET-03 extended fields
  lisCode: varchar('lis_code', { length: 30 }),                    // ex: "P001"
  isCaducous: boolean('is_caducous'),                              // Caduque
  isToxic: boolean('is_toxic'),
  hasSpines: boolean('has_spines'),                                // Épines
  hasFlowers: boolean('has_flowers'),
  flowerColor: varchar('flower_color', { length: 100 }),
  floweringPeriod: varchar('flowering_period', { length: 100 }),  // "Avr–Juin"
  hasFruit: boolean('has_fruit'),
  fruitingPeriod: varchar('fruiting_period', { length: 100 }),
  adaptedEnvironment: text('adapted_environment'),                 // "Zones arides, côtières…"
  diseases: text('diseases'),                                      // Maladies et insectes
  heightAdultMin: decimal('height_adult_min', { precision: 5, scale: 2 }), // M
  heightAdultMax: decimal('height_adult_max', { precision: 5, scale: 2 }),
  diameterAdultMin: decimal('diameter_adult_min', { precision: 5, scale: 2 }),
  diameterAdultMax: decimal('diameter_adult_max', { precision: 5, scale: 2 }),
  storageExposure: varchar('storage_exposure', { length: 100 }),   // Exposition de stockage
  storagePlace: varchar('storage_place', { length: 100 }),
  plantingPeriod: varchar('planting_period', { length: 100 }),
  soilType: varchar('soil_type', { length: 255 }),
  plantingExposure: varchar('planting_exposure', { length: 100 }),
  wateringCold: varchar('watering_cold', { length: 100 }),         // Période froide
  wateringHot: varchar('watering_hot', { length: 100 }),           // Période sèche
  pruning: text('pruning'),                                        // Taille
  phytosanitaryTreatment: text('phytosanitary_treatment'),
  photoUrl: text('photo_url'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by'),
}, (t) => [
  index('plant_species_category_idx').on(t.category),
])

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierCode: varchar('supplier_code', { length: 20 }),          // FR-001 from FOR-AC-11
  name: varchar('name', { length: 255 }).notNull(),
  category: supplierCategoryEnum('category').notNull().default('autre'),
  registreCommerce: varchar('registre_commerce', { length: 100 }), // N° identification registre
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  isoStatus: supplierStatusEnum('iso_status').notNull().default('en_evaluation'),
  // FOR-AC-11 evaluation scores (computed averages, decimal)
  selectionScore: decimal('selection_score', { precision: 5, scale: 2 }),   // avg of 7 selection criteria
  selectionClass: varchar('selection_class', { length: 1 }),                  // A / B / C
  evaluationScore: decimal('evaluation_score', { precision: 5, scale: 2 }), // avg of eval criteria
  evaluationClass: varchar('evaluation_class', { length: 1 }),               // A / B / C (last eval)
  isoClass: varchar('iso_class', { length: 1 }),                             // final status A/B/C
  nextEvalPlanned: varchar('next_eval_planned', { length: 50 }),             // "Fev 2025"
  nextEvalDone: varchar('next_eval_done', { length: 50 }),
  lastAuditDate: timestamp('last_audit_date'),
  contractAssetId: uuid('contract_asset_id'),
  isoApproved: boolean('iso_approved').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('suppliers_iso_approved_idx').on(t.isoApproved),
  index('suppliers_iso_status_idx').on(t.isoStatus),
  index('suppliers_category_idx').on(t.category),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Supplier Evaluations ─────────────────────────────────────────────────────

export const supplierEvaluations = pgTable('supplier_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull(),
  evaluatedBy: uuid('evaluated_by').notNull(),
  evaluatorName: varchar('evaluator_name', { length: 255 }).notNull(),
  evaluationType: varchar('evaluation_type', { length: 20 }).default('selection'), // 'selection' | 'evaluation'
  // Legacy single score (1–5)
  score: integer('score').notNull().default(0),
  // FOR-AC-11 selection criteria (1–3 scale)
  tauxCouverture:       integer('taux_couverture'),
  niveauQualite:        integer('niveau_qualite'),
  prix:                 integer('prix'),
  delaiLivraison:       integer('delai_livraison'),
  modeLivraison:        integer('mode_livraison'),
  modalitesPaiement:    integer('modalites_paiement'),
  proximiteLivraison:   integer('proximite_livraison'),
  // FOR-AC-11 evaluation criteria (1–3 scale)
  notorieteReference:   integer('notoriete_reference'),   // services only
  respectExigences:     integer('respect_exigences'),
  respectPrix:          integer('respect_prix'),
  respectDelai:         integer('respect_delai'),
  reactivite:           integer('reactivite'),            // services only
  assistanceTechnique:  integer('assistance_technique'),  // services only
  documentationTech:    integer('documentation_technique'), // services only
  // Computed
  computedScore:  decimal('computed_score', { precision: 5, scale: 2 }),
  classification: varchar('classification', { length: 1 }), // A / B / C
  notes: text('notes'),
  evaluatedAt: timestamp('evaluated_at').notNull().defaultNow(),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('supplier_evaluations_supplier_id_idx').on(t.supplierId),
  foreignKey({ columns: [t.supplierId], foreignColumns: [suppliers.id] }),
  foreignKey({ columns: [t.evaluatedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Plant List Items (Études input) ─────────────────────────────────────────

export const plantListItems = pgTable('plant_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  plantSpeciesId: uuid('plant_species_id'),
  botanicalName: varchar('botanical_name', { length: 255 }).notNull(),
  commonName: varchar('common_name', { length: 255 }),
  category: plantCategoryEnum('category').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: plantUnitEnum('unit').notNull().default('unit'),
  unitPriceEstimate: decimal('unit_price_estimate', { precision: 10, scale: 3 }),
  supplierId: uuid('supplier_id'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('plant_list_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.plantSpeciesId], foreignColumns: [plantSpecies.id] }),
  foreignKey({ columns: [t.supplierId], foreignColumns: [suppliers.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Budget Predictions ───────────────────────────────────────────────────────

export const budgetPredictions = pgTable('budget_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  version: integer('version').notNull().default(1),
  predictedTotal: decimal('predicted_total', { precision: 12, scale: 3 }).notNull(),
  confidenceLow: decimal('confidence_low', { precision: 12, scale: 3 }),
  confidenceHigh: decimal('confidence_high', { precision: 12, scale: 3 }),
  confidenceScore: integer('confidence_score'),
  breakdownPlants: decimal('breakdown_plants', { precision: 12, scale: 3 }),
  breakdownSoil: decimal('breakdown_soil', { precision: 12, scale: 3 }),
  breakdownLabor: decimal('breakdown_labor', { precision: 12, scale: 3 }),
  breakdownEquipment: decimal('breakdown_equipment', { precision: 12, scale: 3 }),
  breakdownLogistics: decimal('breakdown_logistics', { precision: 12, scale: 3 }),
  topCostDrivers: text('top_cost_drivers').array(),
  modelVersion: varchar('model_version', { length: 50 }),
  similarProjectsUsed: integer('similar_projects_used'),
  isFallback: boolean('is_fallback').notNull().default(false),
  status: predictionStatusEnum('status').notNull().default('pending'),
  rawInput: jsonb('raw_input'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('budget_predictions_project_id_idx').on(t.projectId),
  index('budget_predictions_status_idx').on(t.status),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Budget Validations ───────────────────────────────────────────────────────

export const budgetValidations = pgTable('budget_validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  predictionId: uuid('prediction_id').notNull(),
  chefUserId: uuid('chef_user_id').notNull(),
  status: validationStatusEnum('status').notNull().default('pending'),
  token: varchar('token', { length: 500 }).notNull().unique(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  validatedAt: timestamp('validated_at'),
  modifiedAt: timestamp('modified_at'),
  modificationReason: text('modification_reason'),
  modifiedValues: jsonb('modified_values'),
  reminderSentAt: timestamp('reminder_sent_at'),
  escalationSentAt: timestamp('escalation_sent_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('budget_validations_project_id_idx').on(t.projectId),
  index('budget_validations_status_idx').on(t.status),
  index('budget_validations_token_idx').on(t.token),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.predictionId], foreignColumns: [budgetPredictions.id] }),
  foreignKey({ columns: [t.chefUserId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  plantListItemId: uuid('plant_list_item_id'),
  itemDescription: varchar('item_description', { length: 255 }).notNull(),
  quantityPurchased: decimal('quantity_purchased', { precision: 10, scale: 2 }).notNull(),
  unitPricePaid: decimal('unit_price_paid', { precision: 10, scale: 3 }).notNull(),
  totalCost: decimal('total_cost', { precision: 12, scale: 3 }).notNull(),
  supplierId: uuid('supplier_id'),
  supplierInvoiceNumber: varchar('supplier_invoice_number', { length: 100 }),
  invoiceAssetId: uuid('invoice_asset_id'),
  purchaseDate: timestamp('purchase_date').notNull(),
  purchasedBy: uuid('purchased_by').notNull(),
  status: purchaseStatusEnum('status').notNull().default('pending'),
  nurserySource: nurserySourceEnum('nursery_source').default('fournisseur_externe'),
  nurseryStockId: uuid('nursery_stock_id'),
  notes: text('notes'),
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('purchase_orders_project_id_idx').on(t.projectId),
  index('purchase_orders_status_idx').on(t.status),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.plantListItemId], foreignColumns: [plantListItems.id] }),
  foreignKey({ columns: [t.supplierId], foreignColumns: [suppliers.id] }),
  foreignKey({ columns: [t.purchasedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Cloudinary Assets ────────────────────────────────────────────────────────

export const cloudinaryAssets = pgTable('cloudinary_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: varchar('public_id', { length: 500 }).notNull().unique(),
  url: text('url').notNull(),
  secureUrl: text('secure_url').notNull(),
  assetType: assetTypeEnum('asset_type').notNull(),
  format: varchar('format', { length: 20 }),
  bytes: integer('bytes'),
  width: integer('width'),
  height: integer('height'),
  linkedEntity: varchar('linked_entity', { length: 50 }),
  linkedEntityId: uuid('linked_entity_id'),
  projectId: uuid('project_id'),
  uploadedBy: uuid('uploaded_by').notNull(),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('cloudinary_assets_project_id_idx').on(t.projectId),
  index('cloudinary_assets_linked_entity_id_idx').on(t.linkedEntityId),
  index('cloudinary_assets_asset_type_idx').on(t.assetType),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.uploadedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Quality Checklists (templates) ──────────────────────────────────────────

export const qualityChecklists = pgTable('quality_checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  phase: phaseEnum('phase').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('quality_checklists_phase_idx').on(t.phase),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const qualityChecklistItems = pgTable('quality_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  checklistId: uuid('checklist_id').notNull(),
  order: integer('order').notNull().default(0),
  label: varchar('label', { length: 500 }).notNull(),
  isoClause: varchar('iso_clause', { length: 50 }),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('checklist_items_checklist_id_idx').on(t.checklistId),
  foreignKey({ columns: [t.checklistId], foreignColumns: [qualityChecklists.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const projectChecklistAnswers = pgTable('project_checklist_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  checklistItemId: uuid('checklist_item_id').notNull(),
  isComplete: boolean('is_complete').notNull().default(false),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by'),
  evidenceAssetId: uuid('evidence_asset_id'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('checklist_answers_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.checklistItemId], foreignColumns: [qualityChecklistItems.id] }),
  foreignKey({ columns: [t.completedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Non-Conformances ─────────────────────────────────────────────────────────

export const nonConformances = pgTable('non_conformances', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 50 }).notNull().unique(),
  ncFicheNum: integer('nc_fiche_num'),           // N° Fiche from FOR-MI-05 (sequential: 1,2,3…)
  ncMonth: varchar('nc_month', { length: 20 }),  // Mois column ("Janvier", "Février"…)
  projectId: uuid('project_id'),
  detectedAt: timestamp('detected_at').notNull().defaultNow(),
  detectedBy: uuid('detected_by').notNull(),
  detectorName: text('detector_name'),          // free-text name (e.g. auditor external)
  detectorEmail: text('detector_email'),
  processAffected: phaseEnum('process_affected'),
  dept: ncDeptEnum('dept'),                      // AC / CO / ET / MI / RE1 / RE2 / RH
  ncType: ncTypeEnum('nc_type'),
  ncSource: ncSourceEnum('nc_source'),           // interne / audit / reclamation_client / pi
  ownerType: ncOwnerTypeEnum('nc_owner_type'),
  auditorName: text('auditor_name'),
  referenceDoc: varchar('reference_doc', { length: 100 }), // e.g. "NC N°1"
  description: text('description').notNull(),
  impact: text('impact'),                        // Impact de la non-conformité
  rootCause: text('root_cause'),
  // Immediate correction (distinct from CAPA)
  immediateCorrection: text('immediate_correction'),
  derogationAuth: boolean('derogation_auth').default(false),
  rebut: boolean('rebut').default(false),
  correctionResponsible: text('correction_responsible'),
  correctionDeadlinePlanned: timestamp('correction_deadline_planned'),
  correctionDeadlineActual: timestamp('correction_deadline_actual'),
  correctionProgress: real('correction_progress'), // Etat d'avancement correction (0–1)
  correctionStatus: varchar('correction_status', { length: 30 }),
  assignedTo: uuid('assigned_to'),
  deadline: timestamp('deadline'),
  status: ncStatusEnum('status').notNull().default('open'),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by'),
  // Effectiveness evaluation dates
  evalDatePlanned: timestamp('eval_date_planned'),
  evalDateActual: timestamp('eval_date_actual'),
  // Client / PI response (for reclamation_client / reclamation_pi)
  clientResponse: text('client_response'),
  clientResponseRef: varchar('client_response_ref', { length: 200 }), // Désignation R/O field
  // Risk / Opportunity
  isRisk: boolean('is_risk').default(false),
  isOpportunity: boolean('is_opportunity').default(false),
  needsSecondCapa: boolean('needs_second_capa').default(false),
  beforePhotoAssetId: uuid('before_photo_asset_id'),
  afterPhotoAssetId: uuid('after_photo_asset_id'),
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  deletedAt: timestamp('deleted_at'),
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('nc_project_id_idx').on(t.projectId),
  index('nc_status_idx').on(t.status),
  index('nc_assigned_to_idx').on(t.assignedTo),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.detectedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.assignedTo], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.closedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Corrective Actions (CAPA) ────────────────────────────────────────────────

export const correctiveActions = pgTable('corrective_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ncId: uuid('nc_id').notNull(),
  actionDescription: text('action_description').notNull(),
  responsibleId: uuid('responsible_id').notNull(),
  responsibleName: text('responsible_name'),        // free-text fallback
  deadlinePlanned: timestamp('deadline_planned'),    // Date prévue
  deadlineActual: timestamp('deadline_actual'),      // Date réalisée
  deadline: timestamp('deadline'),                   // kept for backward compat
  evalDatePlanned: timestamp('eval_date_planned'),   // Date d'évaluation prévue
  evalDateActual: timestamp('eval_date_actual'),     // Date d'évaluation réalisée
  evidenceAssetId: uuid('evidence_asset_id'),
  status: capaStatusEnum('status').notNull().default('open'),
  progressStatus: varchar('progress_status', { length: 50 }), // Etat d'avancement text
  effectivenessVerified: boolean('effectiveness_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by'),
  closedAt: timestamp('closed_at'),
  notes: text('notes'),
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('capa_nc_id_idx').on(t.ncId),
  index('capa_status_idx').on(t.status),
  foreignKey({ columns: [t.ncId], foreignColumns: [nonConformances.id] }),
  foreignKey({ columns: [t.responsibleId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.verifiedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Audit Programs (FOR-MI-14) ───────────────────────────────────────────────

export const auditPrograms = pgTable('audit_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 50 }).notNull().unique(), // e.g. AUD-2025-001
  year: integer('year').notNull(),
  dept: ncDeptEnum('dept').notNull(),              // AC / CO / ET / MI / RE1 / RE2 / RH
  title: varchar('title', { length: 200 }),
  auditorName: text('auditor_name'),               // Internal or external auditor
  auditeeResponsible: text('auditee_responsible'), // Department head / Pilote processus
  scheduledDate: timestamp('scheduled_date'),
  scheduledStartTime: varchar('scheduled_start_time', { length: 10 }), // e.g. "09H00"
  scheduledEndTime: varchar('scheduled_end_time', { length: 10 }),     // e.g. "11H00"
  actualDate: timestamp('actual_date'),
  auditorSignedAt: timestamp('auditor_signed_at'),
  status: auditProgramStatusEnum('status').notNull().default('planifie'),
  scope: text('scope'),                            // Périmètre d'audit
  objectives: text('objectives'),                  // Objectifs
  criteria: text('criteria'),                      // Clauses ISO 9001 (e.g. "4.4; 6.1; 8.4")
  referenceDocuments: text('reference_documents'), // e.g. "PRS-AC-01 & documents associés"
  findings: text('findings'),                      // Constats
  reportAssetId: uuid('report_asset_id'),          // Uploaded audit report
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('audit_programs_year_idx').on(t.year),
  index('audit_programs_dept_idx').on(t.dept),
  index('audit_programs_status_idx').on(t.status),
  foreignKey({ columns: [t.reportAssetId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const auditProgramItems = pgTable('audit_program_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditProgramId: uuid('audit_program_id').notNull(),
  // Agenda step label (Etapes du processus) — e.g. "Revue des offres / contrats"
  agendaStep: text('agenda_step').notNull(),
  clauseRef: varchar('clause_ref', { length: 100 }),     // ISO clause(s) for this step
  interlocuteurs: text('interlocuteurs'),                 // Who must attend — e.g. "Pilote processus & Collaborateurs"
  response: text('response'),                            // Auditor notes / observations
  conformity: varchar('conformity', { length: 10 }),     // C / NC / NA / PA (Piste d'amélioration)
  evidence: text('evidence'),                            // Supporting evidence
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('audit_program_items_program_idx').on(t.auditProgramId),
  foreignKey({ columns: [t.auditProgramId], foreignColumns: [auditPrograms.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Maintenance Schedules ────────────────────────────────────────────────────

export const maintenanceSchedules = pgTable('maintenance_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  contractAssetId: uuid('contract_asset_id'),
  contractStartDate: timestamp('contract_start_date'),
  contractEndDate: timestamp('contract_end_date'),
  visitFrequency: varchar('visit_frequency', { length: 50 }),
  visitFrequencyType: visitFrequencyTypeEnum('visit_frequency_type'),
  visitFrequencyDays: integer('visit_frequency_days'),
  monthlyCost: decimal('monthly_cost', { precision: 10, scale: 3 }),
  assignedTeamId: uuid('assigned_team_id'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('maintenance_schedules_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.assignedTeamId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Maintenance Visits ───────────────────────────────────────────────────────

export const maintenanceVisits = pgTable('maintenance_visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull(),
  projectId: uuid('project_id').notNull(),
  visitDate: timestamp('visit_date').notNull(),
  visitType: visitTypeEnum('visit_type'),
  durationHours: decimal('duration_hours', { precision: 5, scale: 2 }),
  teamMemberId: uuid('team_member_id').notNull(),
  assignedTeamName: text('assigned_team_name'),
  workDone: text('work_done'),
  workChecklist: jsonb('work_checklist'),
  productsUsed: jsonb('products_used'),
  issuesFound: text('issues_found'),
  nextVisitRecommendation: text('next_visit_recommendation'),
  beforePhotoAssetId: uuid('before_photo_asset_id'),
  afterPhotoAssetId: uuid('after_photo_asset_id'),
  ncId: uuid('nc_id'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('maintenance_visits_project_id_idx').on(t.projectId),
  index('maintenance_visits_schedule_id_idx').on(t.scheduleId),
  foreignKey({ columns: [t.scheduleId], foreignColumns: [maintenanceSchedules.id] }),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.teamMemberId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.ncId], foreignColumns: [nonConformances.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Plant Health Records ─────────────────────────────────────────────────────

export const plantHealthRecords = pgTable('plant_health_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull(),
  projectId: uuid('project_id').notNull(),
  zoneName: varchar('zone_name', { length: 255 }).notNull(),
  plantSpeciesId: uuid('plant_species_id'),
  healthStatus: healthStatusEnum('health_status').notNull(),
  healthScore: integer('health_score'),
  observations: text('observations'),
  photoAssetId: uuid('photo_asset_id'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('plant_health_project_id_idx').on(t.projectId),
  index('plant_health_visit_id_idx').on(t.visitId),
  foreignKey({ columns: [t.visitId], foreignColumns: [maintenanceVisits.id] }),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.plantSpeciesId], foreignColumns: [plantSpecies.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Client Satisfaction ──────────────────────────────────────────────────────

export const clientSatisfaction = pgTable('client_satisfaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  score: integer('score').notNull(),
  comments: text('comments'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  recordedBy: uuid('recorded_by').notNull(),
  isoClause: varchar('iso_clause', { length: 20 }).default('9.1.2'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('client_satisfaction_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.recordedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── ISO Documents ────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  category: documentCategoryEnum('category').notNull().default('procedure'),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  status: documentStatusEnum('status').notNull().default('draft'),
  ownerId: uuid('owner_id').notNull(),
  assetId: uuid('asset_id'),
  isoClause: varchar('iso_clause', { length: 50 }),
  processAffected: phaseEnum('process_affected'),
  effectiveDate: timestamp('effective_date'),
  reviewDate: timestamp('review_date'),
  obsoletedAt: timestamp('obsoleted_at'),
  notes: text('notes'),
  supersededById: uuid('superseded_by_id'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('documents_status_idx').on(t.status),
  index('documents_owner_id_idx').on(t.ownerId),
  foreignKey({ columns: [t.ownerId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Internal Audit Logs ──────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 50 }).notNull().unique(),
  auditorId: uuid('auditor_id').notNull(),
  auditDate: timestamp('audit_date').notNull(),
  processAudited: varchar('process_audited', { length: 50 }).notNull(),
  scope: text('scope'),
  findings: text('findings'),
  status: auditStatusEnum('status').notNull().default('scheduled'),
  completedAt: timestamp('completed_at'),
  dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('audit_logs_status_idx').on(t.status),
  index('audit_logs_auditor_id_idx').on(t.auditorId),
  foreignKey({ columns: [t.auditorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Email Queue ──────────────────────────────────────────────────────────────

export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id'),
  recipientId: uuid('recipient_id'),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  templateName: varchar('template_name', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  status: emailStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  relatedEntityType: varchar('related_entity_type', { length: 50 }),
  relatedEntityId: uuid('related_entity_id'),
  metadata: jsonb('metadata'),
  errorMessage: text('error_message'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('email_queue_project_id_idx').on(t.projectId),
  index('email_queue_status_idx').on(t.status),
  index('email_queue_recipient_id_idx').on(t.recipientId),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.recipientId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── System Settings ─────────────────────────────────────────────────────────

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value'),
  ...timestamps,
  updatedBy: uuid('updated_by'),
})

// ─── Project Activity Log (immutable audit trail) ─────────────────────────────

// ─── RSE Partnerships ─────────────────────────────────────────────────────────

export const rsePartnerTypeEnum = pgEnum('rse_partner_type', [
  'hotel',
  'municipalite',
  'entreprise',
  'institution',
  'autre',
])

export const rsePartnershipStatusEnum = pgEnum('rse_partnership_status', [
  'actif',
  'expire',
  'resilie',
  'en_cours_de_negociation',
])

export const rseCommitmentTypeEnum = pgEnum('rse_commitment_type', [
  'action_annuelle',
  'sensibilisation',
  'communication',
  'projet_paysager',
  'autre',
])

export const rseCommitmentFrequencyEnum = pgEnum('rse_commitment_frequency', [
  'unique',
  'annuel',
  'semestriel',
  'trimestriel',
  'mensuel',
])

export const rseResponsiblePartyEnum = pgEnum('rse_responsible_party', [
  'sopat',
  'partenaire',
  'conjoint',
])

export const rseCommitmentStatusEnum = pgEnum('rse_commitment_status', [
  'respecte',
  'en_retard',
  'a_venir',
])

export const rseCommunicationTypeEnum = pgEnum('rse_communication_type', [
  'logo_sopat',
  'logo_partenaire',
  'publication_commune',
])

export const rseCommunicationValidationEnum = pgEnum('rse_communication_validation', [
  'en_attente',
  'approuve',
  'refuse',
])

export const rsePartnerships = pgTable('rse_partnerships', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  partnerType: rsePartnerTypeEnum('partner_type').notNull(),
  partnerAddress: text('partner_address'),
  partnerContactName: varchar('partner_contact_name', { length: 255 }),
  partnerContactEmail: varchar('partner_contact_email', { length: 255 }),
  partnerContactPhone: varchar('partner_contact_phone', { length: 50 }),
  sopatReferentId: uuid('sopat_referent_id').notNull(),
  partnerReferentName: varchar('partner_referent_name', { length: 255 }),
  conventionReference: varchar('convention_reference', { length: 50 }).notNull().unique(),
  signedDate: timestamp('signed_date'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  autoRenewal: boolean('auto_renewal').notNull().default(false),
  noticePeriodDays: integer('notice_period_days').notNull().default(30),
  status: rsePartnershipStatusEnum('status').notNull().default('en_cours_de_negociation'),
  conventionPdfCloudinaryId: uuid('convention_pdf_cloudinary_id'),
  notes: text('notes'),
  teamName: text('team_name'),
  teamLeadName: text('team_lead_name'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_partnerships_status_idx').on(t.status),
  index('rse_partnerships_referent_idx').on(t.sopatReferentId),
  foreignKey({ columns: [t.sopatReferentId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.conventionPdfCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rsePartnershipCommitments = pgTable('rse_partnership_commitments', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnershipId: uuid('partnership_id').notNull(),
  articleNumber: varchar('article_number', { length: 50 }),
  commitmentDescription: text('commitment_description').notNull(),
  commitmentType: rseCommitmentTypeEnum('commitment_type').notNull().default('autre'),
  frequency: rseCommitmentFrequencyEnum('frequency').notNull().default('annuel'),
  responsibleParty: rseResponsiblePartyEnum('responsible_party').notNull().default('sopat'),
  lastCompletedDate: timestamp('last_completed_date'),
  nextDueDate: timestamp('next_due_date'),
  status: rseCommitmentStatusEnum('status').notNull().default('a_venir'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_commitments_partnership_id_idx').on(t.partnershipId),
  index('rse_commitments_status_idx').on(t.status),
  foreignKey({ columns: [t.partnershipId], foreignColumns: [rsePartnerships.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rsePartnershipCommunications = pgTable('rse_partnership_communications', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnershipId: uuid('partnership_id').notNull(),
  communicationType: rseCommunicationTypeEnum('communication_type').notNull(),
  description: text('description').notNull(),
  submittedBy: uuid('submitted_by').notNull(),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  validationStatus: rseCommunicationValidationEnum('validation_status').notNull().default('en_attente'),
  validatedByName: varchar('validated_by_name', { length: 255 }),
  validatedAt: timestamp('validated_at'),
  assetCloudinaryId: uuid('asset_cloudinary_id'),
  requiredByDate: timestamp('required_by_date'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_communications_partnership_id_idx').on(t.partnershipId),
  index('rse_communications_status_idx').on(t.validationStatus),
  foreignKey({ columns: [t.partnershipId], foreignColumns: [rsePartnerships.id] }),
  foreignKey({ columns: [t.submittedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.assetCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rseActivityLog = pgTable('rse_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnershipId: uuid('partnership_id').notNull(),
  actorId: uuid('actor_id').notNull(),
  actorName: varchar('actor_name', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_activity_log_partnership_id_idx').on(t.partnershipId),
  index('rse_activity_log_actor_id_idx').on(t.actorId),
  foreignKey({ columns: [t.partnershipId], foreignColumns: [rsePartnerships.id] }),
  foreignKey({ columns: [t.actorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RSE Events ───────────────────────────────────────────────────────────────

export const rseEventTypeEnum = pgEnum('rse_event_type', [
  'nettoyage_plage',
  'plantation',
  'sensibilisation',
  'team_building',
  'journee_environnement',
  'autre',
])

export const rseEventStatusEnum = pgEnum('rse_event_status', [
  'planifie',
  'en_cours',
  'termine',
  'annule',
])

export const rseEventTeamNameEnum = pgEnum('rse_event_team_name', [
  'rse',
  'rh_communication',
  'logistique',
  'communication_marketing',
  'direction',
])

export const rseLogisticsCategoryEnum = pgEnum('rse_logistics_category', [
  'materiel_environnement',
  'materiel_evenementiel',
  'confort',
])

export const rseRetroStatusEnum = pgEnum('rse_retro_status', [
  'a_faire',
  'en_cours',
  'termine',
])

export const rseCommPhaseEnum = pgEnum('rse_comm_phase', [
  'avant',
  'pendant',
  'apres',
])

export const rseCommChannelEnum = pgEnum('rse_comm_channel', [
  'reseaux_sociaux',
  'email_interne',
  'presse',
  'affichage',
  'autre',
])

export const rseCommPlanStatusEnum = pgEnum('rse_comm_plan_status', [
  'planifie',
  'publie',
  'annule',
])

export const rseEvents = pgTable('rse_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventReference: varchar('event_reference', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  eventType: rseEventTypeEnum('event_type').notNull(),
  date: timestamp('date').notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  partnerId: uuid('partner_id'),
  status: rseEventStatusEnum('status').notNull().default('planifie'),
  participantCountPlanned: integer('participant_count_planned'),
  participantCountActual: integer('participant_count_actual'),
  sopatCoordinatorId: uuid('sopat_coordinator_id').notNull(),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_events_status_idx').on(t.status),
  index('rse_events_type_idx').on(t.eventType),
  index('rse_events_date_idx').on(t.date),
  foreignKey({ columns: [t.partnerId], foreignColumns: [rsePartnerships.id] }),
  foreignKey({ columns: [t.sopatCoordinatorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rseEventTeams = pgTable('rse_event_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull(),
  teamName: rseEventTeamNameEnum('team_name').notNull(),
  teamLeaderId: uuid('team_leader_id'),
  missions: text('missions').array(),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_event_teams_event_id_idx').on(t.eventId),
  foreignKey({ columns: [t.eventId], foreignColumns: [rseEvents.id] }),
  foreignKey({ columns: [t.teamLeaderId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rseEventLogistics = pgTable('rse_event_logistics', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull(),
  category: rseLogisticsCategoryEnum('category').notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantityPlanned: integer('quantity_planned'),
  quantityActual: integer('quantity_actual'),
  unit: varchar('unit', { length: 50 }),
  supplier: varchar('supplier', { length: 255 }),
  cost: decimal('cost', { precision: 10, scale: 3 }),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_event_logistics_event_id_idx').on(t.eventId),
  foreignKey({ columns: [t.eventId], foreignColumns: [rseEvents.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rseEventRetroplanning = pgTable('rse_event_retroplanning', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull(),
  taskDescription: text('task_description').notNull(),
  deadline: timestamp('deadline'),
  assignedTeam: rseEventTeamNameEnum('assigned_team'),
  status: rseRetroStatusEnum('status').notNull().default('a_faire'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_event_retroplanning_event_id_idx').on(t.eventId),
  foreignKey({ columns: [t.eventId], foreignColumns: [rseEvents.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rseEventCommunicationPlan = pgTable('rse_event_communication_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull(),
  phase: rseCommPhaseEnum('phase').notNull(),
  actionDescription: text('action_description').notNull(),
  channel: rseCommChannelEnum('channel').notNull(),
  responsibleId: uuid('responsible_id'),
  status: rseCommPlanStatusEnum('status').notNull().default('planifie'),
  publishedAt: timestamp('published_at'),
  assetCloudinaryId: uuid('asset_cloudinary_id'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_event_comm_plan_event_id_idx').on(t.eventId),
  foreignKey({ columns: [t.eventId], foreignColumns: [rseEvents.id] }),
  foreignKey({ columns: [t.responsibleId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.assetCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const rseEventResults = pgTable('rse_event_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().unique(),
  wasteCollectedKg: decimal('waste_collected_kg', { precision: 10, scale: 2 }),
  treesPlanted: integer('trees_planted'),
  participantsActual: integer('participants_actual'),
  beachLengthCleanedM: decimal('beach_length_cleaned_m', { precision: 10, scale: 2 }),
  zonesTreated: integer('zones_treated'),
  mediaCoverage: boolean('media_coverage').notNull().default(false),
  pressArticlesCount: integer('press_articles_count'),
  socialMediaReach: integer('social_media_reach'),
  satisfactionScore: integer('satisfaction_score'),
  lessonsLearned: text('lessons_learned'),
  postEventReportCloudinaryId: uuid('post_event_report_cloudinary_id'),
  photosAlbumCloudinaryIds: text('photos_album_cloudinary_ids').array(),
  submittedBy: uuid('submitted_by'),
  submittedAt: timestamp('submitted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('rse_event_results_event_id_idx').on(t.eventId),
  foreignKey({ columns: [t.eventId], foreignColumns: [rseEvents.id] }),
  foreignKey({ columns: [t.postEventReportCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.submittedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Project Activity Log (immutable audit trail) ─────────────────────────────

export const projectActivityLog = pgTable('project_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  actorId: uuid('actor_id').notNull(),
  actorName: varchar('actor_name', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  evidenceAssetIds: uuid('evidence_asset_ids').array(),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('activity_log_project_id_idx').on(t.projectId),
  index('activity_log_actor_id_idx').on(t.actorId),
  index('activity_log_occurred_at_idx').on(t.occurredAt),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.actorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Equipment Types (reference table) ───────────────────────────────────────

export const equipmentTypes = pgTable('equipment_types', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          varchar('name', { length: 100 }).notNull().unique(),
  displayNameFr: varchar('display_name_fr', { length: 255 }).notNull(),
  iconName:      varchar('icon_name', { length: 100 }),
  notes:         text('notes'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
})

// ─── Equipment Rentals ────────────────────────────────────────────────────────

export const equipmentRentals = pgTable('equipment_rentals', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  projectId:             uuid('project_id').notNull(),
  equipmentTypeId:       uuid('equipment_type_id').notNull(),
  equipmentDescription:  varchar('equipment_description', { length: 255 }),
  rentalCompany:         varchar('rental_company', { length: 255 }),
  rentalCompanyContact:  varchar('rental_company_contact', { length: 255 }),
  startDate:             date('start_date').notNull(),
  endDate:               date('end_date').notNull(),
  rentalDays:            integer('rental_days').notNull(),
  dailyRate:             decimal('daily_rate', { precision: 10, scale: 3 }).notNull(),
  totalCost:             decimal('total_cost', { precision: 12, scale: 3 }).notNull(),
  currency:              currencyEnum('currency').notNull().default('TND'),
  invoiceNumber:         varchar('invoice_number', { length: 100 }),
  invoiceAssetId:        uuid('invoice_asset_id'),
  operatorName:          varchar('operator_name', { length: 255 }),
  purposeDescription:    text('purpose_description'),
  linkedPlantItemIds:    uuid('linked_plant_item_ids').array(),
  ...timestamps,
  deletedAt:             timestamp('deleted_at'),
  createdBy:             uuid('created_by').notNull(),
}, (t) => [
  index('equipment_rentals_project_id_idx').on(t.projectId),
  index('equipment_rentals_type_id_idx').on(t.equipmentTypeId),
  foreignKey({ columns: [t.projectId],       foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.equipmentTypeId], foreignColumns: [equipmentTypes.id] }),
  foreignKey({ columns: [t.invoiceAssetId],  foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.createdBy],       foreignColumns: [users.id] }),
])

// ─── Nursery Stock ────────────────────────────────────────────────────────────

export const nurseryStock = pgTable('nursery_stock', {
  id: uuid('id').primaryKey().defaultRandom(),
  botanicalName: varchar('botanical_name', { length: 255 }).notNull(),
  commonName: varchar('common_name', { length: 255 }),
  category: plantCategoryEnum('category').notNull(),
  currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  reservedQuantity: decimal('reserved_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  unit: plantUnitEnum('unit').notNull().default('unit'),
  location: varchar('location', { length: 255 }),
  healthStatus: nurseryHealthEnum('health_status').notNull().default('healthy'),
  notes: text('notes'),
  photoCloudinaryId: varchar('photo_cloudinary_id', { length: 500 }),
  ...timestamps,
  deletedAt: timestamp('deleted_at'),
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('nursery_stock_botanical_name_idx').on(t.botanicalName),
  index('nursery_stock_category_idx').on(t.category),
  index('nursery_stock_deleted_at_idx').on(t.deletedAt),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Design Concept Templates ────────────────────────────────────────────────

export const designTemplates = pgTable('design_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  projectTypeContext: projectTypeEnum('project_type_context').array().notNull().default(sql`'{}'::project_type[]` as any),
  conceptDescriptionTemplate: text('concept_description_template').notNull(),
  recommendedVocabulary: text('recommended_vocabulary').array().notNull().default(sql`'{}'::text[]` as any),
  recommendedPalette: text('recommended_palette').array().notNull().default(sql`'{}'::text[]` as any),
  exampleProjectIds: uuid('example_project_ids').array().notNull().default(sql`'{}'::uuid[]` as any),
  referenceImageCloudinaryIds: text('reference_image_cloudinary_ids').array().notNull().default(sql`'{}'::text[]` as any),
  createdBy: uuid('created_by').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  ...timestamps,
}, (t) => [
  index('design_templates_is_published_idx').on(t.isPublished),
  index('design_templates_created_by_idx').on(t.createdBy),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Portfolio Metrics Snapshots ──────────────────────────────────────────────

export const portfolioMetricsSnapshots = pgTable('portfolio_metrics_snapshots', {
  id:           uuid('id').primaryKey().defaultRandom(),
  snapshotDate: date('snapshot_date').notNull(),
  metrics:      jsonb('metrics').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  createdBy:    uuid('created_by').notNull(),
}, (t) => [
  index('portfolio_metrics_snapshots_date_idx').on(t.snapshotDate),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const nurseryStockMovements = pgTable('nursery_stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  stockId: uuid('stock_id').notNull(),
  movementType: nurseryMovementTypeEnum('movement_type').notNull(),
  quantityDelta: decimal('quantity_delta', { precision: 10, scale: 2 }).notNull(),
  projectId: uuid('project_id'),
  plantListItemId: uuid('plant_list_item_id'),
  purchaseOrderId: uuid('purchase_order_id'),
  notes: text('notes'),
  movedAt: timestamp('moved_at').notNull().defaultNow(),
  movedBy: uuid('moved_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('nursery_movements_stock_id_idx').on(t.stockId),
  index('nursery_movements_project_id_idx').on(t.projectId),
  index('nursery_movements_moved_at_idx').on(t.movedAt),
  foreignKey({ columns: [t.stockId], foreignColumns: [nurseryStock.id] }),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.plantListItemId], foreignColumns: [plantListItems.id] }),
  foreignKey({ columns: [t.purchaseOrderId], foreignColumns: [purchaseOrders.id] }),
  foreignKey({ columns: [t.movedBy], foreignColumns: [users.id] }),
])

// ─── Portfolio Export ─────────────────────────────────────────────────────────

export const portfolioExportTypeEnum = pgEnum('portfolio_export_type', [
  'full',
  'by_type',
  'by_country',
  'custom',
  'single_project',
])

export const portfolioExports = pgTable('portfolio_exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  exportType: portfolioExportTypeEnum('export_type').notNull(),
  projectIdsIncluded: uuid('project_ids_included').array().notNull().default(sql`'{}'::uuid[]`),
  sectionsConfig: jsonb('sections_config').notNull(),
  filterConfig: jsonb('filter_config'),
  language: varchar('language', { length: 5 }).notNull().default('fr'),
  outputCloudinaryId: uuid('output_cloudinary_id'),
  fileSizeBytes: integer('file_size_bytes'),
  pageCount: integer('page_count'),
  downloadCount: integer('download_count').notNull().default(0),
  lastDownloadedAt: timestamp('last_downloaded_at'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  generatedBy: uuid('generated_by').notNull(),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('portfolio_exports_generated_by_idx').on(t.generatedBy),
  index('portfolio_exports_generated_at_idx').on(t.generatedAt),
  foreignKey({ columns: [t.outputCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.generatedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── DMS (ISO 9001:2015 Document Management System) ──────────────────────────
// Soft-deprecates the legacy `documents` table above (kept read-only). The DMS
// extends it with versioning, workflow, signatures, polymorphic linkage to
// business entities, fine-grained ACL, controlled forms/records, and an
// immutable audit log. Roles unchanged — Quality/Finance responsibilities are
// modeled via dms_permissions grants on top of existing user_role values.

export const dmsDepartmentEnum = pgEnum('dms_department', [
  'direction',
  'etudes',
  'realisation',
  'entretien',
  'qualite',
  'finance',
  'rh',
  'rse',
  'transverse',
])

export const dmsCategoryEnum = pgEnum('dms_category', [
  'manuel_qualite',
  'politique',
  'procedure',
  'instruction',
  'formulaire',
  'enregistrement',
  'plan_qualite',
  'cartographie_processus',
  'etude_technique',
  'devis',
  'contrat',
  'bon_commande',
  'facture',
  'rapport_inspection',
  'rapport_audit',
  'ncr',
  'capa',
  'document_fournisseur',
  'document_client',
  'externe',
])

export const dmsLifecycleStatusEnum = pgEnum('dms_lifecycle_status', [
  'draft',
  'in_review',
  'pending_approval',
  'approved',
  'effective',
  'under_revision',
  'obsolete',
  'archived',
])

export const dmsConfidentialityEnum = pgEnum('dms_confidentiality', [
  'public',
  'internal',
  'confidential',
  'restricted',
])

export const dmsApprovalActionEnum = pgEnum('dms_approval_action', [
  'submit_for_review',
  'review_approved',
  'review_rejected',
  'approve',
  'reject',
  'publish',
  'request_revision',
  'mark_obsolete',
  'archive',
])

export const dmsAuditEventEnum = pgEnum('dms_audit_event', [
  'created',
  'updated',
  'version_created',
  'status_changed',
  'reviewed',
  'approved',
  'rejected',
  'published',
  'obsoleted',
  'archived',
  'viewed',
  'downloaded',
  'signed',
  'linked',
  'unlinked',
  'permission_changed',
  'soft_deleted',
  'restored',
])

export const dmsLinkEntityEnum = pgEnum('dms_link_entity', [
  'project',
  'client',
  'supplier',
  'non_conformance',
  'corrective_action',
  'audit_log',
  'audit_program',
  'maintenance_visit',
  'purchase_order',
  'rse_partnership',
  'project_phase',
  'user',
])

export const dmsSignatureTypeEnum = pgEnum('dms_signature_type', [
  'electronic_simple',
  'electronic_advanced',
  'wet_scanned',
])

export const dmsPermissionLevelEnum = pgEnum('dms_permission_level', [
  'view',
  'comment',
  'edit',
  'approve',
  'manage',
])

export const dmsPermissionSubjectEnum = pgEnum('dms_permission_subject', [
  'user',
  'role',
])

export const dmsRowHighlightEnum = pgEnum('dms_row_highlight', ['none', 'green', 'red'])

export const dmsDocuments = pgTable('dms_documents', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  documentNumber:       varchar('document_number', { length: 50 }).notNull().unique(),
  title:                varchar('title', { length: 255 }).notNull(),
  description:          text('description'),
  category:             dmsCategoryEnum('category').notNull(),
  department:           dmsDepartmentEnum('department').notNull(),
  isoClauses:           text('iso_clauses').array().notNull().default(sql`'{}'::text[]`),
  confidentiality:      dmsConfidentialityEnum('confidentiality').notNull().default('internal'),
  tags:                 text('tags').array().notNull().default(sql`'{}'::text[]`),
  rowHighlight:         dmsRowHighlightEnum('row_highlight').notNull().default('none'),
  versionLabel:         varchar('version_label', { length: 20 }),
  storageType:          varchar('storage_type', { length: 50 }),
  managedByPassword:    boolean('managed_by_password').notNull().default(false),
  observations:         text('observations'),
  currentVersionId:     uuid('current_version_id'),
  status:               dmsLifecycleStatusEnum('status').notNull().default('draft'),
  ownerId:              uuid('owner_id').notNull(),
  authorId:             uuid('author_id').notNull(),
  departmentManagerId:  uuid('department_manager_id'),
  effectiveDate:        timestamp('effective_date'),
  nextReviewDate:       timestamp('next_review_date'),
  expirationDate:       timestamp('expiration_date'),
  obsoletedAt:          timestamp('obsoleted_at'),
  retentionYears:       integer('retention_years').notNull().default(10),
  retentionExpiresAt:   timestamp('retention_expires_at'),
  legacyReference:      varchar('legacy_reference', { length: 500 }),
  supersedesId:         uuid('supersedes_id'),
  supersededById:       uuid('superseded_by_id'),
  ...timestamps,
  deletedAt:            timestamp('deleted_at'),
  createdBy:            uuid('created_by').notNull(),
}, (t) => [
  index('dms_documents_department_idx').on(t.department),
  index('dms_documents_category_idx').on(t.category),
  index('dms_documents_status_idx').on(t.status),
  index('dms_documents_owner_idx').on(t.ownerId),
  index('dms_documents_next_review_idx').on(t.nextReviewDate),
  index('dms_documents_deleted_at_idx').on(t.deletedAt),
  foreignKey({ columns: [t.ownerId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.authorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.departmentManagerId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const dmsDocumentVersions = pgTable('dms_document_versions', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  documentId:           uuid('document_id').notNull(),
  versionMajor:         integer('version_major').notNull().default(1),
  versionMinor:         integer('version_minor').notNull().default(0),
  versionLabel:         varchar('version_label', { length: 20 }).notNull(),
  cloudinaryAssetId:    uuid('cloudinary_asset_id'),
  inlineContent:        jsonb('inline_content'),
  contentHash:          varchar('content_hash', { length: 128 }).notNull(),
  fileSizeBytes:        integer('file_size_bytes'),
  mimeType:             varchar('mime_type', { length: 100 }),
  extractedText:        text('extracted_text'),
  status:               dmsLifecycleStatusEnum('status').notNull().default('draft'),
  changeSummary:        text('change_summary').notNull(),
  changeReason:         text('change_reason'),
  authorId:             uuid('author_id').notNull(),
  reviewedById:         uuid('reviewed_by_id'),
  reviewedAt:           timestamp('reviewed_at'),
  approvedById:         uuid('approved_by_id'),
  approvedAt:           timestamp('approved_at'),
  publishedAt:          timestamp('published_at'),
  effectiveDate:        timestamp('effective_date'),
  revisionNumber:       integer('revision_number').notNull().default(1),
  ...timestamps,
  createdBy:            uuid('created_by').notNull(),
}, (t) => [
  uniqueIndex('dms_versions_doc_label_uidx').on(t.documentId, t.versionLabel),
  index('dms_versions_document_idx').on(t.documentId),
  index('dms_versions_status_idx').on(t.status),
  foreignKey({ columns: [t.documentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.cloudinaryAssetId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.authorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.reviewedById], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.approvedById], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const dmsWorkflowSteps = pgTable('dms_workflow_steps', {
  id:               uuid('id').primaryKey().defaultRandom(),
  documentId:       uuid('document_id').notNull(),
  versionId:        uuid('version_id').notNull(),
  stepOrder:        integer('step_order').notNull(),
  stepName:         varchar('step_name', { length: 50 }).notNull(),
  assigneeId:       uuid('assignee_id').notNull(),
  assigneeRole:     userRoleEnum('assignee_role'),
  action:           dmsApprovalActionEnum('action'),
  actionAt:         timestamp('action_at'),
  comments:         text('comments'),
  isMandatory:      boolean('is_mandatory').notNull().default(true),
  dueDate:          timestamp('due_date'),
  reminderSentAt:   timestamp('reminder_sent_at'),
  ...timestamps,
}, (t) => [
  index('dms_workflow_document_idx').on(t.documentId),
  index('dms_workflow_version_idx').on(t.versionId),
  index('dms_workflow_assignee_idx').on(t.assigneeId),
  foreignKey({ columns: [t.documentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.versionId], foreignColumns: [dmsDocumentVersions.id] }),
  foreignKey({ columns: [t.assigneeId], foreignColumns: [users.id] }),
])

export const dmsSignatures = pgTable('dms_signatures', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  versionId:              uuid('version_id').notNull(),
  signerId:               uuid('signer_id').notNull(),
  signerNameSnapshot:     varchar('signer_name_snapshot', { length: 255 }).notNull(),
  signerRoleSnapshot:     userRoleEnum('signer_role_snapshot').notNull(),
  signatureType:          dmsSignatureTypeEnum('signature_type').notNull().default('electronic_simple'),
  purpose:                varchar('purpose', { length: 50 }).notNull(),
  signedAt:               timestamp('signed_at').notNull().defaultNow(),
  ipAddress:              varchar('ip_address', { length: 64 }),
  userAgent:              text('user_agent'),
  contentHashAtSigning:   varchar('content_hash_at_signing', { length: 128 }).notNull(),
  otpChallenge:           varchar('otp_challenge', { length: 100 }),
  cloudinaryAssetId:      uuid('cloudinary_asset_id'),
  createdAt:              timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('dms_signatures_version_idx').on(t.versionId),
  index('dms_signatures_signer_idx').on(t.signerId),
  foreignKey({ columns: [t.versionId], foreignColumns: [dmsDocumentVersions.id] }),
  foreignKey({ columns: [t.signerId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.cloudinaryAssetId], foreignColumns: [cloudinaryAssets.id] }),
])

export const dmsDocumentLinks = pgTable('dms_document_links', {
  id:           uuid('id').primaryKey().defaultRandom(),
  documentId:   uuid('document_id').notNull(),
  entityType:   dmsLinkEntityEnum('entity_type').notNull(),
  entityId:     uuid('entity_id').notNull(),
  linkRole:     varchar('link_role', { length: 50 }),
  notes:        text('notes'),
  ...timestamps,
  createdBy:    uuid('created_by').notNull(),
}, (t) => [
  uniqueIndex('dms_links_unique_uidx').on(t.documentId, t.entityType, t.entityId, t.linkRole),
  index('dms_links_entity_idx').on(t.entityType, t.entityId),
  index('dms_links_document_idx').on(t.documentId),
  foreignKey({ columns: [t.documentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const dmsAuditLog = pgTable('dms_audit_log', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  documentId:          uuid('document_id').notNull(),
  versionId:           uuid('version_id'),
  event:               dmsAuditEventEnum('event').notNull(),
  actorId:             uuid('actor_id').notNull(),
  actorRoleSnapshot:   userRoleEnum('actor_role_snapshot').notNull(),
  previousState:       jsonb('previous_state'),
  newState:            jsonb('new_state'),
  metadata:            jsonb('metadata'),
  ipAddress:           varchar('ip_address', { length: 64 }),
  userAgent:           text('user_agent'),
  occurredAt:          timestamp('occurred_at').notNull().defaultNow(),
}, (t) => [
  index('dms_audit_document_idx').on(t.documentId),
  index('dms_audit_actor_idx').on(t.actorId),
  index('dms_audit_event_idx').on(t.event),
  index('dms_audit_occurred_idx').on(t.occurredAt),
  foreignKey({ columns: [t.documentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.versionId], foreignColumns: [dmsDocumentVersions.id] }),
  foreignKey({ columns: [t.actorId], foreignColumns: [users.id] }),
])

export const dmsPermissions = pgTable('dms_permissions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  documentId:   uuid('document_id'),
  category:     dmsCategoryEnum('category'),
  department:   dmsDepartmentEnum('department'),
  subjectType:  dmsPermissionSubjectEnum('subject_type').notNull(),
  subjectId:    uuid('subject_id'),
  subjectRole:  userRoleEnum('subject_role'),
  level:        dmsPermissionLevelEnum('level').notNull(),
  ...timestamps,
  createdBy:    uuid('created_by').notNull(),
}, (t) => [
  index('dms_perms_document_idx').on(t.documentId),
  index('dms_perms_subject_user_idx').on(t.subjectId),
  index('dms_perms_subject_role_idx').on(t.subjectRole),
  index('dms_perms_scope_idx').on(t.category, t.department),
  foreignKey({ columns: [t.documentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.subjectId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const dmsNumberingSequences = pgTable('dms_numbering_sequences', {
  id:          uuid('id').primaryKey().defaultRandom(),
  department:  dmsDepartmentEnum('department').notNull(),
  category:    dmsCategoryEnum('category').notNull(),
  year:        integer('year').notNull(),
  lastSeq:     integer('last_seq').notNull().default(0),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('dms_numbering_unique_uidx').on(t.department, t.category, t.year),
])

export const dmsFormTemplates = pgTable('dms_form_templates', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  documentId:         uuid('document_id').notNull().unique(),
  schemaJson:         jsonb('schema_json').notNull(),
  uiSchemaJson:       jsonb('ui_schema_json'),
  defaultLinkEntity:  dmsLinkEntityEnum('default_link_entity'),
  ...timestamps,
  createdBy:          uuid('created_by').notNull(),
}, (t) => [
  foreignKey({ columns: [t.documentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const dmsFormSubmissions = pgTable('dms_form_submissions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  formTemplateId:     uuid('form_template_id').notNull(),
  formVersionLabel:   varchar('form_version_label', { length: 20 }).notNull(),
  recordDocumentId:   uuid('record_document_id').notNull(),
  data:               jsonb('data').notNull(),
  linkedEntityType:   dmsLinkEntityEnum('linked_entity_type'),
  linkedEntityId:     uuid('linked_entity_id'),
  submittedAt:        timestamp('submitted_at').notNull().defaultNow(),
  submittedBy:        uuid('submitted_by').notNull(),
  ...timestamps,
}, (t) => [
  index('dms_submissions_template_idx').on(t.formTemplateId),
  index('dms_submissions_record_idx').on(t.recordDocumentId),
  index('dms_submissions_entity_idx').on(t.linkedEntityType, t.linkedEntityId),
  foreignKey({ columns: [t.formTemplateId], foreignColumns: [dmsFormTemplates.id] }),
  foreignKey({ columns: [t.recordDocumentId], foreignColumns: [dmsDocuments.id] }),
  foreignKey({ columns: [t.submittedBy], foreignColumns: [users.id] }),
])

export const portfolioSettings = pgTable('portfolio_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  isSingleton: boolean('is_singleton').notNull().default(true),
  companyTagline: text('company_tagline'),
  ceoName: varchar('ceo_name', { length: 255 }),
  ceoTitle: varchar('ceo_title', { length: 255 }),
  ceoPhotoCloudinaryId: uuid('ceo_photo_cloudinary_id'),
  companyAddress: text('company_address'),
  phone1: varchar('phone_1', { length: 50 }),
  phone2: varchar('phone_2', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  instagramHandle: varchar('instagram_handle', { length: 100 }),
  isoCertNumber: varchar('iso_cert_number', { length: 100 }),
  isoCertExpiry: date('iso_cert_expiry'),
  rseLabelLevel: varchar('rse_label_level', { length: 50 }),
  rseLabelExpiry: date('rse_label_expiry'),
  coverBackgroundColor: varchar('cover_background_color', { length: 7 }).notNull().default('#2D5A27'),
  accentColor: varchar('accent_color', { length: 7 }).notNull().default('#FFFFFF'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
}, (t) => [
  uniqueIndex('portfolio_settings_singleton_uidx').on(t.isSingleton),
  foreignKey({ columns: [t.ceoPhotoCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.updatedBy], foreignColumns: [users.id] }),
])

// ─── Risks & Opportunities (FOR-MI-07) ───────────────────────────────────────

export const risksOpportunities = pgTable('risks_opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 30 }).notNull().unique(),
  type: roTypeEnum('type').notNull(),
  category: roCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  context: text('context'),
  gravity: integer('gravity'),
  probability: integer('probability'),
  criticality: integer('criticality'),
  priority: integer('priority'),
  importance: integer('importance'),
  score: integer('score'),
  status: roStatusEnum('status').notNull().default('identified'),
  owner: text('owner'),
  targetDate: date('target_date'),
  closedAt: timestamp('closed_at'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('ro_type_idx').on(t.type),
  index('ro_status_idx').on(t.status),
  index('ro_category_idx').on(t.category),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const roActions = pgTable('ro_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roId: uuid('ro_id').notNull(),
  description: text('description').notNull(),
  responsible: text('responsible'),
  targetDate: date('target_date'),
  completedAt: timestamp('completed_at'),
  result: text('result'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('ro_actions_ro_idx').on(t.roId),
  foreignKey({ columns: [t.roId], foreignColumns: [risksOpportunities.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Stakeholders & Écoute Parties Intéressées (FOR-MI-08/09) ────────────────

export const stakeholders = pgTable('stakeholders', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  type: stakeholderTypeEnum('type').notNull(),
  needs: text('needs'),
  influence: integer('influence').notNull().default(1),
  interaction: integer('interaction').notNull().default(1),
  isPip: boolean('is_pip').notNull().default(false),
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('stakeholders_type_idx').on(t.type),
  index('stakeholders_pip_idx').on(t.isPip),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const stakeholderFeedback = pgTable('stakeholder_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  stakeholderId: uuid('stakeholder_id').notNull(),
  channel: feedbackChannelEnum('channel').notNull(),
  date: date('date').notNull(),
  summary: text('summary').notNull(),
  satisfactionScore: integer('satisfaction_score'),
  responseActions: text('response_actions'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('stakeholder_feedback_sh_idx').on(t.stakeholderId),
  foreignKey({ columns: [t.stakeholderId], foreignColumns: [stakeholders.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const staffSuggestions = pgTable('staff_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  dept: ncDeptEnum('dept').notNull(),
  suggestionText: text('suggestion_text').notNull(),
  responseText: text('response_text'),
  respondedAt: timestamp('responded_at'),
  respondedBy: uuid('responded_by'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('staff_suggestions_dept_idx').on(t.dept),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.respondedBy], foreignColumns: [users.id] }),
])

// ─── Regulatory Watch (LIS-MI-07) ────────────────────────────────────────────

export const regulatoryWatch = pgTable('regulatory_watch', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 50 }),
  title: varchar('title', { length: 500 }).notNull(),
  domain: varchar('domain', { length: 100 }),
  issuingBody: varchar('issuing_body', { length: 255 }),
  publicationDate: date('publication_date'),
  effectiveDate: date('effective_date'),
  status: regulatoryStatusEnum('status').notNull().default('applicable'),
  complianceNotes: text('compliance_notes'),
  nextReviewDate: date('next_review_date'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('regulatory_watch_status_idx').on(t.status),
  index('regulatory_watch_domain_idx').on(t.domain),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Waste Tracking (FOR-MI-11) ───────────────────────────────────────────────

export const wasteRecords = pgTable('waste_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  wasteType: wasteTypeEnum('waste_type').notNull(),
  quantityKg: real('quantity_kg'),
  disposal: wasteDisposalEnum('disposal').notNull(),
  contractor: varchar('contractor', { length: 255 }),
  cost: decimal('cost', { precision: 10, scale: 3 }),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('waste_records_year_month_idx').on(t.year, t.month),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── HSE Checklist (FOR-MI-12) ───────────────────────────────────────────────

export const hseChecklistItems = pgTable('hse_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const hseChecklistSubmissions = pgTable('hse_checklist_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  submittedDate: date('submitted_date').notNull(),
  dept: ncDeptEnum('dept').notNull(),
  overallStatus: hseSubmissionStatusEnum('overall_status').notNull(),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('hse_submissions_date_idx').on(t.submittedDate),
  index('hse_submissions_dept_idx').on(t.dept),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const hseChecklistAnswers = pgTable('hse_checklist_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').notNull(),
  itemId: uuid('item_id').notNull(),
  isCompliant: boolean('is_compliant'),
  comment: text('comment'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('hse_answers_submission_idx').on(t.submissionId),
  foreignKey({ columns: [t.submissionId], foreignColumns: [hseChecklistSubmissions.id] }),
  foreignKey({ columns: [t.itemId], foreignColumns: [hseChecklistItems.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Annual Management Plan (PLA-MI-01) ───────────────────────────────────────

export const managementPlanActivities = pgTable('management_plan_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  dept: ncDeptEnum('dept').notNull(),
  objective: text('objective').notNull(),
  action: text('action').notNull(),
  responsible: varchar('responsible', { length: 255 }),
  plannedWeeks: jsonb('planned_weeks'),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('mgmt_plan_year_idx').on(t.year),
  index('mgmt_plan_dept_idx').on(t.dept),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const managementPlanExecutions = pgTable('management_plan_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull(),
  week: integer('week').notNull(),
  year: integer('year').notNull(),
  status: planActivityStatusEnum('status').notNull().default('planifie'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('mgmt_exec_activity_idx').on(t.activityId),
  index('mgmt_exec_year_week_idx').on(t.year, t.week),
  foreignKey({ columns: [t.activityId], foreignColumns: [managementPlanActivities.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Communication Plan (PLA-MI-02) ───────────────────────────────────────────

export const communicationPlan = pgTable('communication_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  direction: communicationDirectionEnum('direction').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  target: varchar('target', { length: 255 }),
  channel: varchar('channel', { length: 255 }),
  frequency: varchar('frequency', { length: 100 }),
  responsible: varchar('responsible', { length: 255 }),
  plannedDate: date('planned_date'),
  doneAt: timestamp('done_at'),
  doneBy: uuid('done_by'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('comm_plan_year_idx').on(t.year),
  index('comm_plan_direction_idx').on(t.direction),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.doneBy], foreignColumns: [users.id] }),
])

// ─── Étude: Decorative Materials (FOR-ET-03) ─────────────────────────────────

export const decorativeMaterials = pgTable('decorative_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Identity
  code: varchar('code', { length: 30 }),                           // auto-generated ref
  name: varchar('name', { length: 255 }).notNull(),
  photoUrl: text('photo_url'),
  // 1. Description
  mainMaterial: varchar('main_material', { length: 255 }),
  aspect: varchar('aspect', { length: 255 }),                      // Aspect (de la roche…)
  color: varchar('color', { length: 100 }),
  // 2. Technical characteristics
  caliber: varchar('caliber', { length: 100 }),                    // Calibre
  waterAbsorption: varchar('water_absorption', { length: 100 }),
  packaging: varchar('packaging', { length: 255 }),                // Conditionnement
  // 3. Use
  usedInterior: boolean('used_interior').notNull().default(false),
  usedExterior: boolean('used_exterior').notNull().default(true),
  // 4–7 free text
  handling: text('handling'),                                      // Manutention
  packagingDetails: text('packaging_details'),                     // Conditionnement détail
  storageConditions: text('storage_conditions'),
  maintenance: text('maintenance'),                                // Entretien
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('decorative_materials_name_idx').on(t.name),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Étude: Phytosanitary Products (FOR-ET-05) ───────────────────────────────

export const phytosanitaryProductTypeEnum = pgEnum('phytosanitary_product_type', [
  'insecticide',
  'acaricide',
  'fongicide',
  'herbicide',
  'engrais',
  'autre',
])

export const phytosanitaryProducts = pgTable('phytosanitary_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 30 }),
  productType: phytosanitaryProductTypeEnum('product_type').notNull(),
  commercialName: varchar('commercial_name', { length: 255 }).notNull(),
  approvalNumber: varchar('approval_number', { length: 100 }),     // N° homologation
  activeIngredient: varchar('active_ingredient', { length: 255 }),
  formulation: varchar('formulation', { length: 255 }),
  concentration: varchar('concentration', { length: 100 }),
  usageDose: varchar('usage_dose', { length: 255 }),
  targetPests: text('target_pests'),                               // Dépredateurs
  targetCrop: varchar('target_crop', { length: 255 }),             // Culture
  reEntryDelay: varchar('re_entry_delay', { length: 100 }),        // Délai de rentrée
  technicalDocs: text('technical_docs'),
  packaging: varchar('packaging', { length: 255 }),
  toxicologicalClass: varchar('toxicological_class', { length: 100 }),
  ppe: text('ppe'),                                                // Équipements de protection
  storageConditions: text('storage_conditions'),
  preUseInstructions: text('pre_use_instructions'),
  duringUseInstructions: text('during_use_instructions'),
  wasteDisposal: text('waste_disposal'),
  photoUrl: text('photo_url'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('phytosanitary_type_idx').on(t.productType),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Étude: Project Study Record (FOR-ET-02 Fiche Projet) ────────────────────

export const projectStudyPhaseEnum = pgEnum('project_study_phase', [
  'avant_projet_sommaire',    // APS
  'avant_projet_detaille',    // APD
])

export const amenagementTypeEnum = pgEnum('amenagement_type', [
  'amenagement',
  'reamenagement',
  'autre',
])

export const projectStudyRecords = pgTable('project_study_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().unique(),
  // Header
  updatedDate: date('updated_date'),
  projectTitle: varchar('project_title', { length: 500 }),
  location: varchar('location', { length: 255 }),
  clientName: varchar('client_name', { length: 255 }),
  reference: varchar('reference', { length: 100 }),
  amenagementType: amenagementTypeEnum('amenagement_type'),        // Aménagement / Réaménagement / Autre
  projectDetails: text('project_details'),                         // Observations / notes complémentaires
  deadlineProposed: date('deadline_proposed'),
  // Documents received from client (jsonb array: {name, receivedDate, required, observation})
  documentsReceived: jsonb('documents_received').default([]),
  clientRequests: text('client_requests'),
  // Timeline
  durationPlannedDays: integer('duration_planned_days'),
  durationActualDays: integer('duration_actual_days'),
  startDatePlanned: date('start_date_planned'),
  startDateActual: date('start_date_actual'),
  endDatePlanned: date('end_date_planned'),
  endDateActual: date('end_date_actual'),
  // Phases (jsonb: [{phase, plannedDays, actualDays, progressState, validationMeans, validationDate, observations}])
  phases: jsonb('phases').default([]),
  // KPI FOR-ET-02: % of drought-resistant plants
  droughtResistantRate: decimal('drought_resistant_rate', { precision: 5, scale: 2 }),
  droughtResistantNote: text('drought_resistant_note'),           // Cause de non-atteinte
  // Responsible
  responsableEtude: varchar('responsable_etude', { length: 255 }),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('project_study_records_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ═══════════════════════════════════════════════════════════════════════════════
// ─── RH (Ressources Humaines) ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const contractTypeEnum = pgEnum('contract_type', [
  'cdi',
  'cdd',
  'civp',
  'stage',
  'interim',
  'autre',
])

export const leaveTypeEnum = pgEnum('leave_type', [
  'conge_annuel',
  'conge_maladie',
  'conge_maternite',
  'conge_paternite',
  'conge_sans_solde',
  'jour_ferie',
  'autre',
])

export const leaveStatusEnum = pgEnum('leave_status', [
  'en_attente',
  'approuve',
  'refuse',
  'annule',
])

export const trainingStatusEnum = pgEnum('training_status', [
  'planifie',
  'en_cours',
  'realise',
  'reporte',
  'annule',
])

export const recruitmentStatusEnum = pgEnum('recruitment_status', [
  'ouvert',
  'en_cours',
  'pourvu',
  'annule',
])

export const evaluationResultEnum = pgEnum('evaluation_result', [
  'tres_satisfaisant',
  'satisfaisant',
  'insuffisant',
  'tres_insuffisant',
])

// ─── RH: Job Positions / Fiches de poste (FOR-RH-08) ─────────────────────────

export const jobPositions = pgTable('job_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 30 }),                           // ex: FP-001
  title: varchar('title', { length: 255 }).notNull(),
  department: varchar('department', { length: 100 }),
  hierarchicalSuperior: varchar('hierarchical_superior', { length: 255 }),
  // Profil
  initialTraining: text('initial_training'),
  continuousTraining: text('continuous_training'),
  // Missions & attributions
  mainMissions: text('main_missions'),
  attributions: text('attributions'),
  // Critères d'évaluation
  indispensableCriteria: text('indispensable_criteria'),
  desirableCriteria: text('desirable_criteria'),
  // Work techniques (sub-criteria for FOR-RH-03)
  workTechniques: jsonb('work_techniques').default([]),             // [{label: string}]
  // Meta
  updatedDate: date('updated_date'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('job_positions_dept_idx').on(t.department),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Employee Profiles (extends users — LIS-RH-02) ───────────────────────
// Stores HR-specific fields that don't belong on the auth users table

export const employeeProfiles = pgTable('employee_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  // LIS-RH-02 fields
  matricule: varchar('matricule', { length: 50 }),
  cin: varchar('cin', { length: 20 }),
  matriculeCnss: varchar('matricule_cnss', { length: 50 }),
  familySituation: varchar('family_situation', { length: 50 }),    // célibataire, marié, …
  contractType: contractTypeEnum('contract_type'),
  contractStartDate: date('contract_start_date'),
  contractEndDate: date('contract_end_date'),
  jobPositionId: uuid('job_position_id'),
  jobTitle: varchar('job_title', { length: 255 }),                 // denormalized for speed
  hierarchicalSuperiorId: uuid('hierarchical_superior_id'),
  // Attendance KPIs (from LIS-RH-02)
  plannedDaysPerYear: integer('planned_days_per_year').default(220),
  // Leave balance (FOR-RH-43)
  leaveBalanceDays: decimal('leave_balance_days', { precision: 5, scale: 1 }).default('0'),
  leaveBalancePrevious: decimal('leave_balance_previous', { precision: 5, scale: 1 }).default('0'),
  // Integration
  integrationPilot: varchar('integration_pilot', { length: 255 }), // PLA-RH-01
  integrationStartDate: date('integration_start_date'),
  integrationEndDate: date('integration_end_date'),
  // Deputies (LIS-RH-01)
  deputyId: uuid('deputy_id'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('employee_profiles_user_id_idx').on(t.userId),
  index('employee_profiles_matricule_idx').on(t.matricule),
  foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.jobPositionId], foreignColumns: [jobPositions.id] }),
  foreignKey({ columns: [t.hierarchicalSuperiorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.deputyId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Recruitment Requests (FOR-RH-01) ────────────────────────────────────

export const recruitmentRequests = pgTable('recruitment_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  refCode: varchar('ref_code', { length: 30 }),                    // FOR-RH-01 ref
  jobPositionId: uuid('job_position_id'),
  postTitle: varchar('post_title', { length: 255 }).notNull(),
  requestingDept: varchar('requesting_dept', { length: 100 }),
  hierarchicalSuperior: varchar('hierarchical_superior', { length: 255 }),
  proposedStatus: varchar('proposed_status', { length: 50 }),      // Contractuel / Stage / CIVP
  reason: text('reason'),                                          // Motif
  studyLevel: varchar('study_level', { length: 255 }),
  studySpecialty: varchar('study_specialty', { length: 255 }),
  experienceDuration: varchar('experience_duration', { length: 100 }),
  mainMissions: text('main_missions'),
  requiredSkills: text('required_skills'),
  status: recruitmentStatusEnum('status').notNull().default('ouvert'),
  openedDate: date('opened_date'),
  closedDate: date('closed_date'),
  filledByUserId: uuid('filled_by_user_id'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('recruitment_status_idx').on(t.status),
  foreignKey({ columns: [t.jobPositionId], foreignColumns: [jobPositions.id] }),
  foreignKey({ columns: [t.filledByUserId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Training Sessions (PLA-RH-02 + FOR-RH-05) ──────────────────────────

export const trainingSessions = pgTable('training_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  refCode: varchar('ref_code', { length: 30 }),
  year: integer('year').notNull(),
  thematic: varchar('thematic', { length: 100 }),                  // RSE / QMS / Métiers…
  theme: varchar('theme', { length: 500 }).notNull(),
  requestedByUserId: uuid('requested_by_user_id'),
  requestedDate: date('requested_date'),
  objective: text('objective'),
  trainerName: varchar('trainer_name', { length: 255 }),
  trainingOrg: varchar('training_org', { length: 255 }),
  location: varchar('location', { length: 255 }),
  plannedStartDate: date('planned_start_date'),
  plannedEndDate: date('planned_end_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  status: trainingStatusEnum('status').notNull().default('planifie'),
  actionType: varchar('action_type', { length: 50 }),              // Réalisée / Reportée / Annulée
  hotEvalDate: date('hot_eval_date'),                              // FOR-RH-06 date
  coldEvalDate: date('cold_eval_date'),                            // FOR-RH-07 date
  // Participants stored as junction in training_participants
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('training_year_idx').on(t.year),
  index('training_status_idx').on(t.status),
  foreignKey({ columns: [t.requestedByUserId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Training Participants (FOR-RH-05 attendance) ───────────────────────

export const trainingParticipants = pgTable('training_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingSessionId: uuid('training_session_id').notNull(),
  userId: uuid('user_id').notNull(),
  attended: boolean('attended').notNull().default(true),
  // FOR-RH-06 hot eval
  hotEvalScore: decimal('hot_eval_score', { precision: 4, scale: 1 }),
  hotEvalNotes: text('hot_eval_notes'),
  // FOR-RH-07 cold eval
  coldEvalScore: decimal('cold_eval_score', { precision: 4, scale: 1 }),
  coldEvalNotes: text('cold_eval_notes'),
  coldEvalCompetencies: jsonb('cold_eval_competencies').default([]), // [{label, level, note}]
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('training_participants_session_idx').on(t.trainingSessionId),
  index('training_participants_user_idx').on(t.userId),
  foreignKey({ columns: [t.trainingSessionId], foreignColumns: [trainingSessions.id] }),
  foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Leave Requests (FOR-RH-14 + FOR-RH-43) ─────────────────────────────

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  leaveType: leaveTypeEnum('leave_type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  durationDays: decimal('duration_days', { precision: 5, scale: 1 }).notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').notNull().default('en_attente'),
  // Approvals
  supervisorApproval: leaveStatusEnum('supervisor_approval'),
  supervisorApprovedBy: uuid('supervisor_approved_by'),
  supervisorApprovedAt: timestamp('supervisor_approved_at'),
  supervisorNote: text('supervisor_note'),
  rhApproval: leaveStatusEnum('rh_approval'),
  rhApprovedBy: uuid('rh_approved_by'),
  rhApprovedAt: timestamp('rh_approved_at'),
  directionApproval: leaveStatusEnum('direction_approval'),
  directionApprovedBy: uuid('direction_approved_by'),
  directionApprovedAt: timestamp('direction_approved_at'),
  // Leave balance snapshot at time of request
  balanceBeforeDays: decimal('balance_before_days', { precision: 5, scale: 1 }),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('leave_requests_user_idx').on(t.userId),
  index('leave_requests_status_idx').on(t.status),
  index('leave_requests_date_idx').on(t.startDate),
  foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.supervisorApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.rhApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.directionApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Exit Authorizations (FOR-RH-15) ─────────────────────────────────────

export const exitAuthorizations = pgTable('exit_authorizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  durationHours: decimal('duration_hours', { precision: 4, scale: 1 }),
  reason: text('reason'),
  status: leaveStatusEnum('status').notNull().default('en_attente'),
  supervisorApproval: leaveStatusEnum('supervisor_approval'),
  supervisorApprovedBy: uuid('supervisor_approved_by'),
  rhApproval: leaveStatusEnum('rh_approval'),
  rhApprovedBy: uuid('rh_approved_by'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('exit_auth_user_idx').on(t.userId),
  index('exit_auth_date_idx').on(t.startTime),
  foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.supervisorApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.rhApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Performance Evaluations (FOR-RH-03) ─────────────────────────────────

export const performanceEvaluations = pgTable('performance_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),                               // évalué
  evaluatorId: uuid('evaluator_id').notNull(),                     // supérieur hiérarchique
  evaluationDate: date('evaluation_date').notNull(),
  // Context
  currentPosition: varchar('current_position', { length: 255 }),
  seniorityCompany: varchar('seniority_company', { length: 50 }),
  seniorityPosition: varchar('seniority_position', { length: 50 }),
  // Scores (1=TI, 2=I, 3=S, 4=TS) per category
  // 1. Work techniques (from fiche de poste sub-criteria)
  workTechniquesCriteria: jsonb('work_techniques_criteria').default([]), // [{label, score, desired}]
  workTechniquesScore: decimal('work_techniques_score', { precision: 4, scale: 2 }),
  workTechniquesDesired: decimal('work_techniques_desired', { precision: 4, scale: 2 }),
  // 2. Discipline
  attendanceScore: decimal('attendance_score', { precision: 4, scale: 2 }),
  rigorScore: decimal('rigor_score', { precision: 4, scale: 2 }),
  disciplineScore: decimal('discipline_score', { precision: 4, scale: 2 }),
  disciplineDesired: decimal('discipline_desired', { precision: 4, scale: 2 }),
  // 3. Quality
  improvementScore: decimal('improvement_score', { precision: 4, scale: 2 }),
  smqRespectScore: decimal('smq_respect_score', { precision: 4, scale: 2 }),
  riskAnalysisScore: decimal('risk_analysis_score', { precision: 4, scale: 2 }),
  qualityScore: decimal('quality_score', { precision: 4, scale: 2 }),
  qualityDesired: decimal('quality_desired', { precision: 4, scale: 2 }),
  // 4. Integration
  communicationScore: decimal('communication_score', { precision: 4, scale: 2 }),
  teamworkScore: decimal('teamwork_score', { precision: 4, scale: 2 }),
  managementScore: decimal('management_score', { precision: 4, scale: 2 }),
  learningScore: decimal('learning_score', { precision: 4, scale: 2 }),
  integrationScore: decimal('integration_score', { precision: 4, scale: 2 }),
  integrationDesired: decimal('integration_desired', { precision: 4, scale: 2 }),
  // Final
  globalScore: decimal('global_score', { precision: 4, scale: 2 }),
  globalScorePct: decimal('global_score_pct', { precision: 5, scale: 2 }),
  previousScore: decimal('previous_score', { precision: 4, scale: 2 }),
  // Needs & actions (jsonb: [{action, deadline, responsible}])
  evalueeNeeds: text('evaluee_needs'),
  trainingActions: jsonb('training_actions').default([]),
  nextObjectives: text('next_objectives'),
  remarks: text('remarks'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('perf_eval_user_idx').on(t.userId),
  index('perf_eval_date_idx').on(t.evaluationDate),
  foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.evaluatorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Integration Plans (PLA-RH-01) ───────────────────────────────────────

export const integrationPlans = pgTable('integration_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  pilotId: uuid('pilot_id'),
  plannedStartDate: date('planned_start_date'),
  plannedEndDate: date('planned_end_date'),
  // Items: jsonb [{theme, responsible, plannedDate, actualDate, status, comment}]
  items: jsonb('items').default([]),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('integration_plan_user_idx').on(t.userId),
  foreignKey({ columns: [t.userId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.pilotId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── RH: Attendance Sheets (FOR-RH-13) ───────────────────────────────────────

export const attendanceSheets = pgTable('attendance_sheets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull(),
  month:          integer('month').notNull(),
  year:           integer('year').notNull(),
  entries:        jsonb('entries').default([]).notNull(),
  daysWorked:     integer('days_worked'),
  salaryAdvance:  decimal('salary_advance', { precision: 10, scale: 3 }),
  supervisorId:   uuid('supervisor_id'),
  notes:          text('notes'),
  ...timestamps,
  createdBy:      uuid('created_by').notNull(),
}, (t) => [
  index('attendance_user_month_idx').on(t.userId, t.month, t.year),
  foreignKey({ columns: [t.userId],       foreignColumns: [users.id] }),
  foreignKey({ columns: [t.supervisorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy],    foreignColumns: [users.id] }),
])

// ─── RH: Mission Orders (FOR-RH-41) ──────────────────────────────────────────

export const missionOrders = pgTable('mission_orders', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull(),
  cinNumber:       varchar('cin_number', { length: 20 }),
  cinIssuedAt:     varchar('cin_issued_at', { length: 100 }),
  destination:     text('destination'),
  missionPurpose:  text('mission_purpose'),
  startDate:       date('start_date'),
  endDate:         date('end_date'),
  status:          varchar('status', { length: 20 }).notNull().default('draft'),
  gmApprovedAt:    timestamp('gm_approved_at'),
  gmApprovedBy:    uuid('gm_approved_by'),
  rhApprovedAt:    timestamp('rh_approved_at'),
  rhApprovedBy:    uuid('rh_approved_by'),
  deletedAt:       timestamp('deleted_at'),
  ...timestamps,
  createdBy:       uuid('created_by').notNull(),
}, (t) => [
  index('mission_order_user_idx').on(t.userId),
  foreignKey({ columns: [t.userId],       foreignColumns: [users.id] }),
  foreignKey({ columns: [t.gmApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.rhApprovedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy],    foreignColumns: [users.id] }),
])

// ─── RH: Equipment Receipts (FOR-RH-28) ──────────────────────────────────────

export const equipmentReceipts = pgTable('equipment_receipts', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull(),
  issuedDate:     date('issued_date'),
  items:          jsonb('items').default([]).notNull(),
  deliveredBy:    uuid('delivered_by'),
  returnedDate:   date('returned_date'),
  returnedNotes:  text('returned_notes'),
  deletedAt:      timestamp('deleted_at'),
  ...timestamps,
  createdBy:      uuid('created_by').notNull(),
}, (t) => [
  index('equipment_receipt_user_idx').on(t.userId),
  foreignKey({ columns: [t.userId],      foreignColumns: [users.id] }),
  foreignKey({ columns: [t.deliveredBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy],   foreignColumns: [users.id] }),
])

// ─── RH: Personnel File Checklists (FOR-RH-34) ───────────────────────────────

export const personnelFileChecklists = pgTable('personnel_file_checklists', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  userId:                uuid('user_id').notNull().unique(),
  hasCin:                boolean('has_cin').default(false),
  hasBirthCertificate:   boolean('has_birth_certificate').default(false),
  hasPhotos:             boolean('has_photos').default(false),
  hasInfoSheet:          boolean('has_info_sheet').default(false),
  hasBulletin3:          boolean('has_bulletin3').default(false),
  hasCnss:               boolean('has_cnss').default(false),
  hasRib:                boolean('has_rib').default(false),
  hasMedicalCert:        boolean('has_medical_cert').default(false),
  hasDiplomas:           boolean('has_diplomas').default(false),
  hasPrevPayslip:        boolean('has_prev_payslip').default(false),
  hasDriversLicense:     boolean('has_drivers_license').default(false),
  hasPrevEmploymentCert: boolean('has_prev_employment_cert').default(false),
  supervisorId:          uuid('supervisor_id'),
  rhSignedAt:            timestamp('rh_signed_at'),
  supervisorSignedAt:    timestamp('supervisor_signed_at'),
  employeeSignedAt:      timestamp('employee_signed_at'),
  notes:                 text('notes'),
  ...timestamps,
  createdBy:             uuid('created_by').notNull(),
}, (t) => [
  foreignKey({ columns: [t.userId],       foreignColumns: [users.id] }),
  foreignKey({ columns: [t.supervisorId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy],    foreignColumns: [users.id] }),
])

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Réalisation Forms ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// FOR-RE-03 Équipe projet — team members assigned to a project during réalisation
export const projectTeamMembers = pgTable('project_team_members', {
  id:               uuid('id').primaryKey().defaultRandom(),
  projectId:        uuid('project_id').notNull(),
  // Role/poste on the project (Project Manager, Site Manager, Gardener, etc.)
  poste:            varchar('poste', { length: 255 }).notNull(),
  titulaire:        varchar('titulaire', { length: 255 }),
  suppleant:        varchar('suppleant', { length: 255 }),
  isSubcontractor:  boolean('is_subcontractor').notNull().default(false),
  subcontractorName: varchar('subcontractor_name', { length: 255 }),
  // Linked internal user (optional)
  userId:           uuid('user_id'),
  // Phase assignment period
  phaseStartDate:   date('phase_start_date'),
  phaseEndDate:     date('phase_end_date'),
  sortOrder:        integer('sort_order').notNull().default(0),
  ...timestamps,
  createdBy:        uuid('created_by').notNull(),
}, (t) => [
  index('project_team_members_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.userId],     foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// FOR-RE-04 Fiche de suivi journalier de chantier — daily site journal
export const chantierDailyLogs = pgTable('chantier_daily_logs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  projectId:        uuid('project_id').notNull(),
  logDate:          date('log_date').notNull(),
  dayNumber:        integer('day_number'),
  totalProgress:    decimal('total_progress', { precision: 5, scale: 2 }), // 0–100 %
  // Travaux du jour / retard
  worksDoneToday:   text('works_done_today'),
  // Approvisionnement
  supplies:         text('supplies'),
  // Anomalie / réclamation
  anomalies:        text('anomalies'),
  // Participants (jsonb: [{name, role}])
  participants:     jsonb('participants').default([]),
  // Autres intervenants
  otherIntervenants: text('other_intervenants'),
  // Remarks / RMQ
  remarks:          text('remarks'),
  // Ordre du jour / agenda for next day
  nextDayAgenda:    text('next_day_agenda'),
  chefProjet:       varchar('chef_projet', { length: 255 }),
  ...timestamps,
  createdBy:        uuid('created_by').notNull(),
}, (t) => [
  index('chantier_daily_logs_project_id_idx').on(t.projectId),
  index('chantier_daily_logs_date_idx').on(t.logDate),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// PLA-RE-03 Plan d'action de projet de réalisation — structured work phase tracking
export const realisationActionPlanItems = pgTable('realisation_action_plan_items', {
  id:               uuid('id').primaryKey().defaultRandom(),
  projectId:        uuid('project_id').notNull(),
  // Hierarchical phase numbering (e.g. "I", "I.1", "II", "II.3.1")
  phaseCode:        varchar('phase_code', { length: 50 }).notNull(),
  phaseLabel:       varchar('phase_label', { length: 500 }).notNull(),
  // Dates prévu / réalisé
  plannedStartDate: date('planned_start_date'),
  plannedEndDate:   date('planned_end_date'),
  actualStartDate:  date('actual_start_date'),
  actualEndDate:    date('actual_end_date'),
  // Progression 0–100
  progressPct:      integer('progress_pct').notNull().default(0),
  // Notes / observations
  observations:     text('observations'),
  sortOrder:        integer('sort_order').notNull().default(0),
  isPhaseHeader:    boolean('is_phase_header').notNull().default(false),
  ...timestamps,
  createdBy:        uuid('created_by').notNull(),
}, (t) => [
  index('realisation_action_plan_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── FOR-RE-05: PV de réception provisoire ────────────────────────────────────
// Provisional acceptance checklist — signed by client and project manager

export const pvReceptionProvisoire = pgTable('pv_reception_provisoire', {
  id:                uuid('id').primaryKey().defaultRandom(),
  projectId:         uuid('project_id').notNull().unique(),
  date:              date('date'),
  maitreOuvrage:     varchar('maitre_ouvrage', { length: 255 }),
  startDate:         date('start_date'),
  endDate:           date('end_date'),
  // Checklist items: [{designation, observation, decision, action, responsable, delai, reserve}]
  checklistItems:    jsonb('checklist_items').default([]),
  // Signatories: [{name, role, organisation, signed, signedDate}]
  signatories:       jsonb('signatories').default([]),
  reserves:          text('reserves'),                    // Free-text reserve description
  hasReserves:       boolean('has_reserves').default(false),
  isFinalized:       boolean('is_finalized').default(false),
  ...timestamps,
  createdBy:         uuid('created_by').notNull(),
}, (t) => [
  index('pv_reception_provisoire_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── FOR-RE-14: PV de réception définitive ────────────────────────────────────
// Final acceptance — supersedes the provisional PV

export const pvReceptionDefinitive = pgTable('pv_reception_definitive', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  projectId:                uuid('project_id').notNull().unique(),
  date:                     date('date'),
  titulaireDuMarche:        varchar('titulaire_du_marche', { length: 255 }),
  dateApprobationMarche:    date('date_approbation_marche'),
  delaiExecution:           varchar('delai_execution', { length: 100 }),
  dateDebutTravaux:         date('date_debut_travaux'),
  dateFinTravaux:           date('date_fin_travaux'),
  // Signatories array: [{name, organisation, signed, signedDate}]
  signatories:              jsonb('signatories').default([]),
  attestationText:          text('attestation_text'),     // Custom inspection notes
  isFinalized:              boolean('is_finalized').default(false),
  ...timestamps,
  createdBy:                uuid('created_by').notNull(),
}, (t) => [
  index('pv_reception_definitive_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── FOR-RE-13: Attachement + FOR-RE-15: Décompte ─────────────────────────────
// Shared line-item structure used by both forms.
// Attachement = work certificate (qty/unit/norm, no price)
// Décompte    = payment statement (qty/unit/norm + unit price + total + TVA)

export const realisationLineItems = pgTable('realisation_line_items', {
  id:              uuid('id').primaryKey().defaultRandom(),
  projectId:       uuid('project_id').notNull(),
  documentType:    varchar('document_type', { length: 20 }).notNull(), // 'attachement' | 'decompte'
  phaseCode:       varchar('phase_code', { length: 50 }).notNull(),    // 'I', 'I.1', 'II', etc.
  phaseLabel:      varchar('phase_label', { length: 500 }).notNull(),
  designation:     varchar('designation', { length: 500 }),
  quantity:        decimal('quantity', { precision: 10, scale: 3 }),
  unit:            varchar('unit', { length: 50 }),
  norme:           varchar('norme', { length: 255 }),
  // Décompte-only pricing fields
  unitPriceHtva:   decimal('unit_price_htva', { precision: 12, scale: 3 }),
  totalHtva:       decimal('total_htva', { precision: 12, scale: 3 }),
  observation:     text('observation'),
  sortOrder:       integer('sort_order').notNull().default(0),
  isPhaseHeader:   boolean('is_phase_header').notNull().default(false),
  ...timestamps,
  createdBy:       uuid('created_by').notNull(),
}, (t) => [
  index('realisation_line_items_project_id_idx').on(t.projectId),
  index('realisation_line_items_doc_type_idx').on(t.documentType),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── PLA-RE-04: Plan d'action mensuel d'entretien ─────────────────────────────
// Monthly maintenance action plan — per-task checklist with frequency/tools

export const maintenanceMonthlyPlans = pgTable('maintenance_monthly_plans', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  projectId:           uuid('project_id').notNull(),
  scheduleId:          uuid('schedule_id'),
  moisAnnee:           varchar('mois_annee', { length: 20 }).notNull(), // 'YYYY-MM'
  nombreInterventions: integer('nombre_interventions'),
  // Tasks array: [{taskLabel, frequency, prevu, realise, outil, observation}]
  tasks:               jsonb('tasks').default([]),
  // Fournitures/équipements
  fournitures:         text('fournitures'),
  // Client feedback section
  clientIntervenants:  text('client_intervenants'),
  clientObservations:  text('client_observations'),
  clientBesoins:       text('client_besoins'),
  // Signatures
  pmSignedDate:        date('pm_signed_date'),
  clientSignedDate:    date('client_signed_date'),
  isFinalized:         boolean('is_finalized').default(false),
  ...timestamps,
  createdBy:           uuid('created_by').notNull(),
}, (t) => [
  index('maintenance_monthly_plans_project_id_idx').on(t.projectId),
  index('maintenance_monthly_plans_mois_idx').on(t.moisAnnee),
  foreignKey({ columns: [t.projectId],   foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.scheduleId],  foreignColumns: [maintenanceSchedules.id] }),
  foreignKey({ columns: [t.createdBy],   foreignColumns: [users.id] }),
])

// ─── PLA-RE-01: Planning annuel d'entretien ───────────────────────────────────
// Annual maintenance planning — one row per contract with monthly schedule

export const maintenanceAnnualPlans = pgTable('maintenance_annual_plans', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  projectId:           uuid('project_id').notNull(),
  scheduleId:          uuid('schedule_id'),
  annee:               integer('annee').notNull(),
  updatedDate:         date('updated_date'),
  taciteReconduction:  boolean('tacite_reconduction').default(false),
  majorationTaux:      decimal('majoration_taux', { precision: 5, scale: 2 }),
  // Monthly data: [{month: 1..12, frequence, jours, nbrePrevu, nbreRealise}]
  monthlyData:         jsonb('monthly_data').default([]),
  // Totals (computed client-side but stored for reporting)
  totalInterventionsContractuelles: integer('total_interventions_contractuelles'),
  totalInterventionsPrevues:        integer('total_interventions_prevues'),
  totalInterventionsRealisees:      integer('total_interventions_realisees'),
  montantContrat:      decimal('montant_contrat', { precision: 12, scale: 3 }),
  montantPrevu:        decimal('montant_prevu', { precision: 12, scale: 3 }),
  montantFacture:      decimal('montant_facture', { precision: 12, scale: 3 }),
  ...timestamps,
  createdBy:           uuid('created_by').notNull(),
}, (t) => [
  index('maintenance_annual_plans_project_id_idx').on(t.projectId),
  index('maintenance_annual_plans_annee_idx').on(t.annee),
  foreignKey({ columns: [t.projectId],   foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.scheduleId],  foreignColumns: [maintenanceSchedules.id] }),
  foreignKey({ columns: [t.createdBy],   foreignColumns: [users.id] }),
])

// ─── PLA-RE-02: Planning hebdomadaire de projets ──────────────────────────────
// Weekly schedule — team assignments per project per day

export const weeklyProjectPlans = pgTable('weekly_project_plans', {
  id:              uuid('id').primaryKey().defaultRandom(),
  region:          varchar('region', { length: 100 }),
  chefEquipe:      varchar('chef_equipe', { length: 255 }),
  weekStartDate:   date('week_start_date').notNull(),
  weekEndDate:     date('week_end_date').notNull(),
  // Rows: [{equipe, lundi, mardi, mercredi, jeudi, vendredi, samedi, realise, causeNon, suivi}]
  // Each day field holds projectId or project name
  rows:            jsonb('rows').default([]),
  nombreActionsPrevues:  integer('nombre_actions_prevues'),
  pourcentageRealisation: decimal('pourcentage_realisation', { precision: 5, scale: 2 }),
  ...timestamps,
  createdBy:       uuid('created_by').notNull(),
}, (t) => [
  index('weekly_project_plans_week_idx').on(t.weekStartDate),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── PLA-RE-05: Planning Gantt de réalisation ────────────────────────────────
// Per-project Gantt chart with 12 phases × PR/RE weekly bars

export const realisationGantt = pgTable('realisation_gantt', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  projectId:              uuid('project_id').notNull().unique(),
  // Header metadata
  localisation:           varchar('localisation', { length: 255 }),
  projectManager:         varchar('project_manager', { length: 255 }),
  dateDemarragePrevu:     date('date_demarrage_prevu'),
  dateDemarrageReel:      date('date_demarrage_reel'),
  dateFinPrevue:          date('date_fin_prevue'),
  dateFinReelle:          date('date_fin_reelle'),
  dateMaj:                date('date_maj'),
  // Gantt rows JSONB: [{rowId, label, type: 'phase'|'activity'|'subactivity', phaseNum, activityNum, prWeeks: number[], reWeeks: number[]}]
  // prWeeks / reWeeks: array of 48 week indices (0-47) that are marked
  ganttRows:              jsonb('gantt_rows').default([]),
  ...timestamps,
  createdBy:              uuid('created_by').notNull(),
}, (t) => [
  index('realisation_gantt_project_id_idx').on(t.projectId),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── FOR-RE-07 to -12: Check-lists qualité réalisation ────────────────────────
// Per-project quality checklists — one row per checklist type

export const realisationChecklists = pgTable('realisation_checklists', {
  id:           uuid('id').primaryKey().defaultRandom(),
  projectId:    uuid('project_id').notNull(),
  // 'travaux_preliminaires' | 'reseaux_maconnerie' | 'plantations' | 'engazonnement' | 'matiere_decorative' | 'fourniture_plantes'
  checklistType: varchar('checklist_type', { length: 50 }).notNull(),
  // Items: [{itemId, label, checked: boolean, observation: string, phase?: string}]
  items:         jsonb('items').default([]),
  signedByName:  varchar('signed_by_name', { length: 255 }),
  signedDate:    date('signed_date'),
  isFinalized:   boolean('is_finalized').default(false),
  ...timestamps,
  createdBy:     uuid('created_by').notNull(),
}, (t) => [
  index('realisation_checklists_project_id_idx').on(t.projectId),
  index('realisation_checklists_type_idx').on(t.checklistType),
  foreignKey({ columns: [t.projectId],  foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy],  foreignColumns: [users.id] }),
])

// ─── RH: Substitutes (LIS-RH-01) ─────────────────────────────────────────────

export const substitutes = pgTable('substitutes', {
  id:                uuid('id').primaryKey().defaultRandom(),
  positionLabel:     varchar('position_label', { length: 255 }).notNull(),
  holderUserId:      uuid('holder_user_id'),
  substituteUserId:  uuid('substitute_user_id'),
  updatedDate:       date('updated_date'),
  isActive:          boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy:         uuid('created_by').notNull(),
}, (t) => [
  foreignKey({ columns: [t.holderUserId],     foreignColumns: [users.id] }),
  foreignKey({ columns: [t.substituteUserId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy],        foreignColumns: [users.id] }),
])
