import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { z } from 'zod'

/**
 * Accès à l'API Claude (Anthropic) — point d'entrée unique côté serveur.
 *
 * `server-only` : ni la clé ni le client ne doivent atteindre le navigateur.
 * Le modèle est lu dans l'environnement à chaque appel et jamais codé en dur :
 * changer de modèle (coût, qualité) doit rester une variable d'environnement,
 * pas une modification de code.
 *
 * Ce module est la SEULE frontière avec le fournisseur d'IA. Le reste du
 * module réunions ne connaît que `createStructuredResponse()` et les codes
 * d'erreur ci-dessous — c'est ce qui a permis de passer d'OpenAI à Claude sans
 * toucher au service, au webhook, à l'e-mail ni aux écrans.
 */

/**
 * Modèle par défaut si CLAUDE_MODEL n'est pas renseigné. Haiku 4.5 : le module
 * traite potentiellement beaucoup de transcriptions, et l'extraction est une
 * tâche de lecture structurée plus qu'un raisonnement ouvert. Reste
 * surchargeable par variable d'environnement, sans modification de code.
 */
const DEFAULT_MODEL = 'claude-haiku-4-5'

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiConfigError'
  }
}

export class AiCallError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'AiCallError'
  }
}

let _client: Anthropic | null = null

function getClient(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    throw new AiConfigError(
      "CLAUDE_API_KEY n'est pas configurée — l'analyse des réunions est indisponible.",
    )
  }
  // La clé est passée explicitement : le SDK lirait sinon ANTHROPIC_API_KEY,
  // qui n'est pas la variable retenue ici.
  if (!_client) _client = new Anthropic({ apiKey })
  return _client
}

export function getAiModel(): string {
  return process.env.CLAUDE_MODEL || DEFAULT_MODEL
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.CLAUDE_API_KEY)
}

/**
 * Appel « sortie structurée » : le modèle est contraint par le schéma Zod
 * fourni, converti en JSON Schema par le SDK. Une seule définition de schéma
 * sert donc à la fois à contraindre la génération et à valider la réponse — il
 * n'y a plus de schéma JSON écrit à la main susceptible de diverger du type
 * TypeScript.
 *
 * La validation Zod de l'appelant reste faite malgré tout : le schéma contraint
 * la forme, pas la cohérence métier, et `parsed_output` peut être null si le
 * modèle s'est arrêté avant d'avoir fini.
 */
export async function createStructuredResponse<T extends z.ZodType>(args: {
  instructions: string
  input: string
  schema: T
  maxOutputTokens?: number
}): Promise<{ text: string; inputTokens: number | null; outputTokens: number | null; model: string }> {
  const client = getClient()
  const model = getAiModel()

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: args.maxOutputTokens ?? 8000,
      system: args.instructions,
      messages: [{ role: 'user', content: args.input }],
      output_config: { format: zodOutputFormat(args.schema) },
    })

    // Un refus de sécurité renvoie un HTTP 200 : sans ce contrôle, on
    // essaierait d'analyser un contenu vide et l'erreur remontée serait
    // « réponse non JSON », qui n'explique rien.
    if (response.stop_reason === 'refusal') {
      throw new AiCallError(
        "Le modèle a refusé de traiter cette transcription.",
        'ai_refusal',
        response.stop_details?.category ?? undefined,
      )
    }
    if (response.stop_reason === 'max_tokens') {
      throw new AiCallError(
        'La réponse du modèle a été tronquée (limite de jetons atteinte).',
        'ai_truncated',
      )
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    if (!text) {
      throw new AiCallError('Réponse du modèle vide.', 'ai_empty_response')
    }

    return {
      text,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      model,
    }
  } catch (err) {
    if (err instanceof AiCallError) throw err
    if (err instanceof Anthropic.APIError) {
      // Le message du fournisseur n'est pas montré à l'utilisateur : il peut
      // contenir des extraits de la requête, donc de la transcription.
      throw new AiCallError(
        `L'API Claude a répondu ${err.status ?? 'une erreur'}.`,
        err.status === 401 ? 'ai_auth_failed'
          : err.status === 429 ? 'ai_rate_limited'
          : (err.status ?? 0) >= 500 ? 'ai_unavailable'
          : 'ai_request_failed',
        err.message?.slice(0, 500),
      )
    }
    throw new AiCallError(
      'Appel au modèle impossible.',
      'ai_unreachable',
      err instanceof Error ? err.message.slice(0, 500) : undefined,
    )
  }
}
