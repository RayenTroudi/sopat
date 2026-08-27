import 'server-only'

/**
 * Traçabilité ISO 9001 : « Every action must be logged — Created By, Modified
 * By, Approved By, Date, Previous Value, New Value ».
 *
 * Point d'entrée pour les composants et server actions. L'implémentation vit
 * dans audit-record.ts, sans `server-only`, afin que les registres serveur
 * restent importables par les scripts tsx (migrations, vérifications) qui
 * tournent hors du bundler Next.
 */
export {
  recordAudit,
  getRecordAuditTrail,
  type AuditActor,
  type AuditEntityType,
  type AuditAction,
} from '@/lib/audit-record'

// Ne conserve que les champs réellement modifiés (fonction pure, cf.
// audit-diff.ts) ; ré-exporté ici pour que les appelants aient un seul import.
export { diffFields } from '@/lib/audit-diff'
