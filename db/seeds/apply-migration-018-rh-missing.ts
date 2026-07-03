import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  // attendance_sheets — FOR-RH-13 fiche de pointage
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS attendance_sheets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      month integer NOT NULL,
      year integer NOT NULL,
      entries jsonb NOT NULL DEFAULT '[]'::jsonb,
      days_worked integer,
      salary_advance numeric(10,3),
      supervisor_id uuid REFERENCES users(id),
      notes text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id),
      UNIQUE(user_id, month, year)
    )
  `)

  // mission_orders — FOR-RH-41 ordre de mission
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mission_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      cin_number varchar(20),
      cin_issued_at varchar(100),
      destination text,
      mission_purpose text,
      start_date date,
      end_date date,
      status varchar(20) NOT NULL DEFAULT 'draft',
      gm_approved_at timestamp,
      gm_approved_by uuid REFERENCES users(id),
      rh_approved_at timestamp,
      rh_approved_by uuid REFERENCES users(id),
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // equipment_receipts — FOR-RH-28 reçu de matériel de travail
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS equipment_receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      issued_date date,
      items jsonb NOT NULL DEFAULT '[]'::jsonb,
      delivered_by uuid REFERENCES users(id),
      returned_date date,
      returned_notes text,
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // personnel_file_checklists — FOR-RH-34
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS personnel_file_checklists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id),
      has_cin boolean DEFAULT false,
      has_birth_certificate boolean DEFAULT false,
      has_photos boolean DEFAULT false,
      has_info_sheet boolean DEFAULT false,
      has_bulletin3 boolean DEFAULT false,
      has_cnss boolean DEFAULT false,
      has_rib boolean DEFAULT false,
      has_medical_cert boolean DEFAULT false,
      has_diplomas boolean DEFAULT false,
      has_prev_payslip boolean DEFAULT false,
      has_drivers_license boolean DEFAULT false,
      has_prev_employment_cert boolean DEFAULT false,
      supervisor_id uuid REFERENCES users(id),
      rh_signed_at timestamp,
      supervisor_signed_at timestamp,
      employee_signed_at timestamp,
      notes text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // substitutes — LIS-RH-01
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS substitutes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      position_label varchar(255) NOT NULL,
      holder_user_id uuid REFERENCES users(id),
      substitute_user_id uuid REFERENCES users(id),
      updated_date date,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // extend training_participants — FOR-RH-06/07 full criteria
  await db.execute(sql`
    ALTER TABLE training_participants
      ADD COLUMN IF NOT EXISTS hot_eval_criteria jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS hot_eval_total integer,
      ADD COLUMN IF NOT EXISTS hot_eval_appreciation text,
      ADD COLUMN IF NOT EXISTS cold_eval_objectives text,
      ADD COLUMN IF NOT EXISTS cold_eval_decision text,
      ADD COLUMN IF NOT EXISTS cold_eval_action_plan jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS attendance_dates jsonb DEFAULT '[]'::jsonb
  `)

  console.log('Migration 018 applied: missing RH tables created')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
