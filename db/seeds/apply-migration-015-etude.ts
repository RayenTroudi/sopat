import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  // New enum: phytosanitary_product_type
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE phytosanitary_product_type AS ENUM(
        'insecticide','acaricide','fongicide','herbicide','engrais','autre'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  // New enum: project_study_phase
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE project_study_phase AS ENUM(
        'avant_projet_sommaire','avant_projet_detaille'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  // Extend plant_species with LIS-ET-03 fields
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS lis_code varchar(30)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS is_caducous boolean`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS is_toxic boolean`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS has_spines boolean`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS has_flowers boolean`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS flower_color varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS flowering_period varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS has_fruit boolean`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS fruiting_period varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS adapted_environment text`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS diseases text`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS height_adult_min numeric(5,2)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS height_adult_max numeric(5,2)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS diameter_adult_min numeric(5,2)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS diameter_adult_max numeric(5,2)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS storage_exposure varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS storage_place varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS planting_period varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS soil_type varchar(255)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS planting_exposure varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS watering_cold varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS watering_hot varchar(100)`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS pruning text`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS phytosanitary_treatment text`)
  await db.execute(sql`ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS photo_url text`)

  // Create decorative_materials table (FOR-ET-03)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS decorative_materials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(30),
      name varchar(255) NOT NULL,
      photo_url text,
      main_material varchar(255),
      aspect varchar(255),
      color varchar(100),
      caliber varchar(100),
      water_absorption varchar(100),
      packaging varchar(255),
      used_interior boolean NOT NULL DEFAULT false,
      used_exterior boolean NOT NULL DEFAULT true,
      handling text,
      packaging_details text,
      storage_conditions text,
      maintenance text,
      notes text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // Create phytosanitary_products table (FOR-ET-05)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS phytosanitary_products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(30),
      product_type phytosanitary_product_type NOT NULL,
      commercial_name varchar(255) NOT NULL,
      approval_number varchar(100),
      active_ingredient varchar(255),
      formulation varchar(255),
      concentration varchar(100),
      usage_dose varchar(255),
      target_pests text,
      target_crop varchar(255),
      re_entry_delay varchar(100),
      technical_docs text,
      packaging varchar(255),
      toxicological_class varchar(100),
      ppe text,
      storage_conditions text,
      pre_use_instructions text,
      during_use_instructions text,
      waste_disposal text,
      photo_url text,
      notes text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // Create project_study_records table (FOR-ET-02)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS project_study_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL UNIQUE REFERENCES projects(id),
      updated_date date,
      project_title varchar(500),
      location varchar(255),
      client_name varchar(255),
      reference varchar(100),
      project_details text,
      deadline_proposed date,
      documents_received jsonb DEFAULT '[]'::jsonb,
      client_requests text,
      duration_planned_days integer,
      duration_actual_days integer,
      start_date_planned date,
      start_date_actual date,
      end_date_planned date,
      end_date_actual date,
      phases jsonb DEFAULT '[]'::jsonb,
      drought_resistant_rate numeric(5,2),
      drought_resistant_note text,
      responsable_etude varchar(255),
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  console.log('Migration 015 applied: Étude tables created')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
