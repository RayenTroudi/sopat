import type { RecallUtterance } from './types'

/**
 * Mise à plat des « utterances » Recall en texte lisible.
 *
 * Séparée du client HTTP (qui porte `server-only` et la clé d'API) pour rester
 * importable par les scripts de vérification. C'est la transformation qui
 * mérite le plus d'être testée : c'est elle qui détermine ce que le modèle
 * verra réellement de la réunion.
 */

export type FlattenedTranscript = {
  utterances: RecallUtterance[]
  plainText: string
  wordCount: number
  speakers: string[]
}

/**
 * « Nom : phrase » par prise de parole. Les prises de parole consécutives d'un
 * même locuteur sont fusionnées : sans cela, une transcription en temps réel
 * produit des centaines de lignes d'un ou deux mots, ce qui gonfle le contexte
 * envoyé au modèle sans rien apporter.
 */
export function flattenUtterances(raw: unknown): FlattenedTranscript {
  const utterances: RecallUtterance[] = Array.isArray(raw) ? (raw as RecallUtterance[]) : []

  const speakers = new Set<string>()
  const lines: { speaker: string; text: string }[] = []
  let wordCount = 0

  for (const utterance of utterances) {
    const words = Array.isArray(utterance?.words) ? utterance.words : []
    const text = words
      .map((w) => (typeof w?.text === 'string' ? w.text : ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) continue

    wordCount += words.length
    const speaker = utterance?.participant?.name?.trim() || 'Participant inconnu'
    speakers.add(speaker)

    const previous = lines[lines.length - 1]
    if (previous && previous.speaker === speaker) {
      previous.text = `${previous.text} ${text}`
    } else {
      lines.push({ speaker, text })
    }
  }

  return {
    utterances,
    plainText: lines.map((l) => `${l.speaker}: ${l.text}`).join('\n'),
    wordCount,
    speakers: [...speakers],
  }
}
