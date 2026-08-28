/**
 * Fenêtre de programmation d'un bot Recall.
 *
 * La documentation Recall demande au moins 10 minutes d'avance pour garantir
 * qu'un bot programmé rejoint à l'heure ; en deçà, mieux vaut créer le bot
 * immédiatement que réserver un créneau non garanti (et risquer un 507).
 *
 * Module pur, sans dépendance serveur : importable par les scripts de
 * vérification comme par l'UI.
 */

/** Marge minimale exigée par Recall pour un bot programmé. */
export const MIN_SCHEDULE_LEAD_MS = 10 * 60 * 1000

export function canSchedule(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() - now.getTime() >= MIN_SCHEDULE_LEAD_MS
}
