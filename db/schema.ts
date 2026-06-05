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
  jsonb,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'

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
  'residential',
  'commercial',
  'public',
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
  'other',
])

export const ncStatusEnum = pgEnum('nc_status', [
  'open',
  'in_progress',
  'closed',
  'verified',
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
  'pepiniere',
  'materiaux',
  'equipements',
  'produits_phytosanitaires',
  'logistique',
  'autre',
])

export const supplierStatusEnum = pgEnum('supplier_status', [
  'approuve',
  'en_evaluation',
  'suspendu',
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
  name: varchar('name', { length: 255 }).notNull(),
  category: supplierCategoryEnum('category').notNull().default('autre'),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  isoStatus: supplierStatusEnum('iso_status').notNull().default('en_evaluation'),
  evaluationScore: integer('evaluation_score'),
  lastAuditDate: timestamp('last_audit_date'),
  contractAssetId: uuid('contract_asset_id'),
  // kept for backwards compat — derived from isoStatus
  isoApproved: boolean('iso_approved').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
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
  score: integer('score').notNull(),
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
  notes: text('notes'),
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
  processAffected: phaseEnum('process_affected').notNull(),
  description: text('description').notNull(),
  rootCause: text('root_cause'),
  assignedTo: uuid('assigned_to'),
  deadline: timestamp('deadline'),
  status: ncStatusEnum('status').notNull().default('open'),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by'),
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
  deadline: timestamp('deadline'),
  evidenceAssetId: uuid('evidence_asset_id'),
  status: capaStatusEnum('status').notNull().default('open'),
  effectivenessVerified: boolean('effectiveness_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by'),
  closedAt: timestamp('closed_at'),
  notes: text('notes'),
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

// ─── Maintenance Schedules ────────────────────────────────────────────────────

export const maintenanceSchedules = pgTable('maintenance_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  contractAssetId: uuid('contract_asset_id'),
  contractStartDate: timestamp('contract_start_date'),
  contractEndDate: timestamp('contract_end_date'),
  visitFrequency: varchar('visit_frequency', { length: 50 }),
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
  visitType: visitTypeEnum('visit_type').notNull(),
  durationHours: decimal('duration_hours', { precision: 5, scale: 2 }),
  teamMemberId: uuid('team_member_id').notNull(),
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
