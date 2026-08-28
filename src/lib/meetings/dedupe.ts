import crypto from 'node:crypto'

/**
 * Empreinte d'une action extraite par l'IA.
 *
 * Isolée du service (qui porte `server-only`) pour la même raison que
 * audit-record.ts l'est de audit.ts : les scripts de vérification doivent
 * pouvoir l'importer hors du bundler Next. Et c'est justement la règle qu'il
 * faut pouvoir éprouver — c'est elle qui, combinée à l'index unique
 * (meeting_id, dedupe_key), empêche un webhook rejoué de dupliquer les actions.
 *
 * L'empreinte dépend du CONTENU (tâche + responsable), pas du rang dans la
 * liste : une régénération qui réordonne les actions ne recrée donc rien.
 */
export function actionDedupeKey(title: string, responsible: string | null): string {
  const basis = `${title.trim().toLowerCase()}|${(responsible ?? '').trim().toLowerCase()}`
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 64)
}
