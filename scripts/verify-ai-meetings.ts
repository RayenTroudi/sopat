/**
 * Suite de vérification du module « Réunions IA ».
 *
 * Deux parties :
 *
 *  A. Contrôles PURS (toujours exécutés, aucune base, aucun appel réseau) —
 *     validation d'URL, machine à états, signature de webhook, rapprochement
 *     des noms, validation de la sortie du modèle, empreinte d'idempotence,
 *     mise à plat de la transcription.
 *
 *  B. Contrôles BASE (exécutés si DATABASE_URL est défini) — les trois
 *     garanties d'idempotence reposent sur des index uniques, pas sur du code :
 *     un test qui ne parle pas à Postgres ne prouverait rien à leur sujet. La
 *     suite crée ses propres lignes jetables et les supprime, puis vérifie que
 *     les compteurs d'ouverture sont restaurés.
 *
 * Aucune clé d'API n'est nécessaire : ni OpenAI ni Recall ne sont appelés.
 * L'analyse est éprouvée sur des réponses de modèle enregistrées.
 *
 * Lancement :
 *   npx tsx --env-file=.env scripts/verify-ai-meetings.ts
 *   TEST_DATABASE_URL="postgres://…branche…" npx tsx --env-file=.env scripts/verify-ai-meetings.ts
 */
import crypto from 'node:crypto'
import { selectTestTarget } from './lib/test-target'

// Doit précéder toute opération base : `db` résout DATABASE_URL au premier usage.
const hasDb = Boolean(process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL)
const target = hasDb ? selectTestTarget(false) : null
console.log(target ? `Cible : ${target.label}\n` : 'Aucune DATABASE_URL — partie base ignorée.\n')

import { detectPlatform, createAiMeetingSchema } from '../src/lib/meetings/validation'
import { canTransition, statusForEvent, isTerminal } from '../src/lib/meetings/status'
import {
  verifyRecallSignature,
  recallWebhookSchema,
  isHandledEvent,
  type WebhookHeaders,
} from '../src/lib/recall/webhooks'
import { matchUser } from '../src/lib/meetings/user-matching'
import { parseAnalysis } from '../src/lib/ai/meeting-analysis-schema'
import { flattenUtterances } from '../src/lib/recall/flatten'
import { actionDedupeKey } from '../src/lib/meetings/dedupe'
import { canSchedule } from '../src/lib/meetings/schedule-window'
import { sampleUtterances } from '../src/lib/meetings/sample-transcript'

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    passed++
    console.log(`  ok   ${label}`)
  } else {
    failed++
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

// ═══ 1. Validation des URL de réunion ════════════════════════════════════════

function testUrlValidation() {
  console.log('1. Validation des URL et des plateformes')

  check('Google Meet reconnu', detectPlatform('https://meet.google.com/abc-defg-hij') === 'google_meet')
  check('Zoom reconnu', detectPlatform('https://sopat.zoom.us/j/123456789') === 'zoom')
  check('Teams reconnu', detectPlatform('https://teams.microsoft.com/l/meetup-join/xyz') === 'microsoft_teams')
  check('Webex reconnu', detectPlatform('https://sopat.webex.com/meet/rayen') === 'webex')

  check('domaine non pris en charge refusé', detectPlatform('https://example.com/reunion') === null)
  check('URL malformée refusée', detectPlatform('pas-une-url') === null)
  // Un lien qui contient le nom d'une plateforme dans le CHEMIN ne doit pas
  // passer : c'est exactement le cas qu'une comparaison par `includes` laisse
  // filer, et il enverrait un bot sur une URL arbitraire.
  check('domaine trompeur refusé', detectPlatform('https://evil.example.com/meet.google.com/abc') === null)
  check('sous-domaine Zoom accepté', detectPlatform('https://us02web.zoom.us/j/1') === 'zoom')

  const future = new Date(Date.now() + 3600_000).toISOString()
  const valid = createAiMeetingSchema.safeParse({
    title: 'Réunion de chantier',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    platform: 'google_meet',
    scheduledAt: future,
    autoJoin: true,
    sendEmailReport: true,
  })
  check('formulaire valide accepté', valid.success, valid.success ? '' : JSON.stringify(valid.error.issues[0]))

  const mismatch = createAiMeetingSchema.safeParse({
    title: 'Réunion de chantier',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    platform: 'zoom',
    scheduledAt: future,
    autoJoin: true,
    sendEmailReport: true,
  })
  check('plateforme incohérente avec l’URL refusée', !mismatch.success)

  const shortTitle = createAiMeetingSchema.safeParse({
    title: 'ab',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    platform: 'google_meet',
    scheduledAt: future,
    autoJoin: true,
    sendEmailReport: true,
  })
  check('titre trop court refusé', !shortTitle.success)
}

// ═══ 2. Machine à états ══════════════════════════════════════════════════════

function testStateMachine() {
  console.log('\n2. Machine à états')

  check('scheduled → bot_created', canTransition('scheduled', 'bot_created'))
  check('joining → in_meeting', canTransition('joining', 'in_meeting'))
  check('in_meeting → processing', canTransition('in_meeting', 'processing'))
  check('processing → completed', canTransition('processing', 'completed'))

  // Le cas qui compte : un webhook en retard ne doit pas faire régresser une
  // réunion déjà traitée, sinon un compte rendu produit paraîtrait perdu.
  check('completed → in_meeting refusé (événement en retard)', !canTransition('completed', 'in_meeting'))
  check('processing → joining refusé', !canTransition('processing', 'joining'))
  check('cancelled est terminal', !canTransition('cancelled', 'processing'))
  check('même statut : pas de transition', !canTransition('in_meeting', 'in_meeting'))
  check('failed → processing autorisé (rattrapage)', canTransition('failed', 'processing'))
  check('statut initial accepté', canTransition(null, 'scheduled'))
  check('completed terminal', isTerminal('completed') && !isTerminal('processing'))

  check('bot.in_call_recording → in_meeting', statusForEvent('bot.in_call_recording') === 'in_meeting')
  check('bot.done → processing', statusForEvent('bot.done') === 'processing')
  check('bot.fatal → failed', statusForEvent('bot.fatal') === 'failed')
  check('transcript.failed → failed', statusForEvent('transcript.failed') === 'failed')
  check('événement inconnu → null', statusForEvent('bot.something_else') === null)

  const soon = new Date(Date.now() + 2 * 60_000)
  const later = new Date(Date.now() + 30 * 60_000)
  check('réunion dans 2 min : non programmable chez Recall', !canSchedule(soon))
  check('réunion dans 30 min : programmable', canSchedule(later))
}

// ═══ 3. Webhook : signature et charge utile ══════════════════════════════════

const SECRET = `whsec_${Buffer.from('sopat-secret-de-test-0123456789').toString('base64')}`

function signedHeaders(body: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)): WebhookHeaders {
  const id = 'msg_test_0001'
  const base64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const sig = crypto
    .createHmac('sha256', Buffer.from(base64, 'base64'))
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')
  return { id, timestamp: String(timestamp), signature: `v1,${sig}` }
}

function testWebhookSecurity() {
  console.log('\n3. Webhook : signature et charge utile')

  const body = JSON.stringify({
    event: 'transcript.done',
    data: {
      data: { code: 'done', sub_code: null, updated_at: new Date().toISOString() },
      transcript: { id: 'tr_1', metadata: {} },
      recording: { id: 'rec_1', metadata: {} },
      bot: { id: 'bot_1', metadata: {} },
    },
  })

  check(
    'signature valide acceptée',
    verifyRecallSignature({ secret: SECRET, headers: signedHeaders(body), rawBody: body }).ok,
  )

  const tampered = verifyRecallSignature({
    secret: SECRET,
    headers: signedHeaders(body),
    rawBody: body.replace('bot_1', 'bot_2'),
  })
  check('corps modifié rejeté', !tampered.ok && tampered.reason === 'bad_signature')

  const wrongSecret = verifyRecallSignature({
    secret: `whsec_${Buffer.from('un-autre-secret-totalement-different').toString('base64')}`,
    headers: signedHeaders(body),
    rawBody: body,
  })
  check('mauvais secret rejeté', !wrongSecret.ok && wrongSecret.reason === 'bad_signature')

  const noHeaders = verifyRecallSignature({
    secret: SECRET,
    headers: { id: null, timestamp: null, signature: null },
    rawBody: body,
  })
  check('en-têtes manquants rejetés', !noHeaders.ok && noHeaders.reason === 'missing_headers')

  const stale = verifyRecallSignature({
    secret: SECRET,
    headers: signedHeaders(body, SECRET, Math.floor(Date.now() / 1000) - 3600),
    rawBody: body,
  })
  check('horodatage périmé rejeté (anti-rejeu)', !stale.ok && stale.reason === 'stale_timestamp')

  // Sans secret configuré, tout doit être refusé : un endpoint public non
  // vérifié laisserait déclencher des analyses facturées.
  const unconfigured = verifyRecallSignature({
    secret: undefined,
    headers: signedHeaders(body),
    rawBody: body,
  })
  check('secret absent : tout est rejeté', !unconfigured.ok && unconfigured.reason === 'not_configured')

  check('charge utile valide analysée', recallWebhookSchema.safeParse(JSON.parse(body)).success)
  check('charge utile sans event rejetée', !recallWebhookSchema.safeParse({ data: {} }).success)
  check('événement pris en charge', isHandledEvent('transcript.done'))
  check('événement inconnu ignoré', !isHandledEvent('bot.breakout_room_opened'))
}

// ═══ 4. Rapprochement des noms ═══════════════════════════════════════════════

function testUserMatching() {
  console.log('\n4. Rapprochement nom prononcé → compte SOPAT')

  const users = [
    { id: 'u1', name: 'Ahmed Trabelsi', email: 'ahmed.trabelsi@sopat.tn' },
    { id: 'u2', name: 'Ahmed Ben Salah', email: 'ahmed.bensalah@sopat.tn' },
    { id: 'u3', name: 'Sonia Ben Amor', email: 'sonia@sopat.tn' },
    { id: 'u4', name: 'Karim Mansouri', email: 'karim.m@sopat.tn' },
  ]

  const full = matchUser('Ahmed Trabelsi', users)
  check('nom complet rapproché', full.status === 'matched' && full.userId === 'u1')

  const accents = matchUser('sonia ben amor', users)
  check('casse et accents ignorés', accents.status === 'matched' && accents.userId === 'u3')

  const unique = matchUser('Karim', users)
  check('prénom unique rapproché', unique.status === 'matched' && unique.userId === 'u4')

  // Le test central : deux Ahmed ⇒ aucune affectation. Attribuer au hasard
  // ferait circuler une responsabilité fausse.
  const ambiguous = matchUser('Ahmed', users)
  check('prénom ambigu NON affecté', ambiguous.status === 'ambiguous')

  check('nom inconnu non affecté', matchUser('Mohamed Gharbi', users).status === 'unmatched')
  check('chaîne vide non affectée', matchUser('   ', users).status === 'unmatched')
  check('initiale seule non affectée', matchUser('A.', users).status === 'unmatched')

  const byEmail = matchUser('sonia@sopat.tn', users)
  check('adresse e-mail rapprochée', byEmail.status === 'matched' && byEmail.userId === 'u3')
}

// ═══ 5. Validation de la sortie du modèle ════════════════════════════════════

const VALID_ANALYSIS = {
  summary: 'Réunion de chantier consacrée au retard de livraison du substrat.',
  topics: ['Approvisionnement', 'Retard de plantation'],
  decisions: [{ decision: "Reprendre le réseau d'arrosage de la zone nord avant réception." }],
  actionItems: [
    {
      title: 'Contacter le fournisseur de substrat',
      description: 'Obtenir une date de livraison ferme.',
      responsiblePerson: 'Ahmed',
      deadline: 'demain',
      priority: 'HIGH',
    },
    {
      title: 'Vérifier la clause de pénalité du contrat cadre',
      description: null,
      responsiblePerson: null,
      deadline: null,
      priority: null,
    },
  ],
  risks: ['Les arbustes en jauge ne tiendront pas indéfiniment.'],
  questions: ['Le retard impacte-t-il la date de réception ?'],
  followUps: ['Point hebdomadaire lundi prochain.'],
  qmsFindings: [
    { type: 'SUPPLIER_ISSUE', description: 'Deuxième retard de livraison du même fournisseur ce trimestre.' },
  ],
}

function testAnalysisValidation() {
  console.log('\n5. Validation de la réponse du modèle')

  const parsed = parseAnalysis(JSON.stringify(VALID_ANALYSIS))
  check('réponse structurée valide acceptée', parsed.summary.length > 0)
  check('deux actions extraites', parsed.actionItems.length === 2)
  check(
    'action sans responsable conservée avec null',
    parsed.actionItems[1].responsiblePerson === null && parsed.actionItems[1].deadline === null,
  )
  check('constat QMS typé', parsed.qmsFindings[0].type === 'SUPPLIER_ISSUE')

  let threw = false
  try {
    parseAnalysis('ceci n’est pas du JSON')
  } catch {
    threw = true
  }
  check('réponse non JSON rejetée', threw)

  threw = false
  try {
    parseAnalysis(JSON.stringify({ ...VALID_ANALYSIS, summary: undefined }))
  } catch {
    threw = true
  }
  check('champ obligatoire manquant rejeté', threw)

  threw = false
  try {
    parseAnalysis(
      JSON.stringify({
        ...VALID_ANALYSIS,
        actionItems: [{ ...VALID_ANALYSIS.actionItems[0], priority: 'URGENT' }],
      }),
    )
  } catch {
    threw = true
  }
  check('priorité hors énumération rejetée', threw)

  const empty = parseAnalysis(
    JSON.stringify({
      summary: 'Réunion sans décision ni action.',
      topics: [],
      decisions: [],
      actionItems: [],
      risks: [],
      questions: [],
      followUps: [],
      qmsFindings: [],
    }),
  )
  check('« rien à signaler » est une réponse valide', empty.actionItems.length === 0)
}

// ═══ 6. Idempotence et transcription ═════════════════════════════════════════

function testDedupeAndTranscript() {
  console.log('\n6. Empreinte d’idempotence et transcription')

  const a = actionDedupeKey('Contacter le fournisseur', 'Ahmed')
  const b = actionDedupeKey('  contacter le fournisseur  ', 'ahmed')
  check('empreinte stable (casse et espaces)', a === b)
  check('empreinte différente si responsable différent', a !== actionDedupeKey('Contacter le fournisseur', 'Karim'))
  check('empreinte différente si tâche différente', a !== actionDedupeKey('Autre tâche', 'Ahmed'))
  check('empreinte non vide sans responsable', actionDedupeKey('Tâche', null).length === 64)

  const flat = flattenUtterances(sampleUtterances())
  check('transcription mise à plat non vide', flat.plainText.length > 100)
  check('locuteurs conservés', flat.speakers.includes('Sonia Ben Amor'))
  check('mots comptés', flat.wordCount > 50)
  check('format « Nom : texte »', flat.plainText.startsWith('Sonia Ben Amor: '))

  // Prises de parole consécutives du même locuteur : fusionnées, sinon une
  // transcription temps réel produit des centaines de lignes d'un mot.
  const merged = flattenUtterances([
    { participant: { name: 'Ahmed' }, words: [{ text: 'Bonjour' }] },
    { participant: { name: 'Ahmed' }, words: [{ text: 'à' }, { text: 'tous' }] },
    { participant: { name: 'Sonia' }, words: [{ text: 'Bonjour' }] },
  ])
  check('prises de parole consécutives fusionnées', merged.plainText === 'Ahmed: Bonjour à tous\nSonia: Bonjour')

  check('entrée non conforme tolérée', flattenUtterances(null).plainText === '')
  check('prise de parole vide ignorée', flattenUtterances([{ participant: { name: 'X' }, words: [] }]).plainText === '')
}

// ═══ 7. Contrôles base : les trois verrous d’idempotence ═════════════════════

async function testDatabaseGuarantees() {
  console.log('\n7. Idempotence garantie par la base')

  const { db } = await import('../db/index')
  const {
    meetingMinutes,
    meetingActionItems,
    meetingTranscripts,
    meetingWebhookEvents,
    users: usersTable,
  } = await import('../db/schema')
  const { eq, sql, and, isNull } = await import('drizzle-orm')

  const [actor] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
    .limit(1)

  if (!actor) {
    console.log('  (aucun utilisateur actif — partie base ignorée)')
    return
  }

  const count = async (table: string): Promise<number> => {
    const r = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM ${table}`))
    return Number((r.rows?.[0] as { c: number } | undefined)?.c ?? 0)
  }

  const before = {
    meeting_minutes: await count('meeting_minutes'),
    meeting_action_items: await count('meeting_action_items'),
    meeting_transcripts: await count('meeting_transcripts'),
    meeting_webhook_events: await count('meeting_webhook_events'),
  }

  const suffix = crypto.randomUUID().slice(0, 8)
  const botId = `bot_test_${suffix}`

  // Référence de test explicitement hors format PV-AAAA-NNN : la suite ne doit
  // consommer aucun numéro de la séquence de production.
  const [meeting] = await db
    .insert(meetingMinutes)
    .values({
      reference: `TEST-${suffix}`,
      meetingDate: new Date().toISOString().slice(0, 10),
      meetingType: 'Réunion de vérification automatisée',
      createdBy: actor.id,
      source: 'ai_assistant',
      platform: 'google_meet',
      aiStatus: 'processing',
      recallBotId: botId,
    })
    .returning({ id: meetingMinutes.id })

  try {
    // 1. Un même événement webhook ne peut être inséré qu'une fois.
    const eventId = `msg_test_${suffix}`
    const first = await db
      .insert(meetingWebhookEvents)
      .values({ provider: 'recall', eventId, eventType: 'transcript.done', botId, meetingId: meeting.id })
      .onConflictDoNothing({ target: [meetingWebhookEvents.provider, meetingWebhookEvents.eventId] })
      .returning({ id: meetingWebhookEvents.id })
    const replay = await db
      .insert(meetingWebhookEvents)
      .values({ provider: 'recall', eventId, eventType: 'transcript.done', botId, meetingId: meeting.id })
      .onConflictDoNothing({ target: [meetingWebhookEvents.provider, meetingWebhookEvents.eventId] })
      .returning({ id: meetingWebhookEvents.id })
    check('webhook : première livraison insérée', first.length === 1)
    check('webhook : livraison rejouée ignorée', replay.length === 0)

    // 2. Une seule transcription par réunion.
    await db.insert(meetingTranscripts).values({
      meetingId: meeting.id,
      provider: 'test',
      plainText: 'Ahmed: bonjour',
      wordCount: 2,
    })
    let duplicateTranscript = false
    try {
      await db.insert(meetingTranscripts).values({
        meetingId: meeting.id,
        provider: 'test',
        plainText: 'doublon',
        wordCount: 1,
      })
    } catch {
      duplicateTranscript = true
    }
    check('transcription : doublon refusé par la base', duplicateTranscript)

    // 3. Une action extraite deux fois n'existe qu'une fois.
    const key = actionDedupeKey('Contacter le fournisseur', 'Ahmed')
    const insertedAction = await db
      .insert(meetingActionItems)
      .values({
        meetingId: meeting.id,
        description: 'Contacter le fournisseur',
        responsible: 'Ahmed',
        source: 'ai',
        dedupeKey: key,
        createdBy: actor.id,
      })
      .onConflictDoNothing({ target: [meetingActionItems.meetingId, meetingActionItems.dedupeKey] })
      .returning({ id: meetingActionItems.id })
    const replayedAction = await db
      .insert(meetingActionItems)
      .values({
        meetingId: meeting.id,
        description: 'Contacter le fournisseur',
        responsible: 'Ahmed',
        source: 'ai',
        dedupeKey: key,
        createdBy: actor.id,
      })
      .onConflictDoNothing({ target: [meetingActionItems.meetingId, meetingActionItems.dedupeKey] })
      .returning({ id: meetingActionItems.id })
    check('action : première extraction créée', insertedAction.length === 1)
    check('action : ré-extraction ignorée', replayedAction.length === 0)

    // Les actions saisies à la main (dedupe_key NULL) ne sont pas contraintes :
    // deux NULL ne sont jamais égaux pour Postgres.
    const manual1 = await db
      .insert(meetingActionItems)
      .values({ meetingId: meeting.id, description: 'Action manuelle', createdBy: actor.id })
      .returning({ id: meetingActionItems.id })
    const manual2 = await db
      .insert(meetingActionItems)
      .values({ meetingId: meeting.id, description: 'Action manuelle', createdBy: actor.id })
      .returning({ id: meetingActionItems.id })
    check('actions manuelles non contraintes par l’index', manual1.length === 1 && manual2.length === 1)

    // 4. Deux réunions ne peuvent pas revendiquer le même bot.
    let duplicateBot = false
    try {
      await db.insert(meetingMinutes).values({
        reference: `TEST-${suffix}-bis`,
        meetingDate: new Date().toISOString().slice(0, 10),
        createdBy: actor.id,
        source: 'ai_assistant',
        recallBotId: botId,
      })
    } catch {
      duplicateBot = true
    }
    check('bot Recall : un seul PV par bot', duplicateBot)
  } finally {
    // Nettoyage complet — la suite ne doit rien laisser derrière elle.
    await db.delete(meetingWebhookEvents).where(eq(meetingWebhookEvents.meetingId, meeting.id))
    await db.delete(meetingActionItems).where(eq(meetingActionItems.meetingId, meeting.id))
    await db.delete(meetingTranscripts).where(eq(meetingTranscripts.meetingId, meeting.id))
    await db.execute(
      sql`DELETE FROM record_audit_log WHERE entity_type IN ('meeting_minute','meeting_action_item') AND entity_id = ${meeting.id}`,
    )
    await db.delete(meetingMinutes).where(eq(meetingMinutes.id, meeting.id))
  }

  const after = {
    meeting_minutes: await count('meeting_minutes'),
    meeting_action_items: await count('meeting_action_items'),
    meeting_transcripts: await count('meeting_transcripts'),
    meeting_webhook_events: await count('meeting_webhook_events'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }
}

// ═══ Exécution ═══════════════════════════════════════════════════════════════

async function main() {
  testUrlValidation()
  testStateMachine()
  testWebhookSecurity()
  testUserMatching()
  testAnalysisValidation()
  testDedupeAndTranscript()

  if (hasDb) {
    try {
      await testDatabaseGuarantees()
    } catch (err) {
      failed++
      console.log(`  FAIL partie base — ${err instanceof Error ? err.message : String(err)}`)
    }
  } else {
    console.log('\n7. Idempotence garantie par la base — ignorée (DATABASE_URL absent)')
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
