import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  // PLA-RE-05: Gantt de réalisation
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS realisation_gantt (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL UNIQUE REFERENCES projects(id),
      localisation varchar(255),
      project_manager varchar(255),
      date_demarrage_prevu date,
      date_demarrage_reel date,
      date_fin_prevue date,
      date_fin_reelle date,
      date_maj date,
      gantt_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS realisation_gantt_project_id_idx ON realisation_gantt(project_id)
  `)

  // FOR-RE-07 to -12: Quality checklists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS realisation_checklists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id),
      checklist_type varchar(50) NOT NULL,
      items jsonb NOT NULL DEFAULT '[]'::jsonb,
      signed_by_name varchar(255),
      signed_date date,
      is_finalized boolean DEFAULT false,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id)
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS realisation_checklists_project_id_idx ON realisation_checklists(project_id)
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS realisation_checklists_type_idx ON realisation_checklists(checklist_type)
  `)

  console.log('Migration 019 applied: realisation_gantt and realisation_checklists created')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
