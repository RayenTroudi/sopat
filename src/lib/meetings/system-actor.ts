import type { AuditActor } from '@/lib/audit-record'
import { SYSTEM_USER_ID } from '@/lib/system-user'

/**
 * Acteur des écritures déclenchées par un webhook.
 *
 * Un webhook n'a pas d'utilisateur connecté, mais les colonnes `created_by` et
 * le journal d'audit exigent un uuid réel : c'est le compte système créé par la
 * migration 0026 (inactif, non connectable). Le journal montre donc « traité
 * par le système » plutôt qu'un utilisateur qui n'a rien fait — ce qui est
 * exactement ce qu'un auditeur doit lire.
 */
export const SYSTEM_ACTOR: AuditActor = {
  userId: SYSTEM_USER_ID,
  name: 'Assistant de réunion IA',
  email: null,
  role: 'admin',
}
