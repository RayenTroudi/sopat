import 'server-only'
import { createStructuredResponse, AiCallError } from './claude'
import { MEETING_ANALYSIS_INSTRUCTIONS, PROMPT_VERSION } from './prompts'
import {
  parseAnalysis,
  meetingAnalysisSchema,
  MeetingAnalysisValidationError,
  type MeetingAnalysis,
} from './meeting-analysis-schema'

/**
 * Analyse d'une transcription de réunion.
 *
 * Deux barrières successives : le schéma de sortie structurée contraint la
 * génération côté fournisseur, puis Zod revalide la réponse reçue
 * (./meeting-analysis-schema.ts). Les deux dérivent du MÊME schéma Zod, donc
 * elles ne peuvent pas diverger.
 *
 * Ce module ne connaît ni la base ni Recall : il transforme un texte en
 * structure validée. C'est ce qui a permis de changer de fournisseur d'IA sans
 * toucher au reste du module réunions.
 */

export {
  parseAnalysis,
  meetingAnalysisSchema,
  MeetingAnalysisValidationError,
}
export type {
  MeetingAnalysis,
  MeetingActionItemAnalysis,
  MeetingQmsFinding,
} from './meeting-analysis-schema'

export type MeetingAnalysisResult = {
  analysis: MeetingAnalysis
  model: string
  promptVersion: string
  inputTokens: number | null
  outputTokens: number | null
}

export type MeetingAnalysisContext = {
  title: string
  meetingDate: string
  participants?: string | null
  agenda?: string | null
}

/**
 * Le contexte (titre, date, ordre du jour) est fourni comme métadonnée
 * explicitement identifiée, pour que le modèle ne le confonde pas avec des
 * propos tenus en séance — sinon un ordre du jour ambitieux ressort en
 * « décisions ».
 */
function buildInput(transcript: string, context: MeetingAnalysisContext): string {
  const header = [
    `Titre de la réunion : ${context.title}`,
    `Date : ${context.meetingDate}`,
    context.participants ? `Participants annoncés : ${context.participants}` : null,
    context.agenda ? `Ordre du jour annoncé : ${context.agenda}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `${header}

Les éléments ci-dessus sont du contexte administratif, PAS des propos tenus en réunion.

--- DÉBUT DE LA TRANSCRIPTION ---
${transcript}
--- FIN DE LA TRANSCRIPTION ---`
}

export async function analyzeTranscript(
  transcript: string,
  context: MeetingAnalysisContext,
): Promise<MeetingAnalysisResult> {
  const trimmed = transcript.trim()
  if (!trimmed) {
    throw new AiCallError('Transcription vide — analyse impossible.', 'empty_transcript')
  }

  const response = await createStructuredResponse({
    instructions: MEETING_ANALYSIS_INSTRUCTIONS,
    input: buildInput(trimmed, context),
    schema: meetingAnalysisSchema,
    maxOutputTokens: 8000,
  })

  return {
    analysis: parseAnalysis(response.text),
    model: response.model,
    promptVersion: PROMPT_VERSION,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  }
}
