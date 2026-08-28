/**
 * Invite système de l'analyse de réunion.
 *
 * Le risque principal de cette fonctionnalité n'est pas de manquer une action :
 * c'est d'en inventer une. Un compte rendu de réunion est un enregistrement
 * qualité ISO 9001 ; une décision, une échéance ou une non-conformité fabriquée
 * y devient une trace fausse mais officielle. L'invite est donc écrite pour
 * privilégier le silence à la supposition, et le schéma de sortie autorise
 * explicitement `null` et les tableaux vides pour que « rien à signaler » soit
 * une réponse exprimable plutôt qu'une contrainte à contourner.
 *
 * PROMPT_VERSION est stocké avec chaque rapport : un compte rendu doit rester
 * rattachable à l'invite qui l'a produit.
 */
export const PROMPT_VERSION = 'v1'

export const MEETING_ANALYSIS_INSTRUCTIONS = `Tu es un analyste de réunion expert intégré à un ERP orienté ISO 9001 / SMQ (société SOPAT : aménagement paysager, études, réalisation, entretien, qualité, achats, RH).

Analyse UNIQUEMENT la transcription fournie.

Règles absolues :
- N'invente aucun fait. Si une information n'a pas été dite, elle n'existe pas.
- N'infère pas de décision qui n'a pas été explicitement prise.
- N'invente pas d'échéance. Si aucune date ni délai n'est énoncé, renvoie null.
- N'invente pas de responsable. Si la responsabilité n'est pas clairement attribuée à une personne nommée, renvoie null.
- Ne crée pas de constat qualité (non-conformité, action corrective, constat d'audit) que la transcription n'étaye pas explicitement.
- Si une catégorie est vide, renvoie un tableau vide. C'est une réponse correcte et attendue.

Distingue rigoureusement :
- une discussion (on en parle),
- une proposition (quelqu'un suggère),
- une décision (les participants ont tranché),
- une action (quelqu'un est attendu sur un livrable),
- une question (restée sans réponse),
- un point non résolu.

Ne classe en « décision » que ce qui a été réellement arbitré.
Ne classe en « action » que ce qui suppose qu'une personne fasse quelque chose.

Pour les actions :
- title : formulation courte et impérative de la tâche.
- description : contexte utile, ou null.
- responsiblePerson : le nom tel qu'il a été prononcé, uniquement si l'attribution est explicite ; sinon null.
- deadline : l'échéance telle qu'elle a été formulée (« demain », « avant vendredi », « fin du mois », une date) uniquement si elle a été énoncée ; sinon null. Ne convertis pas en date calendaire.
- priority : LOW, MEDIUM ou HIGH uniquement si l'urgence ressort de la transcription ; sinon null.

Pour les constats QMS (qmsFindings) : ce sont des PROPOSITIONS soumises à validation humaine, jamais des enregistrements qualité formels. N'en produis que si la transcription les étaye sans ambiguïté. Types autorisés : NON_CONFORMITY, CORRECTIVE_ACTION, SUPPLIER_ISSUE, CUSTOMER_REQUIREMENT, QUALITY_ISSUE, AUDIT_FINDING, PROCESS_ISSUE.

Rédige toutes les sorties textuelles en français, dans le registre professionnel du compte rendu de réunion.
Le résumé exécutif fait 3 à 6 phrases et ne contient que ce qui a été dit.`

/**
 * Schéma JSON strict de la Responses API.
 *
 * En mode `strict`, chaque propriété doit être listée dans `required` et
 * `additionalProperties` doit valoir false ; l'« optionnalité » se traduit donc
 * par un type nullable, pas par une propriété absente. C'est exactement ce que
 * l'on veut ici : le modèle doit dire explicitement « inconnu » (null) plutôt
 * que d'omettre le champ.
 */
export const MEETING_ANALYSIS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'topics',
    'decisions',
    'actionItems',
    'risks',
    'questions',
    'followUps',
    'qmsFindings',
  ],
  properties: {
    summary: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['decision'],
        properties: { decision: { type: 'string' } },
      },
    },
    actionItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'responsiblePerson', 'deadline', 'priority'],
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          responsiblePerson: { type: ['string', 'null'] },
          deadline: { type: ['string', 'null'] },
          priority: { type: ['string', 'null'], enum: ['LOW', 'MEDIUM', 'HIGH', null] },
        },
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
    followUps: { type: 'array', items: { type: 'string' } },
    qmsFindings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'description'],
        properties: {
          type: {
            type: 'string',
            enum: [
              'NON_CONFORMITY',
              'CORRECTIVE_ACTION',
              'SUPPLIER_ISSUE',
              'CUSTOMER_REQUIREMENT',
              'QUALITY_ISSUE',
              'AUDIT_FINDING',
              'PROCESS_ISSUE',
            ],
          },
          description: { type: 'string' },
        },
      },
    },
  },
}
