import { db } from '@/db'
import {
  meetingMinutes,
  meetingActionItems,
  meetingAiReports,
  meetingTranscripts,
  users,
} from '@/db/schema'
import { and, desc, eq, isNull, inArray } from 'drizzle-orm'
import type { MeetingAiStatus } from '@/lib/meetings/status'
import type {
  MeetingActionItemAnalysis,
  MeetingQmsFinding,
} from '@/lib/ai/meeting-analysis'

/**
 * Registre de lecture des réunions IA.
 *
 * Séparé de src/lib/db/meetings.ts, qui continue de servir les PV manuels sans
 * changement. Aucun appel au modèle ni à Recall ici : ouvrir la fiche d'une réunion
 * lit le rapport DÉJÀ stocké, jamais n'en régénère un — c'est ce qui évite de
 * refacturer une analyse à chaque affichage.
 */

export type AiMeetingRow = typeof meetingMinutes.$inferSelect
export type AiReportRow = typeof meetingAiReports.$inferSelect
export type MeetingTranscriptRow = typeof meetingTranscripts.$inferSelect
export type MeetingActionRow = typeof meetingActionItems.$inferSelect

/** Formes stockées en jsonb : re-typées à la lecture, jamais `any`. */
export type StoredDecision = { decision: string }
export type StoredActionItem = MeetingActionItemAnalysis
export type StoredQmsFinding = MeetingQmsFinding

export type AiReport = Omit<
  AiReportRow,
  'topics' | 'decisions' | 'actionItems' | 'risks' | 'questions' | 'followUps' | 'qmsFindings'
> & {
  topics: string[]
  decisions: StoredDecision[]
  actionItems: StoredActionItem[]
  risks: string[]
  questions: string[]
  followUps: string[]
  qmsFindings: StoredQmsFinding[]
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function asObjectArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function hydrateReport(row: AiReportRow): AiReport {
  return {
    ...row,
    topics:      asStringArray(row.topics),
    decisions:   asObjectArray<StoredDecision>(row.decisions),
    actionItems: asObjectArray<StoredActionItem>(row.actionItems),
    risks:       asStringArray(row.risks),
    questions:   asStringArray(row.questions),
    followUps:   asStringArray(row.followUps),
    qmsFindings: asObjectArray<StoredQmsFinding>(row.qmsFindings),
  }
}

// ── Lectures ──────────────────────────────────────────────────────────────────

/** Réunions pilotées par l'assistant IA, les plus récentes d'abord. */
export async function listAiMeetings(filters?: { status?: MeetingAiStatus[] }) {
  return db
    .select({
      meeting: meetingMinutes,
      creatorName: users.name,
    })
    .from(meetingMinutes)
    .leftJoin(users, eq(meetingMinutes.createdBy, users.id))
    .where(
      and(
        isNull(meetingMinutes.deletedAt),
        eq(meetingMinutes.source, 'ai_assistant'),
        filters?.status?.length ? inArray(meetingMinutes.aiStatus, filters.status) : undefined,
      ),
    )
    .orderBy(desc(meetingMinutes.scheduledAt), desc(meetingMinutes.createdAt))
}

export async function getAiMeetingById(id: string) {
  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, id), isNull(meetingMinutes.deletedAt)))
    .limit(1)
  if (!meeting) return null

  const [report] = await db
    .select()
    .from(meetingAiReports)
    .where(eq(meetingAiReports.meetingId, id))
    .orderBy(desc(meetingAiReports.generatedAt))
    .limit(1)

  const [transcript] = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.meetingId, id))
    .limit(1)

  const actions = await db
    .select({
      action: meetingActionItems,
      assigneeName: users.name,
    })
    .from(meetingActionItems)
    .leftJoin(users, eq(meetingActionItems.assigneeId, users.id))
    .where(eq(meetingActionItems.meetingId, id))
    .orderBy(meetingActionItems.createdAt)

  return {
    meeting,
    report: report ? hydrateReport(report) : null,
    transcript: transcript ?? null,
    actions,
  }
}

/** Résolution d'une réunion à partir de l'identifiant de bot Recall. */
export async function getMeetingByBotId(botId: string) {
  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.recallBotId, botId))
    .limit(1)
  return meeting ?? null
}

export async function getTranscriptByMeetingId(meetingId: string) {
  const [row] = await db
    .select()
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.meetingId, meetingId))
    .limit(1)
  return row ?? null
}

/** Comptage par statut pour les cartes du tableau de bord. */
export async function getAiMeetingCounts() {
  const rows = await db
    .select({ status: meetingMinutes.aiStatus })
    .from(meetingMinutes)
    .where(and(isNull(meetingMinutes.deletedAt), eq(meetingMinutes.source, 'ai_assistant')))

  const counts: Record<string, number> = {}
  for (const row of rows) {
    const key = row.status ?? 'scheduled'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

/** Comptes actifs, pour le rapprochement des noms extraits par l'IA. */
export async function getMatchableUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
}
