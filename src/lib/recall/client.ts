import 'server-only'

/**
 * Client HTTP Recall.ai.
 *
 * `server-only` : la clé d'API ne doit jamais atteindre le navigateur. Elle est
 * lue à l'appel (et non au chargement du module) pour que l'absence de
 * configuration ne fasse pas échouer un rendu qui ne parle pas à Recall.
 *
 * Aucun en-tête ni corps de requête n'est journalisé : ils contiennent le
 * jeton d'authentification et l'URL de la réunion.
 */

/** Régions Recall documentées. La valeur par défaut est la région US. */
const DEFAULT_REGION = 'us-east-1'

export class RecallApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Code court exploitable côté UI, jamais le corps brut de la réponse. */
    readonly code: string,
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'RecallApiError'
  }
}

export class RecallConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecallConfigError'
  }
}

function apiKey(): string {
  const key = process.env.RECALL_API_KEY
  if (!key) {
    throw new RecallConfigError(
      "RECALL_API_KEY n'est pas configurée — l'assistant de réunion IA est indisponible.",
    )
  }
  return key
}

export function recallBaseUrl(): string {
  const region = process.env.RECALL_REGION ?? DEFAULT_REGION
  return `https://${region}.recall.ai`
}

/** true si le module peut fonctionner : sert à masquer l'UI plutôt qu'à planter. */
export function isRecallConfigured(): boolean {
  return Boolean(process.env.RECALL_API_KEY)
}

type RecallRequest = {
  path: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Certaines suppressions renvoient 204 sans corps. */
  expectNoContent?: boolean
}

export async function recallFetch<T>(req: RecallRequest): Promise<T> {
  const { path, method = 'GET', body, expectNoContent = false } = req
  const url = `${recallBaseUrl()}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Token ${apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (err) {
    // Panne réseau / DNS : distinguée d'une erreur applicative Recall pour que
    // l'appelant sache qu'un nouvel essai a du sens.
    throw new RecallApiError(
      'Recall.ai est injoignable.',
      0,
      'recall_unreachable',
      err instanceof Error ? err.message : undefined,
    )
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new RecallApiError(
      `Recall.ai a répondu ${res.status}.`,
      res.status,
      res.status === 401 || res.status === 403
        ? 'recall_auth_failed'
        : res.status === 429
          ? 'recall_rate_limited'
          : res.status >= 500
            ? 'recall_unavailable'
            : 'recall_request_failed',
      detail.slice(0, 500),
    )
  }

  if (expectNoContent || res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Télécharge un artefact via une URL signée renvoyée par Recall. */
export async function recallDownload<T>(downloadUrl: string): Promise<T> {
  const res = await fetch(downloadUrl, { cache: 'no-store' })
  if (!res.ok) {
    throw new RecallApiError(
      `Téléchargement Recall.ai impossible (${res.status}).`,
      res.status,
      'recall_download_failed',
    )
  }
  return (await res.json()) as T
}
