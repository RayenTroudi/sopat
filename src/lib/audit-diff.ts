/**
 * Calcul du delta journalisé pour la traçabilité ISO.
 *
 * Séparé de audit.ts (qui est `server-only` car il touche la base) pour rester
 * une fonction pure, testable isolément : c'est la partie où une erreur passe
 * le plus facilement inaperçue — un champ considéré à tort comme inchangé
 * disparaît silencieusement du journal.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { previous: Record<string, unknown>; next: Record<string, unknown> } | null {
  const previous: Record<string, unknown> = {}
  const next: Record<string, unknown> = {}

  for (const [key, incoming] of Object.entries(after)) {
    if (incoming === undefined) continue // champ non soumis : pas une modification
    const current = before[key]
    // Comparaison en chaîne : les numeric/date Postgres arrivent en string et
    // le formulaire renvoie aussi des strings.
    if (String(current ?? '') === String(incoming ?? '')) continue
    previous[key] = current ?? null
    next[key] = incoming ?? null
  }

  return Object.keys(next).length ? { previous, next } : null
}
