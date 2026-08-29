import { z } from 'zod'

/**
 * Forme validée du compte rendu produit par le modèle.
 *
 * Séparée du client d'IA (qui porte `server-only` et la clé d'API) pour être
 * importable par les scripts de vérification : la validation est précisément ce
 * qu'il faut pouvoir éprouver sans dépenser un appel au modèle.
 *
 * Ce schéma sert DEUX fois : converti en JSON Schema par le SDK, il contraint
 * la génération côté fournisseur ; puis il valide la réponse reçue. Une seule
 * définition, donc aucune divergence possible entre ce qui est demandé au
 * modèle et ce que le code accepte. La seconde passe reste utile : elle
 * contrôle ce qui arrive réellement — y compris quand la réponse vient d'un jeu
 * d'essai local plutôt que du fournisseur.
 */

export const meetingAnalysisSchema = z.object({
  summary: z.string().min(1),
  topics: z.array(z.string()),
  decisions: z.array(z.object({ decision: z.string().min(1) })),
  actionItems: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().nullable(),
      /** Nom prononcé en réunion — le rapprochement avec un compte SOPAT se fait ailleurs. */
      responsiblePerson: z.string().nullable(),
      /** Échéance telle qu'énoncée, jamais convertie en date par le modèle. */
      deadline: z.string().nullable(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable(),
    }),
  ),
  risks: z.array(z.string()),
  questions: z.array(z.string()),
  followUps: z.array(z.string()),
  qmsFindings: z.array(
    z.object({
      type: z.enum([
        'NON_CONFORMITY',
        'CORRECTIVE_ACTION',
        'SUPPLIER_ISSUE',
        'CUSTOMER_REQUIREMENT',
        'QUALITY_ISSUE',
        'AUDIT_FINDING',
        'PROCESS_ISSUE',
      ]),
      description: z.string().min(1),
    }),
  ),
})

export type MeetingAnalysis = z.infer<typeof meetingAnalysisSchema>
export type MeetingActionItemAnalysis = MeetingAnalysis['actionItems'][number]
export type MeetingQmsFinding = MeetingAnalysis['qmsFindings'][number]

export class MeetingAnalysisValidationError extends Error {
  constructor(readonly issues: string) {
    super('La réponse du modèle ne respecte pas le format attendu.')
    this.name = 'MeetingAnalysisValidationError'
  }
}

/** Analyse et valide le texte renvoyé par le modèle. Aucun appel réseau. */
export function parseAnalysis(rawText: string): MeetingAnalysis {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    throw new MeetingAnalysisValidationError('réponse non JSON')
  }
  const parsed = meetingAnalysisSchema.safeParse(json)
  if (!parsed.success) {
    throw new MeetingAnalysisValidationError(
      parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
        .slice(0, 500),
    )
  }
  return parsed.data
}
