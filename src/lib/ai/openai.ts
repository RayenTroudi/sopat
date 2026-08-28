import 'server-only'
import OpenAI from 'openai'

/**
 * Accès à l'API OpenAI — point d'entrée unique côté serveur.
 *
 * `server-only` : ni la clé ni le client ne doivent atteindre le navigateur.
 * Le modèle est lu dans l'environnement à chaque appel et jamais codé en dur :
 * changer de modèle (coût, qualité, fournisseur) doit rester une variable
 * d'environnement, pas une modification de code.
 */

export class OpenAiConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAiConfigError'
  }
}

export class OpenAiCallError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'OpenAiCallError'
  }
}

let _client: OpenAI | null = null

export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new OpenAiConfigError(
      "OPENAI_API_KEY n'est pas configurée — l'analyse des réunions est indisponible.",
    )
  }
  if (!_client) _client = new OpenAI({ apiKey })
  return _client
}

export function getOpenAiModel(): string {
  const model = process.env.OPENAI_MODEL
  if (!model) {
    throw new OpenAiConfigError(
      "OPENAI_MODEL n'est pas configuré — renseignez le modèle à utiliser.",
    )
  }
  return model
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL)
}

/**
 * Appel « sortie structurée » de la Responses API : le modèle est contraint par
 * un JSON Schema strict, ce qui évite d'analyser du texte libre. La validation
 * Zod de l'appelant reste indispensable — le schéma contraint la forme, pas la
 * cohérence métier.
 */
export async function createStructuredResponse(args: {
  instructions: string
  input: string
  schemaName: string
  schema: Record<string, unknown>
  maxOutputTokens?: number
}): Promise<{ text: string; inputTokens: number | null; outputTokens: number | null; model: string }> {
  const client = getOpenAiClient()
  const model = getOpenAiModel()

  try {
    const response = await client.responses.create({
      model,
      instructions: args.instructions,
      input: args.input,
      ...(args.maxOutputTokens ? { max_output_tokens: args.maxOutputTokens } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: args.schemaName,
          strict: true,
          schema: args.schema,
        },
      },
    })

    const text = response.output_text
    if (!text) {
      throw new OpenAiCallError('Réponse OpenAI vide.', 'openai_empty_response')
    }

    return {
      text,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      model,
    }
  } catch (err) {
    if (err instanceof OpenAiCallError) throw err
    if (err instanceof OpenAI.APIError) {
      // Le message d'OpenAI n'est pas montré à l'utilisateur : il peut contenir
      // des extraits de la requête. Seul un code court remonte.
      throw new OpenAiCallError(
        `OpenAI a répondu ${err.status ?? 'une erreur'}.`,
        err.status === 401 ? 'openai_auth_failed'
          : err.status === 429 ? 'openai_rate_limited'
          : (err.status ?? 0) >= 500 ? 'openai_unavailable'
          : 'openai_request_failed',
        err.message?.slice(0, 500),
      )
    }
    throw new OpenAiCallError(
      'Appel OpenAI impossible.',
      'openai_unreachable',
      err instanceof Error ? err.message.slice(0, 500) : undefined,
    )
  }
}
