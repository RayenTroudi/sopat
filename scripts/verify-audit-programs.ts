/**
 * Vérification du module Programmes d'audit (FOR-MI-14).
 *
 * Trois familles de contrôles :
 *
 *  1. **Données de référence** — le registre ISO 9001:2015 et la cartographie
 *     des processus doivent correspondre aux classeurs FOR-MI-14 : sept
 *     processus, le nombre d'étapes de chaque classeur, et le référentiel de
 *     clauses de chaque processus.
 *
 *  2. **Intégrité** — aucune clause orpheline, aucun constat pointant vers une
 *     clause inconnue, et surtout : le libellé `criteria` d'un programme doit
 *     être exactement le rendu de ses lignes `audit_program_clauses`. C'est un
 *     cache à écrivain unique ; s'ils divergent, quelque chose écrit à côté.
 *
 *  3. **Traçabilité** — la chaîne clause → programme → constat → preuve → NC →
 *     action corrective, dans les deux sens. Le contrôle décisif est négatif :
 *     aucun constat marqué NC avec une non-conformité rattachée ne doit avoir
 *     perdu ce lien.
 *
 * Lecture seule : aucune écriture, aucune séquence consommée, rejouable.
 *
 *   npx tsx --env-file=.env scripts/verify-audit-programs.ts
 */
import { selectTestTarget } from './lib/test-target'

// Doit précéder la première opération base : `db` est un Proxy paresseux.
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import { getAnnualCoverage } from '../src/lib/db/iso-reference'

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok    ${label}`) }
  else { failed++; console.log(`  ÉCHEC ${label}${detail ? ` — ${detail}` : ''}`) }
}

function section(title: string) { console.log(`\n${title}`) }

/** Nombre d'étapes par classeur FOR-MI-14, tel que transcrit par la migration 0040. */
const EXPECTED_STEPS: Record<string, number> = {
  MI: 11, CO: 9, ET: 8, AC: 7, RE1: 7, RE2: 10, RH: 8,
}

/** Référentiel ISO de chaque processus, colonne « Référentiel ISO 9001 » des classeurs. */
const EXPECTED_CLAUSES: Record<string, string> = {
  MI:  '4.1; 4.2; 4.3; 4.4; 5.1; 5.2; 5.3; 6.1; 6.2; 7.1; 7.4; 7.5; 9.1; 9.3; 10.1; 10.2; 10.3',
  CO:  '4.4; 6.1; 6.2; 7.5; 8.2; 9.1; 10.2; 10.3',
  ET:  '4.4; 6.1; 6.2; 7.1; 7.2; 7.5; 8.1; 8.2; 8.3; 9.1; 9.2; 10.1; 10.2; 10.3',
  AC:  '4.4; 6.1; 6.2; 7.5; 8.4; 8.6; 8.7; 9.1; 10.2; 10.3',
  RE1: '4.4; 6.1; 6.2; 7.5; 8.1; 8.5; 8.6; 8.7; 9.1; 10.2; 10.3',
  RE2: '4.4; 6.1; 6.2; 7.5; 8.1; 8.5; 8.6; 8.7; 9.1; 10.2; 10.3',
  RH:  '4.4; 5.3; 6.1; 6.2; 7.2; 7.3; 7.5; 9.1; 10.2; 10.3',
}

async function referenceData() {
  section('1. Données de référence (classeurs FOR-MI-14)')

  const chapters = await db.execute(sql`
    SELECT chapter, count(*)::int AS n FROM iso_clauses GROUP BY chapter ORDER BY chapter`)
  const present = (chapters.rows as Array<{ chapter: number }>).map((r) => Number(r.chapter))
  check('les chapitres 4 à 10 sont au registre',
    [4, 5, 6, 7, 8, 9, 10].every((c) => present.includes(c)), present.join(','))
  check('les chapitres 1 à 3 (sans exigence auditable) sont absents',
    !present.some((c) => c < 4))

  const processes = await db.execute(sql`SELECT code FROM qms_processes ORDER BY sort_order`)
  check('sept processus dans la cartographie', processes.rows.length === 7, String(processes.rows.length))

  for (const [code, expected] of Object.entries(EXPECTED_STEPS)) {
    const r = await db.execute(sql`
      SELECT count(*)::int AS n FROM qms_process_steps WHERE process_code = ${code} AND is_active`)
    const n = Number((r.rows[0] as { n: number }).n)
    check(`${code} : ${expected} étapes du classeur`, n === expected, `trouvé ${n}`)
  }

  for (const [code, expected] of Object.entries(EXPECTED_CLAUSES)) {
    const r = await db.execute(sql`
      SELECT string_agg(pc.clause_code, '; ' ORDER BY c.sort_key) AS codes
      FROM qms_process_clauses pc
      JOIN iso_clauses c ON c.code = pc.clause_code
      WHERE pc.process_code = ${code}`)
    const got = (r.rows[0] as { codes: string | null }).codes ?? ''
    check(`${code} : référentiel ISO conforme au classeur`, got === expected, got)
  }
}

async function integrity() {
  section('2. Intégrité des données')

  const orphanProgramme = await db.execute(sql`
    SELECT count(*)::int AS n FROM audit_program_clauses apc
    LEFT JOIN iso_clauses c ON c.code = apc.clause_code WHERE c.code IS NULL`)
  check('aucune clause de programme hors registre',
    Number((orphanProgramme.rows[0] as { n: number }).n) === 0)

  const orphanFinding = await db.execute(sql`
    SELECT count(*)::int AS n FROM audit_program_item_clauses apic
    LEFT JOIN iso_clauses c ON c.code = apic.clause_code WHERE c.code IS NULL`)
  check('aucune clause de constat hors registre',
    Number((orphanFinding.rows[0] as { n: number }).n) === 0)

  // `criteria` est un cache à écrivain unique (setAuditProgramClauses). Toute
  // divergence signale une écriture parallèle.
  const drift = await db.execute(sql`
    SELECT ap.reference, ap.criteria,
           (SELECT string_agg(apc.clause_code, '; ' ORDER BY c.sort_key)
              FROM audit_program_clauses apc
              JOIN iso_clauses c ON c.code = apc.clause_code
             WHERE apc.audit_program_id = ap.id) AS rendered
    FROM audit_programs ap
    WHERE (SELECT count(*) FROM audit_program_clauses WHERE audit_program_id = ap.id) > 0
      AND ap.criteria IS DISTINCT FROM
          (SELECT string_agg(apc.clause_code, '; ' ORDER BY c.sort_key)
             FROM audit_program_clauses apc
             JOIN iso_clauses c ON c.code = apc.clause_code
            WHERE apc.audit_program_id = ap.id)`)
  check('le libellé `criteria` correspond aux lignes de clauses',
    drift.rows.length === 0, JSON.stringify(drift.rows.slice(0, 3)))

  const badDept = await db.execute(sql`
    SELECT count(*)::int AS n FROM audit_programs ap
    LEFT JOIN qms_processes p ON p.code = ap.dept WHERE p.code IS NULL`)
  check('tout programme pointe vers un processus de la cartographie',
    Number((badDept.rows[0] as { n: number }).n) === 0)

  const dupNc = await db.execute(sql`
    SELECT nc_id, count(*)::int AS n FROM audit_program_items
    WHERE nc_id IS NOT NULL GROUP BY nc_id HAVING count(*) > 1`)
  check('une non-conformité n’est rattachée qu’à un seul constat', dupNc.rows.length === 0,
    JSON.stringify(dupNc.rows))
}

/**
 * Un audit déclaré réalisé dont les constats ne portent aucun résultat de
 * conformité est un enregistrement incomplet au regard du § 9.2 : la couverture
 * le compte comme audité alors que rien n'atteste qu'il l'ait été. Signalé par
 * programme, avec le détail de chaque constat, pour qu'on puisse trancher entre
 * « l'audit a eu lieu, la saisie manque » et « le statut est prématuré ».
 */
async function executionCompleteness() {
  section("4. Complétude d'exécution des audits déclarés réalisés")

  const incomplete = await db.execute(sql`
    SELECT ap.reference, ap.year, p.name AS process,
           count(*)::int                                              AS criteres,
           count(*) FILTER (WHERE i.conformity IS NOT NULL)::int      AS evalues
    FROM audit_programs ap
    JOIN qms_processes p        ON p.code = ap.dept
    JOIN audit_program_items i  ON i.audit_program_id = ap.id
    WHERE ap.status = 'realise'
    GROUP BY ap.reference, ap.year, p.name
    HAVING count(*) FILTER (WHERE i.conformity IS NOT NULL) < count(*)
    ORDER BY ap.year DESC, ap.reference
  `)

  check('tout audit déclaré réalisé a évalué chacun de ses constats',
    incomplete.rows.length === 0,
    (incomplete.rows as Array<{ reference: string; evalues: number; criteres: number }>)
      .map((r) => `${r.reference} ${r.evalues}/${r.criteres}`).join(', '))

  for (const r of incomplete.rows as Array<{ reference: string; process: string; criteres: number; evalues: number }>) {
    console.log(`  info  ${r.reference} — ${r.process} : ${r.evalues}/${r.criteres} constat(s) évalué(s)`)
    const detail = await db.execute(sql`
      SELECT i.sort_order, i.agenda_step, i.conformity,
             (i.evidence IS NOT NULL AND btrim(i.evidence) <> '') AS a_preuve
      FROM audit_program_items i
      JOIN audit_programs ap ON ap.id = i.audit_program_id
      WHERE ap.reference = ${r.reference}
      ORDER BY i.sort_order
    `)
    for (const d of detail.rows as Array<{ agenda_step: string; conformity: string | null; a_preuve: boolean }>)
      console.log(`          ${(d.conformity ?? 'non évalué').padEnd(11)} ${d.a_preuve ? 'preuve' : '     '}  ${d.agenda_step}`)
  }
}

async function traceability() {
  section('3. Traçabilité clause → constat → preuve → NC → action corrective')

  const noCriteria = await db.execute(sql`
    SELECT reference FROM audit_programs ap
    WHERE (SELECT count(*) FROM audit_program_clauses WHERE audit_program_id = ap.id) = 0
      AND (ap.criteria IS NULL OR btrim(ap.criteria) = '')
    ORDER BY reference`)
  check('aucun programme sans critère d’audit', noCriteria.rows.length === 0,
    (noCriteria.rows as Array<{ reference: string }>).map((r) => r.reference).join(', '))

  // Contrôle décisif : le lien constat → NC est celui que la régression
  // précédente effaçait à chaque enregistrement.
  const ncWithoutEvidence = await db.execute(sql`
    SELECT ap.reference, i.agenda_step
    FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.conformity = 'NC' AND (i.evidence IS NULL OR btrim(i.evidence) = '')`)
  check('tout constat non conforme s’appuie sur une preuve objective',
    ncWithoutEvidence.rows.length === 0,
    `${ncWithoutEvidence.rows.length} constat(s) sans preuve`)

  const ncNotRaised = await db.execute(sql`
    SELECT ap.reference, i.agenda_step
    FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.conformity = 'NC' AND i.nc_id IS NULL`)
  check('tout constat non conforme a ouvert une non-conformité',
    ncNotRaised.rows.length === 0,
    `${ncNotRaised.rows.length} constat(s) NC sans fiche`)

  const chain = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM iso_clauses c
    JOIN audit_program_item_clauses apic ON apic.clause_code = c.code
    JOIN audit_program_items i           ON i.id = apic.item_id
    JOIN audit_programs ap               ON ap.id = i.audit_program_id
    JOIN non_conformances nc             ON nc.id = i.nc_id`)
  const linked = Number((chain.rows[0] as { n: number }).n)
  console.log(`  info  ${linked} maillon(s) clause → constat → non-conformité en base`)

  const capa = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM audit_program_items i
    JOIN non_conformances nc   ON nc.id = i.nc_id
    JOIN corrective_actions ca ON ca.nc_id = nc.id`)
  console.log(`  info  ${Number((capa.rows[0] as { n: number }).n)} action(s) corrective(s) traçables jusqu’à un constat d’audit`)

  // Un constat n'est orphelin que si son libellé ne correspond ni à une étape du
  // classeur ni à un libellé hérité connu (qms_process_step_aliases). Un libellé
  // hérité qui recouvrait deux étapes reste sans critère unique : c'est un fait
  // enregistré, pas un défaut.
  const orphans = await db.execute(sql`
    SELECT ap.reference, i.agenda_step
    FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.process_step_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM qms_process_step_aliases a
                      WHERE a.process_code = ap.dept AND a.alias_label = i.agenda_step)`)
  check('aucun constat sans critère identifiable', orphans.rows.length === 0,
    (orphans.rows as Array<{ agenda_step: string }>).map((r) => r.agenda_step).join(' | '))

  const mergedLabels = await db.execute(sql`
    SELECT count(*)::int AS n FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.process_step_id IS NULL`)
  const m = Number((mergedLabels.rows[0] as { n: number }).n)
  if (m > 0) console.log(`  info  ${m} constat(s) sous un libellé hérité recouvrant plusieurs critères du classeur`)
}

// ─── Portée des clauses et provenance des critères ───────────────────────────

async function clauseScope() {
  section('6. Portée des clauses et provenance des critères')

  // La portée est dérivée de la cartographie, jamais stockée : elle ne peut donc
  // pas diverger. On vérifie ici que la dérivation donne bien une partition.
  const scope = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE n = (SELECT count(*) FROM qms_processes WHERE is_active))::int AS transversal,
      count(*) FILTER (WHERE n > 1 AND n < (SELECT count(*) FROM qms_processes WHERE is_active))::int AS shared,
      count(*) FILTER (WHERE n = 1)::int AS process_specific,
      count(*) FILTER (WHERE n = 0)::int AS unassigned,
      count(*)::int AS total
    FROM (
      SELECT c.code, count(pc.process_code)::int AS n
      FROM iso_clauses c
      LEFT JOIN qms_process_clauses pc ON pc.clause_code = c.code
      WHERE char_length(c.code) - char_length(replace(c.code, '.', '')) = 1
      GROUP BY c.code) t`)
  const sc = scope.rows[0] as Record<string, number>
  check('la portée des clauses forme une partition',
    Number(sc.transversal) + Number(sc.shared) + Number(sc.process_specific) + Number(sc.unassigned)
      === Number(sc.total), JSON.stringify(sc))
  console.log(`  info  ${sc.transversal} transversale(s), ${sc.shared} partagée(s), ` +
              `${sc.process_specific} spécifique(s), ${sc.unassigned} sans processus`)

  // Toute clause qu'aucun processus n'audite doit porter une décision écrite.
  const undecided = await db.execute(sql`
    SELECT c.code FROM iso_clauses c
    WHERE char_length(c.code) - char_length(replace(c.code, '.', '')) = 1
      AND NOT EXISTS (SELECT 1 FROM qms_process_clauses pc WHERE pc.clause_code = c.code)
      AND NOT EXISTS (SELECT 1 FROM qms_clause_decisions d WHERE d.clause_code = c.code)`)
  check('toute clause sans processus porte une décision enregistrée',
    undecided.rows.length === 0,
    (undecided.rows as Array<{ code: string }>).map((r) => r.code).join(', '))

  const pending = await db.execute(sql`
    SELECT clause_code FROM qms_clause_decisions WHERE disposition = 'pending_decision'`)
  const p = (pending.rows as Array<{ clause_code: string }>).map((r) => r.clause_code)
  if (p.length > 0)
    console.log(`  info  décision qualité encore attendue sur : ${p.join(', ')}`)

  // Un critère typé 'iso' doit avoir au moins une clause, un critère 'process'
  // aucune — c'est ce qui distingue un critère d'entreprise d'un critère cassé.
  const badIso = await db.execute(sql`
    SELECT s.process_code, s.label FROM qms_process_steps s
    WHERE s.criterion_type = 'iso'
      AND NOT EXISTS (SELECT 1 FROM qms_process_step_clauses sc WHERE sc.step_id = s.id)`)
  check("un critère typé ISO porte au moins une clause", badIso.rows.length === 0,
    (badIso.rows as Array<{ label: string }>).map((r) => r.label).join(' | '))

  const badProcess = await db.execute(sql`
    SELECT s.process_code, s.label FROM qms_process_steps s
    WHERE s.criterion_type = 'process'
      AND EXISTS (SELECT 1 FROM qms_process_step_clauses sc WHERE sc.step_id = s.id)`)
  check("un critère typé processus ne revendique aucune clause", badProcess.rows.length === 0,
    (badProcess.rows as Array<{ label: string }>).map((r) => r.label).join(' | '))

  const procCriteria = await db.execute(sql`
    SELECT count(*)::int AS n FROM qms_process_steps WHERE criterion_type = 'process'`)
  console.log(`  info  ${Number((procCriteria.rows[0] as { n: number }).n)} critère(s) propre(s) à SOPAT ` +
              `(ancrage ISO au niveau du processus, pas de l'étape)`)

  // Aucune étape ne doit revendiquer une clause hors du référentiel de son
  // processus : c'est le garde-fou de la migration 0040, revérifié en base.
  const outOfScope = await db.execute(sql`
    SELECT s.process_code, s.label, sc.clause_code
    FROM qms_process_steps s
    JOIN qms_process_step_clauses sc ON sc.step_id = s.id
    WHERE NOT EXISTS (SELECT 1 FROM qms_process_clauses pc
                      WHERE pc.process_code = s.process_code AND pc.clause_code = sc.clause_code)`)
  check('aucun critère ne revendique une clause hors du référentiel de son processus',
    outOfScope.rows.length === 0, JSON.stringify(outOfScope.rows.slice(0, 3)))
}

async function coverage() {
  section('5. Couverture cumulée du programme annuel (ISO 9001 § 9.2.2 a)')

  const year = new Date().getFullYear()
  const cov = await getAnnualCoverage(year)
  const t = cov.totals

  check('les états de couverture forment une partition des clauses auditables',
    t.executed + t.planned + t.notPlanned + t.unassigned === t.auditable,
    JSON.stringify(t))

  console.log(`  info  ${t.executed + t.planned}/${t.auditable} clauses au programme ${year} ` +
              `(${t.executed} auditée(s), ${t.planned} planifiée(s))`)
  console.log(`  info  ${t.processesPlanned}/${t.processesTotal} processus ont un audit au programme ${year}`)

  // Deux causes distinctes, deux remèdes distincts : les confondre ferait passer
  // un défaut de planification pour un défaut de cartographie.
  const notPlanned = cov.clauses.filter((c) => c.state === 'not_planned')
  if (notPlanned.length > 0) {
    const byProcess = new Map<string, string[]>()
    for (const c of notPlanned)
      for (const p of c.owningProcesses)
        byProcess.set(p, [...(byProcess.get(p) ?? []), c.code])
    console.log(`  info  ${notPlanned.length} clause(s) en attente de planification :`)
    for (const [proc, codes] of [...byProcess.entries()].sort())
      console.log(`          auditer ${proc} couvrirait ${[...new Set(codes)].join(', ')}`)
  }

  const unassigned = cov.clauses.filter((c) => c.state === 'unassigned')
  for (const c of unassigned)
    console.log(`  info  ${c.code} n'est auditée par aucun processus — ${c.decision?.disposition ?? 'aucune décision'}`)

  if (t.multiplyCovered > 0)
    console.log(`  info  ${t.multiplyCovered} clause(s) couverte(s) par plusieurs audits`)

  const unplannedProcesses = cov.processes.filter((p) => !p.planned).map((p) => p.code)
  if (unplannedProcesses.length > 0)
    console.log(`  info  processus sans audit planifié en ${year} : ${unplannedProcesses.join(', ')}`)
}

async function main() {
  await referenceData()
  await integrity()
  await traceability()
  await executionCompleteness()
  await coverage()
  await clauseScope()
  console.log(`\n${passed} ok, ${failed} échec(s)`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
