import { db } from '@/db'
import { organizationalKnowledge, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type OrganizationalKnowledge = typeof organizationalKnowledge.$inferSelect

export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  a_preserver: 'À préserver',
  archived: 'Archivée',
}

export const KNOWLEDGE_DOMAINS = [
  'Étude & conception',
  'Réalisation & chantier',
  'Entretien',
  'Palette végétale',
  'Achat & fournisseurs',
  'Qualité & SMQ',
  'Commercial & clients',
  'Administration & RH',
  'Autre',
]

export async function getOrganizationalKnowledge(filters?: { status?: string }) {
  return db
    .select({
      knowledge: organizationalKnowledge,
      creatorName: users.name,
    })
    .from(organizationalKnowledge)
    .leftJoin(users, eq(organizationalKnowledge.createdBy, users.id))
    .where(
      and(
        isNull(organizationalKnowledge.deletedAt),
        filters?.status
          ? eq(organizationalKnowledge.status, filters.status as 'active' | 'a_preserver' | 'archived')
          : undefined,
      )
    )
    .orderBy(desc(organizationalKnowledge.criticality), desc(organizationalKnowledge.createdAt))
}

export async function getNextKnowledgeReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(organizationalKnowledge)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `CON-${year}-${seq}`
}
