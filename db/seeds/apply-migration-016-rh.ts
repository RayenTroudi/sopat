import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  // Enums
  const enums = [
    `DO $$ BEGIN CREATE TYPE contract_type AS ENUM('cdi','cdd','civp','stage','interim','autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE leave_type AS ENUM('conge_annuel','conge_maladie','conge_maternite','conge_paternite','conge_sans_solde','jour_ferie','autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE leave_status AS ENUM('en_attente','approuve','refuse','annule'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE training_status AS ENUM('planifie','en_cours','realise','reporte','annule'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE recruitment_status AS ENUM('ouvert','en_cours','pourvu','annule'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN CREATE TYPE evaluation_result AS ENUM('tres_satisfaisant','satisfaisant','insuffisant','tres_insuffisant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  ]
  for (const e of enums) await db.execute(sql.raw(e))

  // job_positions
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS job_positions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(30),
      title varchar(255) NOT NULL,
      department varchar(100),
      hierarchical_superior varchar(255),
      initial_training text,
      continuous_training text,
      main_missions text,
      attributions text,
      indispensable_criteria text,
      desirable_criteria text,
      work_techniques jsonb DEFAULT '[]'::jsonb,
      updated_date date,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // employee_profiles
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employee_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id),
      matricule varchar(50),
      cin varchar(20),
      matricule_cnss varchar(50),
      family_situation varchar(50),
      contract_type contract_type,
      contract_start_date date,
      contract_end_date date,
      job_position_id uuid REFERENCES job_positions(id),
      job_title varchar(255),
      hierarchical_superior_id uuid REFERENCES users(id),
      planned_days_per_year integer DEFAULT 220,
      leave_balance_days numeric(5,1) DEFAULT 0,
      leave_balance_previous numeric(5,1) DEFAULT 0,
      integration_pilot varchar(255),
      integration_start_date date,
      integration_end_date date,
      deputy_id uuid REFERENCES users(id),
      notes text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // recruitment_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS recruitment_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ref_code varchar(30),
      job_position_id uuid REFERENCES job_positions(id),
      post_title varchar(255) NOT NULL,
      requesting_dept varchar(100),
      hierarchical_superior varchar(255),
      proposed_status varchar(50),
      reason text,
      study_level varchar(255),
      study_specialty varchar(255),
      experience_duration varchar(100),
      main_missions text,
      required_skills text,
      status recruitment_status NOT NULL DEFAULT 'ouvert',
      opened_date date,
      closed_date date,
      filled_by_user_id uuid REFERENCES users(id),
      notes text,
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // training_sessions
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ref_code varchar(30),
      year integer NOT NULL,
      thematic varchar(100),
      theme varchar(500) NOT NULL,
      requested_by_user_id uuid REFERENCES users(id),
      requested_date date,
      objective text,
      trainer_name varchar(255),
      training_org varchar(255),
      location varchar(255),
      planned_start_date date,
      planned_end_date date,
      actual_start_date date,
      actual_end_date date,
      status training_status NOT NULL DEFAULT 'planifie',
      action_type varchar(50),
      hot_eval_date date,
      cold_eval_date date,
      notes text,
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // training_participants
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS training_participants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      training_session_id uuid NOT NULL REFERENCES training_sessions(id),
      user_id uuid NOT NULL REFERENCES users(id),
      attended boolean NOT NULL DEFAULT true,
      hot_eval_score numeric(4,1),
      hot_eval_notes text,
      cold_eval_score numeric(4,1),
      cold_eval_notes text,
      cold_eval_competencies jsonb DEFAULT '[]'::jsonb,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // leave_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      leave_type leave_type NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      duration_days numeric(5,1) NOT NULL,
      reason text,
      status leave_status NOT NULL DEFAULT 'en_attente',
      supervisor_approval leave_status,
      supervisor_approved_by uuid REFERENCES users(id),
      supervisor_approved_at timestamp,
      supervisor_note text,
      rh_approval leave_status,
      rh_approved_by uuid REFERENCES users(id),
      rh_approved_at timestamp,
      direction_approval leave_status,
      direction_approved_by uuid REFERENCES users(id),
      direction_approved_at timestamp,
      balance_before_days numeric(5,1),
      notes text,
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // exit_authorizations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS exit_authorizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      start_time timestamp NOT NULL,
      end_time timestamp NOT NULL,
      duration_hours numeric(4,1),
      reason text,
      status leave_status NOT NULL DEFAULT 'en_attente',
      supervisor_approval leave_status,
      supervisor_approved_by uuid REFERENCES users(id),
      rh_approval leave_status,
      rh_approved_by uuid REFERENCES users(id),
      notes text,
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // performance_evaluations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS performance_evaluations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      evaluator_id uuid NOT NULL REFERENCES users(id),
      evaluation_date date NOT NULL,
      current_position varchar(255),
      seniority_company varchar(50),
      seniority_position varchar(50),
      work_techniques_criteria jsonb DEFAULT '[]'::jsonb,
      work_techniques_score numeric(4,2),
      work_techniques_desired numeric(4,2),
      attendance_score numeric(4,2),
      rigor_score numeric(4,2),
      discipline_score numeric(4,2),
      discipline_desired numeric(4,2),
      improvement_score numeric(4,2),
      smq_respect_score numeric(4,2),
      risk_analysis_score numeric(4,2),
      quality_score numeric(4,2),
      quality_desired numeric(4,2),
      communication_score numeric(4,2),
      teamwork_score numeric(4,2),
      management_score numeric(4,2),
      learning_score numeric(4,2),
      integration_score numeric(4,2),
      integration_desired numeric(4,2),
      global_score numeric(4,2),
      global_score_pct numeric(5,2),
      previous_score numeric(4,2),
      evaluee_needs text,
      training_actions jsonb DEFAULT '[]'::jsonb,
      next_objectives text,
      remarks text,
      deleted_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  // integration_plans
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integration_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      pilot_id uuid REFERENCES users(id),
      planned_start_date date,
      planned_end_date date,
      items jsonb DEFAULT '[]'::jsonb,
      notes text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  console.log('Migration 016 applied: RH tables created')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
