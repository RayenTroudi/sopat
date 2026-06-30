import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
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
  auditeeResponsible: text('auditee_responsible'), // Department head being audited
  scheduledDate: timestamp('scheduled_date'),
  actualDate: timestamp('actual_date'),
  status: auditProgramStatusEnum('status').notNull().default('planifie'),
  scope: text('scope'),                            // Périmètre d'audit
  objectives: text('objectives'),                  // Objectifs
  criteria: text('criteria'),                      // Critères (ISO 9001 clauses)
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
  processCode: varchar('process_code', { length: 20 }),  // e.g. AC, ET, RE1
  clauseRef: varchar('clause_ref', { length: 50 }),      // ISO 9001 clause (e.g. 8.4.1)
  question: text('question').notNull(),
  response: text('response'),
  conformity: varchar('conformity', { length: 10 }),     // C / NC / NA / PO (Piste d'amélioration)
  evidence: text('evidence'),
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
