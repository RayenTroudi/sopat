import 'server-only'
import { auth, type LegacySession } from '@/lib/auth'
import type { UserRole } from '@/lib/auth-utils'

/**
 * Autorisation du module réunions.
 *
 * SOPAT est mono-locataire : il n'existe pas d'organisation à cloisonner, et en
 * inventer une ici créerait un second modèle de tenancy que rien d'autre dans
 * l'ERP ne respecterait. Le contrôle porte donc sur ce qui existe réellement :
 * une session authentifiée, le rôle, et — pour les opérations coûteuses — la
 * propriété de l'enregistrement.
 *
 * Les identifiants transmis par le navigateur ne servent qu'à désigner la
 * ligne à lire ; l'acteur et ses droits sont toujours résolus côté serveur à
 * partir de la session.
 */

/** Rôles autorisés sur /admin/meetings, alignés sur ROLE_ALLOWED_PREFIXES. */
export const MEETING_ROLES: UserRole[] = ['admin', 'direction']

export type MeetingAuthorization =
  | { ok: true; session: LegacySession }
  | { ok: false; status: 401 | 403; error: string }

export async function authorizeMeetingAccess(): Promise<MeetingAuthorization> {
  const session = await auth()
  if (!session) return { ok: false, status: 401, error: 'Non autorisé' }
  if (!MEETING_ROLES.includes(session.user.role)) {
    return { ok: false, status: 403, error: 'Accès refusé' }
  }
  return { ok: true, session }
}

/**
 * Opérations qui consomment un bot Recall ou un appel au modèle facturé
 * (création, annulation, relance d'analyse, renvoi d'e-mail). Réservées aux
 * rôles du module ET, au-delà, au créateur du PV : un compte `direction` garde
 * la main sur tout, mais on ne veut pas qu'un rôle large relance par accident
 * l'analyse d'un PV qui ne le concerne pas.
 */
export function canMutateMeeting(
  session: LegacySession,
  meeting: { createdBy: string },
): boolean {
  if (!MEETING_ROLES.includes(session.user.role)) return false
  return session.user.role === 'admin'
    || session.user.role === 'direction'
    || meeting.createdBy === session.user.userId
}
