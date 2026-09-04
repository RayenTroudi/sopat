import { db } from '@/db'
import {
  isoClauses,
  qmsProcesses,
  qmsProcessClauses,
  qmsProcessSteps,
  qmsProcessStepClauses,
  qmsClauseDecisions,
} from '@/db/schema'
import { asc, eq, inArray, sql } from 'drizzle-orm'

/**
 * QMS reference data: the ISO 9001:2015 clause register and SOPAT's process
 * cartography.
 *
 * This module exists because all of it used to be literal objects inside
 * AuditProgramsClient.tsx (DEFAULT_AGENDA, DEFAULT_CRITERIA, DEFAULT_REF_DOCS,
 * DEFAULT_TIME_SLOTS, DEFAULT_INTERLOCUTEURS, DEPT_CONFIG). Held there it could
 * not be validated on the server, queried, or reused by any other module, and it
 * had silently drifted from the FOR-MI-14 workbooks it was transcribed from.
 *
 * Everything here is read-only at runtime. The rows are seeded by migration 0040
 * and changed by migration, which is what a controlled document requires: an
 * audit criterion that can be edited from a form is not a controlled criterion.
 */

export type IsoClause = {
  code: string
  chapter: number
  parentCode: string | null
  title: string
  sortKey: string
}

export type QmsProcess = {
  code: string
  name: string
  shortLabel: string
  procedureCodes: string
  defaultInterlocuteurs: string
  defaultStartTime: string | null
  defaultEndTime: string | null
  color: string | null
  sortOrder: number
}

export type QmsProcessStep = {
  id: string
  processCode: string
  label: string
  sortOrder: number
  defaultInterlocuteurs: string | null
  /** Default clause codes for this criterion, ISO order. */
  clauseCodes: string[]
}

/** Every process with its clause set and its ordered agenda template. */
export type QmsProcessDefinition = QmsProcess & {
  clauseCodes: string[]
  steps: QmsProcessStep[]
}

// ─── Clause register ─────────────────────────────────────────────────────────

/** The full ISO 9001:2015 clause register, in clause order. */
export async function listIsoClauses(): Promise<IsoClause[]> {
  return db
    .select({
      code:       isoClauses.code,
      chapter:    isoClauses.chapter,
      parentCode: isoClauses.parentCode,
      title:      isoClauses.title,
      sortKey:    isoClauses.sortKey,
    })
    .from(isoClauses)
    .where(eq(isoClauses.isAuditable, true))
    .orderBy(asc(isoClauses.sortKey))
}

/**
 * The subset of `codes` that exist in the register, in ISO order.
 *
 * Used as the server-side gate on every clause reference a client submits, so an
 * invented or mistyped clause is rejected before it can be recorded as the
 * criterion of an audit.
 */
export async function filterKnownClauseCodes(codes: string[]): Promise<string[]> {
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))]
  if (unique.length === 0) return []
  const rows = await db
    .select({ code: isoClauses.code })
    .from(isoClauses)
    .where(inArray(isoClauses.code, unique))
    .orderBy(asc(isoClauses.sortKey))
  return rows.map((r) => r.code)
}

/**
 * Normalises a free-text clause list to canonical codes.
 *
 * Handles the two defects present in the source workbooks: a decimal comma
 * ("6,2") and a missing separator ("6,2 7.1"). Commas become periods first, then
 * every clause-shaped token is extracted and checked against the register.
 * Tokens that match nothing are returned separately rather than dropped in
 * silence, so an import can report what it could not place.
 */
export async function parseClauseList(
  raw: string | null | undefined,
): Promise<{ codes: string[]; unmatched: string[] }> {
  if (!raw || !raw.trim()) return { codes: [], unmatched: [] }
  const tokens = [...new Set(raw.replace(/,/g, '.').match(/\d+(?:\.\d+)*/g) ?? [])]
  if (tokens.length === 0) return { codes: [], unmatched: [] }
  const known = await filterKnownClauseCodes(tokens)
  const knownSet = new Set(known)
  return { codes: known, unmatched: tokens.filter((t) => !knownSet.has(t)) }
}

/** Renders clause codes the way FOR-MI-14 does: "4.4; 6.1; 8.4", ISO order. */
export function formatClauseList(codes: string[]): string {
  return [...codes]
    .sort((a, b) => compareClauseCodes(a, b))
    .join('; ')
}

/** Numeric segment-wise comparison, so 8.10 sorts after 8.2 rather than before. */
export function compareClauseCodes(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1)
    if (d !== 0) return d
  }
  return 0
}

// ─── Process cartography ─────────────────────────────────────────────────────

/**
 * Every active process with its clause set and ordered agenda template.
 *
 * One call, three queries, assembled in memory: the whole cartography is 7
 * processes, 60 steps and ~150 mappings, so paying for a join per process would
 * buy nothing.
 */
export async function listProcessDefinitions(): Promise<QmsProcessDefinition[]> {
  const [processes, processClauses, steps, stepClauses] = await Promise.all([
    db
      .select({
        code:                  qmsProcesses.code,
        name:                  qmsProcesses.name,
        shortLabel:            qmsProcesses.shortLabel,
        procedureCodes:        qmsProcesses.procedureCodes,
        defaultInterlocuteurs: qmsProcesses.defaultInterlocuteurs,
        defaultStartTime:      qmsProcesses.defaultStartTime,
        defaultEndTime:        qmsProcesses.defaultEndTime,
        color:                 qmsProcesses.color,
        sortOrder:             qmsProcesses.sortOrder,
      })
      .from(qmsProcesses)
      .where(eq(qmsProcesses.isActive, true))
      .orderBy(asc(qmsProcesses.sortOrder)),
    db
      .select({
        processCode: qmsProcessClauses.processCode,
        clauseCode:  qmsProcessClauses.clauseCode,
      })
      .from(qmsProcessClauses)
      .innerJoin(isoClauses, eq(isoClauses.code, qmsProcessClauses.clauseCode))
      .orderBy(asc(isoClauses.sortKey)),
    db
      .select({
        id:                    qmsProcessSteps.id,
        processCode:           qmsProcessSteps.processCode,
        label:                 qmsProcessSteps.label,
        sortOrder:             qmsProcessSteps.sortOrder,
        defaultInterlocuteurs: qmsProcessSteps.defaultInterlocuteurs,
      })
      .from(qmsProcessSteps)
      .where(eq(qmsProcessSteps.isActive, true))
      .orderBy(asc(qmsProcessSteps.processCode), asc(qmsProcessSteps.sortOrder)),
    db
      .select({
        stepId:     qmsProcessStepClauses.stepId,
        clauseCode: qmsProcessStepClauses.clauseCode,
      })
      .from(qmsProcessStepClauses)
      .innerJoin(isoClauses, eq(isoClauses.code, qmsProcessStepClauses.clauseCode))
      .orderBy(asc(isoClauses.sortKey)),
  ])

  const clausesByProcess = new Map<string, string[]>()
  for (const r of processClauses) {
    const list = clausesByProcess.get(r.processCode) ?? []
    list.push(r.clauseCode)
    clausesByProcess.set(r.processCode, list)
  }

  const clausesByStep = new Map<string, string[]>()
  for (const r of stepClauses) {
    const list = clausesByStep.get(r.stepId) ?? []
    list.push(r.clauseCode)
    clausesByStep.set(r.stepId, list)
  }

  const stepsByProcess = new Map<string, QmsProcessStep[]>()
  for (const s of steps) {
    const list = stepsByProcess.get(s.processCode) ?? []
    list.push({ ...s, clauseCodes: clausesByStep.get(s.id) ?? [] })
    stepsByProcess.set(s.processCode, list)
  }

  return processes.map((p) => ({
    ...p,
    clauseCodes: clausesByProcess.get(p.code) ?? [],
    steps:       stepsByProcess.get(p.code) ?? [],
  }))
}

/** One process definition, or null when the code is not in the cartography. */
export async function getProcessDefinition(code: string): Promise<QmsProcessDefinition | null> {
  const all = await listProcessDefinitions()
  return all.find((p) => p.code === code) ?? null
}

// ─── Annual audit-programme coverage ─────────────────────────────────────────

/**
 * How many processes are audited against a clause, which is what makes it
 * process-specific, shared or transversal.
 *
 * Derived from qms_process_clauses rather than stored, so it cannot disagree with
 * the cartography the workbooks define.
 */
export type ClauseScope = 'transversal' | 'shared' | 'process_specific' | 'unassigned'

/**
 * Why a clause is or is not covered by a given year's programme.
 *
 * The distinction that matters: `not_planned` means a process IS audited against
 * this clause but no audit of that process is on the calendar yet — a scheduling
 * gap the quality manager closes by planning the audit. `unassigned` means no
 * process is audited against it at all — a cartography gap that no amount of
 * scheduling will close. Reporting both as "not covered" hides the difference.
 */
export type CoverageState = 'executed' | 'planned' | 'not_planned' | 'unassigned'

export type AnnualClauseCoverage = {
  code: string
  chapter: number
  title: string
  scope: ClauseScope
  /** Processes whose referential contains this clause. */
  owningProcesses: string[]
  /** Programme references that planned it this year (cancelled ones excluded). */
  plannedBy: string[]
  /** Of those, the ones actually carried out. */
  executedBy: string[]
  state: CoverageState
  /** True when more than one audit this year covers it. */
  multiplyCovered: boolean
  findingCount: number
  ncCount: number
  /**
   * A recorded ruling, for a clause no process is audited against.
   * `decidedAt` null means the row states the situation but nobody has signed it.
   */
  decision: { disposition: string; justification: string; decidedAt: string | null } | null
}

export type ProcessCoverage = {
  code: string
  name: string
  shortLabel: string
  color: string | null
  clauseCount: number
  criteriaCount: number
  criteriaEvaluated: number
  programmes: Array<{ reference: string; status: string; scheduledDate: string | null }>
  planned: boolean
}

export type AnnualCoverage = {
  year: number
  clauses: AnnualClauseCoverage[]
  processes: ProcessCoverage[]
  totals: {
    auditable: number
    executed: number
    planned: number
    notPlanned: number
    unassigned: number
    multiplyCovered: number
    processesPlanned: number
    processesTotal: number
  }
}

/**
 * Cumulative coverage of ISO 9001 by one year's audit programme.
 *
 * "Coverage" here is a property of the annual programme, not of any single audit:
 * clause 9.2.2 a) asks the programme as a whole to take the importance of the
 * processes into consideration. So the chain measured is
 *
 *   annual programme → audits → process → clause scope → clauses
 *
 * and a clause counts as covered when ANY audit of the year has it in scope.
 * Findings and non-conformities are counted through the per-finding clause links,
 * which is a different and finer path than the programme's planned scope.
 *
 * Cancelled audits are excluded throughout: a cancelled audit covers nothing.
 */
export async function getAnnualCoverage(year: number): Promise<AnnualCoverage> {
  const clauseResult = await db.execute(sql`
    WITH auditable AS (
      SELECT code, chapter, title, sort_key
      FROM iso_clauses
      WHERE char_length(code) - char_length(replace(code, '.', '')) = 1
    ),
    active_process_count AS (
      SELECT count(*)::int AS n FROM qms_processes WHERE is_active
    ),
    owners AS (
      SELECT clause_code, array_agg(process_code::text ORDER BY process_code::text) AS procs
      FROM qms_process_clauses GROUP BY clause_code
    ),
    progs AS (
      SELECT id, reference, status FROM audit_programs
      WHERE year = ${year} AND status <> 'annule'
    ),
    planned AS (
      SELECT apc.clause_code,
             array_agg(p.reference ORDER BY p.reference) AS refs,
             array_remove(array_agg(
               CASE WHEN p.status = 'realise' THEN p.reference END ORDER BY p.reference), NULL) AS exec_refs
      FROM audit_program_clauses apc
      JOIN progs p ON p.id = apc.audit_program_id
      GROUP BY apc.clause_code
    ),
    findings AS (
      SELECT apic.clause_code,
             count(DISTINCT i.id)::int     AS finding_count,
             count(DISTINCT i.nc_id)::int  AS nc_count
      FROM audit_program_item_clauses apic
      JOIN audit_program_items i ON i.id = apic.item_id
      JOIN progs p               ON p.id = i.audit_program_id
      GROUP BY apic.clause_code
    )
    SELECT a.code, a.chapter, a.title,
           COALESCE(o.procs, '{}')                AS owners,
           COALESCE(pl.refs, '{}')                AS planned_refs,
           COALESCE(pl.exec_refs, '{}')           AS executed_refs,
           COALESCE(f.finding_count, 0)           AS finding_count,
           COALESCE(f.nc_count, 0)                AS nc_count,
           d.disposition, d.justification, d.decided_at,
           (SELECT n FROM active_process_count)   AS total_processes
    FROM auditable a
    LEFT JOIN owners  o  ON o.clause_code  = a.code
    LEFT JOIN planned pl ON pl.clause_code = a.code
    LEFT JOIN findings f ON f.clause_code  = a.code
    LEFT JOIN qms_clause_decisions d ON d.clause_code = a.code
    ORDER BY a.sort_key
  `)

  const clauses: AnnualClauseCoverage[] = (clauseResult.rows as Array<{
    code: string; chapter: number; title: string
    owners: string[]; planned_refs: string[]; executed_refs: string[]
    finding_count: number; nc_count: number
    disposition: string | null; justification: string | null; decided_at: string | null
    total_processes: number
  }>).map((r) => {
    const owners = r.owners ?? []
    const planned = r.planned_refs ?? []
    const executed = r.executed_refs ?? []
    const total = Number(r.total_processes)

    const scope: ClauseScope =
      owners.length === 0     ? 'unassigned'
      : owners.length >= total ? 'transversal'
      : owners.length === 1    ? 'process_specific'
      : 'shared'

    const state: CoverageState =
      executed.length > 0 ? 'executed'
      : planned.length > 0 ? 'planned'
      : owners.length === 0 ? 'unassigned'
      : 'not_planned'

    return {
      code: r.code, chapter: Number(r.chapter), title: r.title,
      scope, owningProcesses: owners, plannedBy: planned, executedBy: executed, state,
      multiplyCovered: planned.length > 1,
      findingCount: Number(r.finding_count), ncCount: Number(r.nc_count),
      decision: r.disposition
        ? { disposition: r.disposition, justification: r.justification ?? '',
            decidedAt: r.decided_at ? String(r.decided_at) : null }
        : null,
    }
  })

  const processResult = await db.execute(sql`
    SELECT p.code::text AS code, p.name, p.short_label, p.color,
      (SELECT count(*)::int FROM qms_process_clauses WHERE process_code = p.code) AS clause_count,
      (SELECT count(*)::int FROM qms_process_steps   WHERE process_code = p.code AND is_active) AS criteria_count,
      (SELECT count(*)::int FROM audit_program_items i
         JOIN audit_programs ap ON ap.id = i.audit_program_id
        WHERE ap.dept = p.code AND ap.year = ${year} AND ap.status <> 'annule'
          AND i.conformity IS NOT NULL) AS criteria_evaluated,
      COALESCE((
        SELECT json_agg(json_build_object(
                 'reference', ap.reference, 'status', ap.status, 'scheduledDate', ap.scheduled_date)
               ORDER BY ap.reference)
        FROM audit_programs ap
        WHERE ap.dept = p.code AND ap.year = ${year} AND ap.status <> 'annule'
      ), '[]'::json) AS programmes
    FROM qms_processes p
    WHERE p.is_active
    ORDER BY p.sort_order
  `)

  const processes: ProcessCoverage[] = (processResult.rows as Array<{
    code: string; name: string; short_label: string; color: string | null
    clause_count: number; criteria_count: number; criteria_evaluated: number
    programmes: Array<{ reference: string; status: string; scheduledDate: string | null }>
  }>).map((r) => ({
    code: r.code, name: r.name, shortLabel: r.short_label, color: r.color,
    clauseCount: Number(r.clause_count),
    criteriaCount: Number(r.criteria_count),
    criteriaEvaluated: Number(r.criteria_evaluated),
    programmes: r.programmes ?? [],
    planned: (r.programmes ?? []).length > 0,
  }))

  return {
    year,
    clauses,
    processes,
    totals: {
      auditable:        clauses.length,
      executed:         clauses.filter((c) => c.state === 'executed').length,
      planned:          clauses.filter((c) => c.state === 'planned').length,
      notPlanned:       clauses.filter((c) => c.state === 'not_planned').length,
      unassigned:       clauses.filter((c) => c.state === 'unassigned').length,
      multiplyCovered:  clauses.filter((c) => c.multiplyCovered).length,
      processesPlanned: processes.filter((p) => p.planned).length,
      processesTotal:   processes.length,
    },
  }
}

/**
 * Clause scope of one audit, with the criteria that carry each clause.
 *
 * Answers "which clauses does THIS audit cover", as distinct from the annual
 * question above, and shows which of them are attributable to a specific agenda
 * step versus audited across the whole process.
 */
export type AuditClauseCoverage = {
  code: string
  title: string
  /** Criteria of this audit that name the clause; empty for a process-wide clause. */
  criteria: string[]
  evaluated: number
  conformityIssues: number
}

export async function getAuditClauseCoverage(auditProgramId: string): Promise<AuditClauseCoverage[]> {
  const result = await db.execute(sql`
    SELECT c.code, c.title,
      COALESCE(array_remove(array_agg(DISTINCT i.agenda_step), NULL), '{}') AS criteria,
      count(DISTINCT i.id) FILTER (WHERE i.conformity IS NOT NULL)::int      AS evaluated,
      count(DISTINCT i.id) FILTER (WHERE i.conformity = 'NC')::int           AS conformity_issues
    FROM audit_program_clauses apc
    JOIN iso_clauses c ON c.code = apc.clause_code
    LEFT JOIN audit_program_item_clauses apic ON apic.clause_code = c.code
    LEFT JOIN audit_program_items i
           ON i.id = apic.item_id AND i.audit_program_id = apc.audit_program_id
    WHERE apc.audit_program_id = ${auditProgramId}
    GROUP BY c.code, c.title, c.sort_key
    ORDER BY c.sort_key
  `)
  return (result.rows as Array<{
    code: string; title: string; criteria: string[]
    evaluated: number; conformity_issues: number
  }>).map((r) => ({
    code: r.code, title: r.title,
    criteria: r.criteria ?? [],
    evaluated: Number(r.evaluated),
    conformityIssues: Number(r.conformity_issues),
  }))
}

// ─── Rulings on clauses no process is audited against ────────────────────────

export type ClauseDecisionResult =
  | { ok: true; decision: { clauseCode: string; disposition: string; justification: string; decidedAt: Date | null } }
  | { ok: false; reason: string }

/**
 * Records a ruling on a clause the cartography assigns to nobody.
 *
 * Refuses when the clause IS assigned to a process: there is nothing to rule on,
 * and a stale ruling left on an assigned clause would misreport coverage later.
 * Stamps the author and the moment, because a decision nobody signed is what the
 * seeded row already represented.
 */
export async function recordClauseDecision(input: {
  clauseCode: string
  disposition: 'transversal' | 'excluded'
  justification: string
  decidedBy: string
}): Promise<ClauseDecisionResult> {
  const [clause] = await db
    .select({ code: isoClauses.code })
    .from(isoClauses)
    .where(eq(isoClauses.code, input.clauseCode))
    .limit(1)
  if (!clause) return { ok: false, reason: `Clause ${input.clauseCode} inconnue du référentiel.` }

  const owners = await db
    .select({ processCode: qmsProcessClauses.processCode })
    .from(qmsProcessClauses)
    .where(eq(qmsProcessClauses.clauseCode, input.clauseCode))
  if (owners.length > 0)
    return {
      ok: false,
      reason:
        `La clause ${input.clauseCode} est déjà auditée par ${owners.map((o) => o.processCode).join(', ')} : ` +
        `elle n'appelle pas de décision d'exception.`,
    }

  const now = new Date()
  const [row] = await db
    .insert(qmsClauseDecisions)
    .values({
      clauseCode:    input.clauseCode,
      disposition:   input.disposition,
      justification: input.justification,
      decidedBy:     input.decidedBy,
      decidedAt:     now,
    })
    .onConflictDoUpdate({
      target: qmsClauseDecisions.clauseCode,
      set: {
        disposition:   input.disposition,
        justification: input.justification,
        decidedBy:     input.decidedBy,
        decidedAt:     now,
        updatedAt:     now,
      },
    })
    .returning()

  return {
    ok: true,
    decision: {
      clauseCode:    row.clauseCode,
      disposition:   row.disposition,
      justification: row.justification,
      decidedAt:     row.decidedAt,
    },
  }
}
