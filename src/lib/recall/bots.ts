import 'server-only'
import { recallFetch } from './client'
import type { CreateBotInput, RecallBot } from './types'
import { BOT_DISPLAY_NAME } from '@/lib/meetings/bot-name'

/**
 * Cycle de vie du bot Recall.ai.
 *
 * Aucun ordonnanceur maison : `join_at` est la programmation. La documentation
 * Recall demande au moins 10 minutes d'avance pour garantir que le bot rejoint
 * à l'heure — en deçà, on crée le bot sans `join_at`, il rejoint immédiatement.
 * C'est ce qui rend le module compatible avec un hébergement serverless : rien
 * ne doit rester en mémoire entre la création de la réunion et son début.
 */

export { MIN_SCHEDULE_LEAD_MS, canSchedule } from '@/lib/meetings/schedule-window'

/**
 * Ré-export : le nom vit dans un module sans dépendance serveur pour que
 * l'écran de création annonce exactement le nom qui rejoindra la réunion.
 * Explicite par conception — pas d'enregistrement dissimulé.
 */
export { BOT_DISPLAY_NAME }

export async function createBot(input: CreateBotInput): Promise<RecallBot> {
  return recallFetch<RecallBot>({
    path: '/api/v1/bot',
    method: 'POST',
    body: {
      meeting_url: input.meetingUrl,
      bot_name: input.botName,
      ...(input.joinAt ? { join_at: input.joinAt } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      // La transcription est demandée dès la création : Recall produit alors
      // le transcript automatiquement et émet `transcript.done`, sans appel
      // supplémentaire de notre part après la réunion.
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: { language_code: 'auto' },
          },
          diarization: { use_separate_streams_when_available: true },
        },
      },
    },
  })
}

export async function getBot(botId: string): Promise<RecallBot> {
  return recallFetch<RecallBot>({ path: `/api/v1/bot/${botId}` })
}

/**
 * Supprime un bot PROGRAMMÉ qui n'a pas encore rejoint la réunion.
 * Recall refuse l'opération une fois le bot en appel — d'où `leaveCall`.
 */
export async function deleteScheduledBot(botId: string): Promise<void> {
  await recallFetch<void>({
    path: `/api/v1/bot/${botId}/`,
    method: 'DELETE',
    expectNoContent: true,
  })
}

/** Fait quitter la réunion à un bot déjà en appel. Irréversible côté Recall. */
export async function leaveCall(botId: string): Promise<void> {
  await recallFetch<void>({
    path: `/api/v1/bot/${botId}/leave_call/`,
    method: 'POST',
    body: {},
    expectNoContent: true,
  })
}
