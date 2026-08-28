import 'server-only'
import { createStructuredResponse, OpenAiCallError } from './openai'
import {
  MEETING_ANALYSIS_INSTRUCTIONS,
  MEETING_ANALYSIS_JSON_SCHEMA,
  PROMPT_VERSION,
} from './prompts'
import {
  parseAnalysis,
  meetingAnalysisSchema,
  MeetingAnalysisValidationError,
  type MeetingAnalysis,
} from './meeting-analysis-schema'

/**
 * Analyse d'une transcription de réunion.
 *
 * Deux barrières successives : le JSON Schema strict contraint la génération
 * côté OpenAI, puis Zod revalide ici (./meeting-analysis-schema.ts).
 *
 * Ce module ne connaît ni la base ni Recall : il transforme un texte en
 * structure validée. C'est ce qui permet de changer de modèle — voire de
 * fournisseur — sans toucher au reste du module réunions.
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
    throw new OpenAiCallError('Transcription vide — analyse impossible.', 'empty_transcript')
  }

  const response = await createStructuredResponse({
    instructions: MEETING_ANALYSIS_INSTRUCTIONS,
    input: buildInput(trimmed, context),
    schemaName: 'meeting_analysis',
    schema: MEETING_ANALYSIS_JSON_SCHEMA,
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
