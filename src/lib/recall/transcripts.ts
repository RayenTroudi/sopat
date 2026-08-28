import 'server-only'
import { recallDownload, recallFetch, RecallApiError } from './client'
import { flattenUtterances, type FlattenedTranscript } from './flatten'
import type { RecallTranscript, RecallUtterance } from './types'

/**
 * Récupération de la transcription Recall.ai.
 *
 * La mise à plat vit dans ./flatten.ts (module pur, testable hors bundler) ;
 * ici on ne garde que ce qui touche au réseau et à la clé d'API.
 *
 * On conserve à la fois la forme brute (utterances) et le texte : les
 * locuteurs et les horodatages ne seraient pas reconstituables à partir du
 * texte seul.
 */

export { flattenUtterances }
export type { FlattenedTranscript }

export async function getTranscript(transcriptId: string): Promise<RecallTranscript> {
  return recallFetch<RecallTranscript>({ path: `/api/v1/transcript/${transcriptId}/` })
}

/** Récupère la transcription puis télécharge et met à plat son contenu. */
export async function fetchTranscriptContent(transcriptId: string): Promise<FlattenedTranscript> {
  const transcript = await getTranscript(transcriptId)
  const downloadUrl = transcript.data?.download_url
  if (!downloadUrl) {
    throw new RecallApiError(
      "La transcription Recall.ai n'expose pas d'URL de téléchargement.",
      404,
      'transcript_unavailable',
    )
  }
  const utterances = await recallDownload<RecallUtterance[]>(downloadUrl)
  return flattenUtterances(utterances)
}
