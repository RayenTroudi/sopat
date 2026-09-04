'use server'

import { db } from '@/db'
import { users } from '@/db/schema'
import { auth } from '@/lib/auth'
import { recordAudit } from '@/lib/audit-record'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * Qualification d'un auditeur interne — registre LIS-MI-05.
 *
 * Ce registre est ce que le module Programmes d'audit interroge pour proposer un
 * auditeur, et ce sur quoi repose le contrôle d'impartialité du § 9.2.2 c). Y
 * inscrire quelqu'un est donc une décision qualité, pas un réglage de profil.
 *
 * Deux défauts corrigés ici :
 *
 *   * la version précédente ne vérifiait que `!session`. Une action serveur est
 *     un point d'entrée POST comme un autre : n'importe quel utilisateur
 *     authentifié pouvait s'auto-qualifier auditeur interne, ce qui vide de son
 *     sens l'exigence d'impartialité que le registre est censé porter. Réservée
 *     désormais à l'équipe qualité, comme le reste du module ;
 *   * rien n'était tracé. La qualification est maintenant écrite au journal
 *     d'audit, avec l'état avant et après.
 *
 * Une qualification exige un domaine et une date : « auditeur qualifié » sans
 * dire de quoi ni depuis quand n'est pas opposable en audit de certification.
 */
const qualifySchema = z.object({
  isInternalAuditor: z.literal(true),
  auditorDomain: z.string().trim().min(3, "Précisez le domaine d'audit couvert"),
  auditorQualifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de qualification attendue (AAAA-MM-JJ)'),
  auditorQualificationProof: z.string().trim().max(500).optional(),
})

const revokeSchema = z.object({
  isInternalAuditor: z.literal(false),
})

const inputSchema = z.union([qualifySchema, revokeSchema])

export type AuditorStatusResult = { success: true } | { success: false; error: string }

const QUALITY_ROLES = ['admin', 'direction']

export async function setAuditorStatus(
  userId: string,
  data: {
    isInternalAuditor: boolean
    auditorDomain?: string
    auditorQualifiedDate?: string
    auditorQualificationProof?: string
  },
): Promise<AuditorStatusResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!QUALITY_ROLES.includes(session.user.role))
    return { success: false, error: "Accès réservé à l'équipe qualité" }

  if (!z.string().uuid().safeParse(userId).success)
    return { success: false, error: 'Utilisateur invalide' }

  const parsed = inputSchema.safeParse(data)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }

  const [before] = await db
    .select({
      id: users.id,
      name: users.name,
      isInternalAuditor: users.isInternalAuditor,
      auditorDomain: users.auditorDomain,
      auditorQualifiedDate: users.auditorQualifiedDate,
      auditorQualificationProof: users.auditorQualificationProof,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!before || before.deletedAt) return { success: false, error: 'Utilisateur introuvable' }
  if (parsed.data.isInternalAuditor && !before.isActive)
    return { success: false, error: `${before.name} n'est plus un utilisateur actif.` }

  const next = parsed.data.isInternalAuditor
    ? {
        isInternalAuditor: true,
        auditorDomain: parsed.data.auditorDomain,
        auditorQualifiedDate: parsed.data.auditorQualifiedDate,
        auditorQualificationProof: parsed.data.auditorQualificationProof ?? null,
      }
    : {
        // La qualification est retirée, mais le domaine, la date et la preuve
        // restent : ils disent ce qui a été vrai, et un registre qualité ne
        // réécrit pas son passé.
        isInternalAuditor: false,
      }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ ...next, updatedAt: new Date() }).where(eq(users.id, userId))
    await recordAudit(tx, {
      entityType: 'internal_auditor',
      entityId: userId,
      action: parsed.data.isInternalAuditor ? 'approved' : 'rejected',
      actor: {
        userId: session.user.userId,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role as never,
      },
      previousState: {
        isInternalAuditor: before.isInternalAuditor,
        auditorDomain: before.auditorDomain,
        auditorQualifiedDate: before.auditorQualifiedDate,
      },
      newState: next,
    })
  })

  revalidatePath('/admin/auditors')
  revalidatePath('/admin/audit-programs')
  return { success: true }
}
