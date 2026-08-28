/**
 * Rapprochement d'un nom prononcé en réunion avec un compte SOPAT.
 *
 * Le risque n'est pas de laisser une action non affectée — c'est d'affecter la
 * mauvaise personne. Une action attribuée à tort circule ensuite comme une
 * responsabilité réelle, et personne ne va rouvrir la transcription pour la
 * vérifier. Le rapprochement est donc délibérément conservateur : il n'affecte
 * que s'il existe EXACTEMENT un candidat. Ambiguïté, homonymie ou aucun compte
 * → assigneeId null, le nom prononcé reste dans `responsible`, et l'écran
 * laisse un humain trancher.
 *
 * Fonction pure : testable sans base de données.
 */

export type MatchableUser = {
  id: string
  name: string
  email: string
}

export type MatchResult =
  | { status: 'matched'; userId: string }
  | { status: 'ambiguous'; candidates: string[] }
  | { status: 'unmatched' }

/** Minuscules, sans accents, espaces normalisés. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string): string[] {
  return normalizeName(value).split(' ').filter(Boolean)
}

/**
 * Stratégie, du plus sûr au moins sûr — on s'arrête au premier niveau qui
 * produit des candidats, et on n'affecte que s'il n'y en a qu'un :
 *
 *   1. nom complet identique
 *   2. adresse e-mail (nom prononcé contenant un @, ou partie locale identique)
 *   3. prénom seul, ou nom de famille seul, identique à un token du compte
 *
 * Un prénom qui correspond à deux comptes (« Ahmed » deux fois) est ambigu,
 * jamais arbitré au hasard.
 */
export function matchUser(spokenName: string, users: MatchableUser[]): MatchResult {
  const spoken = normalizeName(spokenName)
  if (!spoken) return { status: 'unmatched' }

  const spokenTokens = tokens(spokenName)

  const levels: ((u: MatchableUser) => boolean)[] = [
    (u) => normalizeName(u.name) === spoken,
    (u) => {
      const email = u.email.toLowerCase()
      const local = normalizeName(email.split('@')[0] ?? '')
      return email === spokenName.trim().toLowerCase() || (local.length > 2 && local === spoken)
    },
    (u) => {
      if (spokenTokens.length !== 1) return false
      const userTokens = tokens(u.name)
      // Un token d'une ou deux lettres (une initiale) ne suffit jamais.
      return spokenTokens[0].length > 2 && userTokens.includes(spokenTokens[0])
    },
  ]

  for (const predicate of levels) {
    const candidates = users.filter(predicate)
    if (candidates.length === 1) return { status: 'matched', userId: candidates[0].id }
    if (candidates.length > 1) {
      return { status: 'ambiguous', candidates: candidates.map((c) => c.id) }
    }
  }

  return { status: 'unmatched' }
}
