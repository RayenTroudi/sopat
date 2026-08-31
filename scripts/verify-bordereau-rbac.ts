/**
 * FOR-CO-02 — autorisation, propriété et état, vérifiées en HTTP RÉEL.
 *
 * Ce que ce test apporte
 * ----------------------
 * `verify-bordereau.ts` exerce le registre : les fonctions qui écrivent. Il ne
 * traverse jamais une route, donc il ne prouve rien sur les 401 / 403, ni sur
 * les gardes que les routes appliquent avant d'appeler le registre. Le contrôle
 * d'accès d'une application web vit dans ses routes ; le vérifier en appelant
 * les fonctions internes revient à vérifier une serrure en passant par la
 * fenêtre.
 *
 * Chaque cas ci-dessous est donc un vrai `fetch` vers un vrai serveur, avec un
 * vrai cookie de session scellé par `iron-session` avec le secret de
 * l'application — c'est-à-dire exactement ce que le serveur aurait émis après
 * une connexion.
 *
 * Sécurité du test
 * ----------------
 * Il refuse de démarrer sans `TEST_DATABASE_URL` : il crée, approuve et
 * supprime des offres, et rien de tout cela ne doit toucher la production. Le
 * serveur visé doit pointer sur la MÊME base isolée (scripts/dev-qms-verify.mjs).
 *
 *   TEST_DATABASE_URL="postgres://…branche…" \
 *   npx tsx --env-file=.env scripts/verify-bordereau-rbac.ts [--base http://localhost:3010]
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error(
    '\nCe test crée et supprime des offres, et appelle un serveur qui écrit en base.\n' +
    'Il exige une branche isolée :\n' +
    '  TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env scripts/verify-bordereau-rbac.ts\n',
  )
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Base   : ${target.label}`)

import { readFileSync } from 'fs'
import { join } from 'path'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  commercialOffers,
  offerImports,
  offerLineItems,
  offerPaymentMilestones,
  offerVersions,
  projects,
  recordAuditLog,
  users,
} from '../db/schema'
import { mintSessionCookie } from './lib/qms-session'
import type { UserRole } from '../src/lib/auth-utils'

const baseIdx = process.argv.indexOf('--base')
const BASE = baseIdx >= 0 ? process.argv[baseIdx + 1] : 'http://localhost:3010'
console.log(`Serveur: ${BASE}\n`)

const WORKBOOK = join(__dirname, '..', 'FOR CO 02 Bordereau des prix.xltx')

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

type Actor = { label: string; cookie: string | null; role: UserRole | 'anonyme' }

async function req(
  actor: Actor,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {}
  if (actor.cookie) headers.cookie = actor.cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  })
  let json: Record<string, unknown> = {}
  try { json = (await res.json()) as Record<string, unknown> } catch { /* binaire ou vide */ }
  return { status: res.status, json }
}

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

async function main() {
  // ── Le serveur doit répondre, et parler à la MÊME base isolée ────────────
  try {
    const ping = await fetch(`${BASE}/login`, { redirect: 'manual' })
    check('le serveur de vérification répond', ping.status < 500, String(ping.status))
  } catch (e) {
    console.error(`\nServeur injoignable sur ${BASE}. Démarrez-le :\n  node scripts/dev-qms-verify.mjs\n`, e)
    process.exit(2)
  }

  const before = {
    commercialOffers: await count('commercial_offers'),
    offerLineItems: await count('offer_line_items'),
    offerVersions: await count('offer_versions'),
    offerImports: await count('offer_imports'),
    offerMilestones: await count('offer_payment_milestones'),
    recordAuditLog: await count('record_audit_log'),
    projects: await count('projects'),
    users: await count('users'),
  }

  const roleRows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
  const pick = (role: string) => roleRows.find((r) => r.role === role)

  const adminRow = pick('admin')
  const directionRow = pick('direction')
  const chefRow = pick('etudes_chef')
  const fieldRow = pick('realisation_team') ?? pick('etudes_team')
  if (!adminRow || !directionRow || !chefRow || !fieldRow) {
    console.error('\nRôles manquants dans la base de test.')
    process.exit(2)
  }

  const mk = async (row: typeof adminRow, label: string): Promise<Actor> => ({
    label,
    role: row.role,
    cookie: await mintSessionCookie({
      userId: row.id, email: row.email, name: row.name ?? label, role: row.role,
    }),
  })

  const anonymous: Actor = { label: 'anonyme', cookie: null, role: 'anonyme' }
  const admin = await mk(adminRow, 'admin')
  const direction = await mk(directionRow, 'direction')
  const chef = await mk(chefRow, "chef d'études")
  const field = await mk(fieldRow, `terrain (${fieldRow.role})`)

  // Le cookie doit être accepté : sinon tous les 403 attendus seraient des 401
  // et le test passerait pour de mauvaises raisons.
  // Un chantier ne peut porter qu'UN bordereau approuvé. Choisir « le premier
  // projet venu » rendrait la suite dépendante de l'ordre d'exécution : une
  // offre approuvée laissée par un autre essai ferait échouer l'approbation
  // ici, pour une raison étrangère à ce qui est vérifié.
  const freeProjects = await db.execute<{ id: string; client_id: string | null }>(sql`
    SELECT p.id::text, p.client_id::text
      FROM projects p
     WHERE p.deleted_at IS NULL
       AND NOT EXISTS (
             SELECT 1 FROM commercial_offers o
              WHERE o.project_id = p.id
                AND o.approved_version_id IS NOT NULL
                AND o.deleted_at IS NULL)
     LIMIT 1`)
  if (freeProjects.rows.length === 0) {
    console.error('\nAucun projet sans bordereau approuvé : purgez les offres de test.')
    process.exit(2)
  }
  const [anyProject] = await db
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects).where(eq(projects.id, freeProjects.rows[0].id)).limit(1)
  if (!anyProject) { console.error('\nAucun projet en base de test.'); process.exit(2) }

  const mkOffer = async (suffix: string) => {
    const [o] = await db.insert(commercialOffers).values({
      reference: `TST-RBAC-${suffix}-${Date.now().toString(36).toUpperCase()}`,
      projectTitle: `Vérification RBAC ${suffix}`,
      projectId: anyProject.id,
      clientId: anyProject.clientId,
      currency: 'TND',
      vatRate: '0.1900',
      createdBy: adminRow.id,
    }).returning({ id: commercialOffers.id })
    return o.id
  }

  const offerA = await mkOffer('A')
  const offerB = await mkOffer('B')
  const createdOffers = [offerA, offerB]

  try {
    // ═══ 1. Le cookie forgé est bien celui de l'application ════════════════
    console.log('1. La session de test est acceptée par le serveur')
    const sanity = await req(admin, 'GET', `/api/commercial/offers/${offerA}/bordereau`)
    check('un cookie scellé avec le secret de l-application ouvre la session',
      sanity.status === 200, `${sanity.status} ${JSON.stringify(sanity.json).slice(0, 120)}`)
    const bad: Actor = { label: 'cookie invalide', role: 'anonyme', cookie: 'sopat_session=nimportequoi' }
    const badRes = await req(bad, 'GET', `/api/commercial/offers/${offerA}/bordereau`)
    check('un cookie falsifié est rejeté', badRes.status === 401, String(badRes.status))

    // ═══ 2. 401 — non authentifié, sur chaque mutation ════════════════════
    console.log('\n2. Non authentifié : 401 sur toutes les routes du bordereau')
    const anonCases: [string, string, unknown?][] = [
      ['GET', `/api/commercial/offers/${offerA}/bordereau`],
      ['PUT', `/api/commercial/offers/${offerA}/bordereau`, { lines: [] }],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau`, { siteLocation: 'X' }],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/lines`, { lineType: 'item', designation: 'X' }],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${offerA}`, { designation: 'X' }],
      ['DELETE', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${offerA}`],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/versions`, { action: 'create', changeSummary: 'X' }],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/from-template`, {}],
      ['GET', `/api/commercial/offers/${offerA}/bordereau/export`],
      ['GET', `/api/commercial/offers/${offerA}/bordereau/versions`],
      ['GET', `/api/projects/${anyProject.id}/contract-amount`],
      ['POST', `/api/projects/${anyProject.id}/contract-amount`, { offerId: offerA, suggestedAmount: 1, approvedAmount: 1 }],
    ]
    for (const [method, path, body] of anonCases) {
      const r = await req(anonymous, method, path, body)
      check(`${method} ${path.replace(offerA, ':offer').replace(anyProject.id, ':project')} → 401`,
        r.status === 401, String(r.status))
    }

    // ═══ 3. 403 — authentifié mais sans le droit ══════════════════════════
    console.log('\n3. Compte terrain : 403 sur lecture comme sur écriture')
    const fieldCases: [string, string, unknown?][] = [
      ['GET', `/api/commercial/offers/${offerA}/bordereau`],
      ['PUT', `/api/commercial/offers/${offerA}/bordereau`, { lines: [] }],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau`, { siteLocation: 'X' }],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/lines`, { lineType: 'item', designation: 'X' }],
      ['DELETE', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${offerA}`],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/versions`, { action: 'create', changeSummary: 'X' }],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/from-template`, {}],
      ['GET', `/api/commercial/offers/${offerA}/bordereau/export`],
    ]
    for (const [method, path, body] of fieldCases) {
      const r = await req(field, method, path, body)
      check(`${field.label} — ${method} ${path.split('?')[0].replace(offerA, ':offer')} → 403`,
        r.status === 403, String(r.status))
    }

    // ═══ 4. Le chef d'études édite, mais n'approuve pas ═══════════════════
    console.log("\n4. Chef d'études : édite, ne tranche pas la revue")

    const addLine = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/lines`, {
      lineType: 'section', designation: 'I. TRAVAUX PRELIMINAIRES', sourceCode: 'I.',
    })
    check("le chef d'études crée une section", addLine.status === 201, JSON.stringify(addLine.json).slice(0, 160))
    const sectionId = (addLine.json.lineId as string) ?? ''

    const addItem = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/lines`, {
      parentId: sectionId, lineType: 'item', designation: 'Palmier Phoenix',
      unit: 'P', quantity: 10, unitPrice: 450,
    })
    check("il ajoute un poste chiffré", addItem.status === 201, String(addItem.status))
    const itemId = (addItem.json.lineId as string) ?? ''

    const patched = await req(chef, 'PATCH',
      `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { unitPrice: 480 })
    check('il corrige un prix unitaire', patched.status === 200, String(patched.status))
    check('la réponse renvoie le document recalculé',
      Number(((patched.json.document as Record<string, unknown>)?.totals as Record<string, unknown>)?.totalHtva) === 4800,
      JSON.stringify((patched.json.document as Record<string, unknown>)?.totals).slice(0, 120))

    const moved = await req(chef, 'PATCH',
      `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}&op=move`, { parentId: null })
    check('il déplace la ligne à la racine', moved.status === 200, String(moved.status))
    await req(chef, 'PATCH',
      `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}&op=move`, { parentId: sectionId })

    const header = await req(chef, 'PATCH', `/api/commercial/offers/${offerA}/bordereau`,
      { siteLocation: 'Villa Somrani, Gammarth' })
    check("il renseigne l'en-tête du formulaire", header.status === 200, String(header.status))

    const frozen = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'create', changeSummary: 'Chiffrage initial' })
    check('il fige une version', frozen.status === 201, String(frozen.status))
    const versionId = (frozen.json.versionId as string) ?? ''

    const submitted = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'submit', versionId })
    check('il soumet la version à la revue', submitted.status === 200, JSON.stringify(submitted.json).slice(0, 160))

    const chefApprove = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'approve', versionId })
    check("il ne peut PAS approuver sa propre soumission", chefApprove.status === 403, String(chefApprove.status))
    const chefReject = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'reject', versionId, reason: 'test' })
    check('il ne peut PAS refuser non plus', chefReject.status === 403, String(chefReject.status))

    // ═══ 5. Le document est gelé pendant la revue, POUR TOUT LE MONDE ═════
    console.log('\n5. Gel pendant la revue : la route refuse toute écriture')
    for (const who of [chef, admin, direction]) {
      const r = await req(who, 'PATCH',
        `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { unitPrice: 1 })
      check(`${who.label} ne peut pas modifier un document en revue → 409`,
        r.status === 409, `${r.status} ${String(r.json.error).slice(0, 80)}`)
    }
    const importDuringReview = await req(admin, 'POST',
      `/api/commercial/offers/${offerA}/bordereau/from-template`, { confirmReplace: true })
    check('partir du modèle vierge est refusé pendant la revue',
      importDuringReview.status === 409, String(importDuringReview.status))

    const [duringReview] = await db
      .select({ p: offerLineItems.unitPrice })
      .from(offerLineItems).where(eq(offerLineItems.id, itemId))
    check('le prix n-a pas bougé malgré les tentatives', Number(duringReview.p) === 480, String(duringReview.p))

    // ═══ 6. La direction tranche : refus motivé ═══════════════════════════
    console.log('\n6. Revue : refus motivé, puis reprise')
    const noReason = await req(direction, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'reject', versionId, reason: '   ' })
    check('un refus sans motif est rejeté en validation', noReason.status === 400, String(noReason.status))

    const rejected = await req(direction, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'reject', versionId, reason: 'Prix palmier au-dessus du dernier devis fournisseur' })
    check('la direction refuse la version', rejected.status === 200, JSON.stringify(rejected.json).slice(0, 160))

    const afterRejectEdit = await req(chef, 'PATCH',
      `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { unitPrice: 450 })
    check('le refus rend la main à l-auteur', afterRejectEdit.status === 200, String(afterRejectEdit.status))

    // ═══ 7. Approbation, puis verrouillage ═══════════════════════════════
    console.log('\n7. Approbation et verrouillage')
    const v2 = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'create', changeSummary: 'Prix ramené au devis fournisseur' })
    const v2Id = (v2.json.versionId as string) ?? ''
    await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'submit', versionId: v2Id })

    const approvedRes = await req(direction, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'approve', versionId: v2Id })
    check('la direction approuve la version soumise', approvedRes.status === 200,
      JSON.stringify(approvedRes.json).slice(0, 160))

    console.log('\n8. Document approuvé : toute écriture est refusée par la route')
    const lockedCases: [string, string, unknown?][] = [
      ['PUT', `/api/commercial/offers/${offerA}/bordereau`, { lines: [] }],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau`, { siteLocation: 'Autre' }],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/lines`, { lineType: 'item', designation: 'X' }],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { unitPrice: 1 }],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}&op=move`, { parentId: null }],
      ['DELETE', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/from-template`, { confirmReplace: true }],
    ]
    for (const [method, path, body] of lockedCases) {
      const r = await req(admin, method, path, body)
      check(`admin — ${method} ${path.split('?')[0].replace(offerA, ':offer')} sur un document approuvé → 409`,
        r.status === 409, `${r.status} ${String(r.json.error).slice(0, 70)}`)
    }

    const [lockedLine] = await db
      .select({ p: offerLineItems.unitPrice, d: offerLineItems.designation })
      .from(offerLineItems).where(eq(offerLineItems.id, itemId))
    check('la ligne approuvée est intacte', Number(lockedLine.p) === 450 && lockedLine.d === 'Palmier Phoenix',
      `${lockedLine.p} / ${lockedLine.d}`)

    // ═══ 9. Propriété : une ligne n'est pas atteignable via une autre offre ═
    console.log("\n9. Propriété : l'offre est dans le WHERE, pas seulement dans l'URL")
    const [offerBLine] = await db.insert(offerLineItems).values({
      offerId: offerB, lineType: 'item', position: 0, designation: 'Ligne offre B',
      unit: 'U', quantity: '1', unitPrice: '100', total: '100.000', createdBy: adminRow.id,
    }).returning({ id: offerLineItems.id })

    // offerA est approuvé et verrouillé ; offerB ne l'est pas. La faille
    // historique consistait à citer l'offre déverrouillée pour toucher la ligne
    // de l'autre. La route doit refuser sur la PROPRIÉTÉ, pas seulement sur l'état.
    const crossDelete = await req(admin, 'DELETE',
      `/api/commercial/offers/${offerB}/bordereau/lines?lineId=${itemId}`)
    check("supprimer la ligne de l'offre A en citant l'offre B → refusé",
      crossDelete.status === 409, `${crossDelete.status} ${String(crossDelete.json.error).slice(0, 70)}`)

    const crossPatch = await req(admin, 'PATCH',
      `/api/commercial/offers/${offerB}/bordereau/lines?lineId=${itemId}`, { unitPrice: 1 })
    check("modifier la ligne de l'offre A en citant l'offre B → refusé", crossPatch.status === 409,
      String(crossPatch.status))

    const crossMove = await req(admin, 'PATCH',
      `/api/commercial/offers/${offerB}/bordereau/lines?lineId=${itemId}&op=move`, { parentId: null })
    check("déplacer la ligne de l'offre A en citant l'offre B → refusé", crossMove.status === 409,
      String(crossMove.status))

    const crossParent = await req(admin, 'POST', `/api/commercial/offers/${offerB}/bordereau/lines`, {
      parentId: sectionId, lineType: 'item', designation: 'Enfant volé',
    })
    check("rattacher une ligne de B à une section de A → refusé", crossParent.status === 409,
      `${crossParent.status} ${String(crossParent.json.error).slice(0, 70)}`)

    const [stillThere] = await db
      .select({ p: offerLineItems.unitPrice, o: offerLineItems.offerId })
      .from(offerLineItems).where(eq(offerLineItems.id, itemId))
    check("la ligne de l'offre A est toujours là, inchangée et chez elle",
      stillThere !== undefined && Number(stillThere.p) === 450 && stillThere.o === offerA)

    const crossVersion = await req(direction, 'POST', `/api/commercial/offers/${offerB}/bordereau/versions`,
      { action: 'approve', versionId: v2Id })
    check("approuver la version de A depuis l'offre B → refusé", crossVersion.status === 409,
      String(crossVersion.status))

    // ═══ 9b. Un seul bordereau approuve par chantier — proprement ═════
    //
    // La regle existait depuis la migration 0035, portee par l'index
    // `commercial_offers_one_approved_per_project_uidx`. Mais la route ne la
    // testait pas : l'UPDATE partait quand meme, l'index le rejetait, et
    // l'utilisateur recevait une 500 avec le nom de la contrainte et la
    // requete SQL. Le refus doit etre une reponse metier, pas une trace de pile.
    console.log('\n9b. Deuxieme bordereau approuve sur le meme chantier : refus lisible')
    await req(admin, 'POST', `/api/commercial/offers/${offerB}/bordereau/lines`, {
      lineType: 'item', designation: 'Poste offre B', unit: 'U', quantity: 1, unitPrice: 100,
    })
    const rivalVersion = await req(admin, 'POST', `/api/commercial/offers/${offerB}/bordereau/versions`,
      { action: 'create', changeSummary: 'Offre concurrente sur le meme chantier' })
    const rivalId = (rivalVersion.json.versionId as string) ?? ''
    await req(admin, 'POST', `/api/commercial/offers/${offerB}/bordereau/versions`,
      { action: 'submit', versionId: rivalId })
    const rivalApprove = await req(direction, 'POST',
      `/api/commercial/offers/${offerB}/bordereau/versions`, { action: 'approve', versionId: rivalId })
    check('le refus est un 409 metier, pas une 500', rivalApprove.status === 409,
      `${rivalApprove.status} ${String(rivalApprove.json.error).slice(0, 90)}`)
    check("le message NOMME l'offre deja approuvee",
      String(rivalApprove.json.error).includes('bordereau approuv'),
      String(rivalApprove.json.error).slice(0, 140))
    check('aucun detail interne de base de donnees ne fuit',
      !/constraint|uidx|update "/.test(String(rivalApprove.json.error)),
      String(rivalApprove.json.error).slice(0, 140))
    const [rivalRow] = await db.select({ v: commercialOffers.approvedVersionId })
      .from(commercialOffers).where(eq(commercialOffers.id, offerB))
    check("l'offre concurrente n-a PAS ete verrouillee", rivalRow.v === null, String(rivalRow.v))

    // La soumission gele l'offre B : on la tranche pour rendre le document a
    // l'edition, sinon la suite du test importerait dans un document en revue
    // — ce que le serveur refuse, a juste titre.
    const releaseB = await req(direction, 'POST',
      `/api/commercial/offers/${offerB}/bordereau/versions`,
      { action: 'reject', versionId: rivalId, reason: 'Chantier deja couvert par une autre offre' })
    check("le refus libere l'offre concurrente", releaseB.status === 200, String(releaseB.status))

    // ═══ 10. Montant contractuel : rôle, projet, état ═════════════════════
    console.log('\n10. Montant contractuel : rôle, rattachement projet, état du bordereau')
    const chefContract = await req(chef, 'POST', `/api/projects/${anyProject.id}/contract-amount`,
      { offerId: offerA, suggestedAmount: 5355, approvedAmount: 5355 })
    check("le chef d'études ne fixe pas le montant contractuel", chefContract.status === 403,
      String(chefContract.status))

    const unapprovedSource = await req(direction, 'POST', `/api/projects/${anyProject.id}/contract-amount`,
      { offerId: offerB, suggestedAmount: 100, approvedAmount: 100 })
    check('un bordereau non approuvé ne peut pas fonder un montant contractuel',
      unapprovedSource.status === 404 || unapprovedSource.status === 409,
      `${unapprovedSource.status} ${String(unapprovedSource.json.error).slice(0, 80)}`)

    const [projBefore] = await db
      .select({ a: projects.contractAmount, b: projects.approvedBudget })
      .from(projects).where(eq(projects.id, anyProject.id))
    const okContract = await req(direction, 'POST', `/api/projects/${anyProject.id}/contract-amount`,
      { offerId: offerA, suggestedAmount: 5355, approvedAmount: 5355 })
    check('la direction fixe le montant contractuel', okContract.status === 200,
      JSON.stringify(okContract.json).slice(0, 160))
    const [projAfter] = await db
      .select({
        a: projects.contractAmount, b: projects.approvedBudget,
        v: projects.contractAmountSourceVersionId,
      })
      .from(projects).where(eq(projects.id, anyProject.id))
    check('le budget approuvé (coût) est INCHANGÉ par la route', projAfter.b === projBefore.b,
      `${projBefore.b} → ${projAfter.b}`)
    check('la version approuvée est enregistrée comme base du contrat', projAfter.v === v2Id)

    // Restaure le montant contractuel du projet témoin.
    await db.update(projects).set({
      contractAmount: projBefore.a,
      contractAmountSuggested: null,
      contractAmountSourceOfferId: null,
      contractAmountSourceVersionId: null,
      contractAmountConfirmedBy: null,
      contractAmountConfirmedAt: null,
    }).where(eq(projects.id, anyProject.id))

    // ═══ 11. Réouverture : direction seulement, motif obligatoire ═════════
    console.log('\n11. Réouverture : direction seulement, motif obligatoire')
    const chefReopen = await req(chef, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'reopen', reason: 'tentative' })
    check("le chef d'études ne rouvre pas un engagement approuvé", chefReopen.status === 403,
      String(chefReopen.status))
    const emptyReason = await req(direction, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'reopen', reason: '' })
    check('une réouverture sans motif est rejetée', emptyReason.status === 400, String(emptyReason.status))
    const reopenOk = await req(direction, 'POST', `/api/commercial/offers/${offerA}/bordereau/versions`,
      { action: 'reopen', reason: 'Révision demandée par le client' })
    check('la direction rouvre avec motif', reopenOk.status === 200, String(reopenOk.status))

    const editAfterReopen = await req(chef, 'PATCH',
      `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { unitPrice: 500 })
    check('le document redevient modifiable après réouverture', editAfterReopen.status === 200,
      String(editAfterReopen.status))

    // ═══ 12. Corps invalides : la validation refuse avant d'écrire ════════
    console.log('\n12. Validation des corps de requête')
    const badCases: [string, string, unknown, string][] = [
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, {}, 'corps vide'],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { unitPrice: -5 }, 'prix négatif'],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { lineType: 'section' }, 'champ non autorisé'],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${itemId}`, { designation: '' }, 'désignation vide'],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/lines`, { lineType: 'item' }, 'désignation absente'],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/lines`, { lineType: 'inconnu', designation: 'X' }, 'type inconnu'],
      ['PATCH', `/api/commercial/offers/${offerA}/bordereau`, { vatRate: 42 }, 'taux de TVA hors limites'],
      ['POST', `/api/commercial/offers/${offerA}/bordereau/versions`, { action: 'create' }, 'motif de version absent'],
    ]
    for (const [method, path, body, label] of badCases) {
      const r = await req(admin, method, path, body)
      check(`${label} → 400`, r.status === 400, `${r.status} ${String(r.json.error).slice(0, 60)}`)
    }
    const noLineId = await req(admin, 'DELETE', `/api/commercial/offers/${offerA}/bordereau/lines`)
    check('suppression sans identifiant de ligne → 400', noLineId.status === 400, String(noLineId.status))
    const unknownLine = await req(admin, 'PATCH',
      `/api/commercial/offers/${offerA}/bordereau/lines?lineId=${adminRow.id}`, { unitPrice: 1 })
    check('ligne inexistante → refus, pas 500', unknownLine.status === 409, String(unknownLine.status))

    // ═══ 13. Import : idempotence sur le hash, en HTTP ════════════════════
    console.log("\n13. Import HTTP : aperçu, écriture, refus du doublon")
    const bytes = readFileSync(WORKBOOK)

    const postFile = async (actor: Actor, mode: string, extra: Record<string, string> = {}, payload = bytes) => {
      const fd = new FormData()
      fd.append('file', new Blob([new Uint8Array(payload)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
      }), 'FOR CO 02 Bordereau des prix.xltx')
      fd.append('mode', mode)
      for (const [k, v] of Object.entries(extra)) fd.append(k, v)
      const res = await fetch(`${BASE}/api/commercial/offers/${offerB}/bordereau/import`, {
        method: 'POST',
        headers: actor.cookie ? { cookie: actor.cookie } : {},
        body: fd,
      })
      let json: Record<string, unknown> = {}
      try { json = (await res.json()) as Record<string, unknown> } catch { /* vide */ }
      return { status: res.status, json }
    }

    const anonImport = await postFile(anonymous, 'preview')
    check('import anonyme → 401', anonImport.status === 401, String(anonImport.status))
    const fieldImport = await postFile(field, 'preview')
    check('import par un compte terrain → 403', fieldImport.status === 403, String(fieldImport.status))

    const preview = await postFile(admin, 'preview')
    check("l'aperçu analyse le classeur sans écrire", preview.status === 200 && preview.json.committed === false,
      String(preview.status))
    check("l'aperçu compte 266 lignes chiffrables",
      Number((preview.json.stats as Record<string, unknown>)?.lineCount) === 266,
      JSON.stringify(preview.json.stats).slice(0, 120))
    const previewHash = String(preview.json.fileHash)
    check("l'aperçu n'a rien écrit dans le registre d'imports",
      (await db.select({ n: sql<number>`count(*)::int` }).from(offerImports)
        .where(eq(offerImports.offerId, offerB)))[0].n === 0)

    const commit = await postFile(admin, 'commit', { confirmReplace: 'true' })
    check("l'import est écrit", commit.status === 200 && commit.json.committed === true,
      `${commit.status} ${String(commit.json.error).slice(0, 90)}`)

    const [ledger] = await db
      .select({
        hash: offerImports.fileHash,
        url: offerImports.sourceFileUrl,
        storedAt: offerImports.sourceFileStoredAt,
        byteSize: offerImports.byteSize,
      })
      .from(offerImports).where(eq(offerImports.offerId, offerB))
    check("le registre porte le SHA-256 de l'aperçu", ledger?.hash === previewHash, String(ledger?.hash))
    check('la taille enregistrée est celle du fichier', ledger?.byteSize === bytes.byteLength,
      `${ledger?.byteSize} ≠ ${bytes.byteLength}`)

    const dup = await postFile(admin, 'commit', { confirmReplace: 'true' })
    check('le même fichier réimporté est refusé', dup.status === 409, String(dup.status))
    check('le refus nomme la date et l-auteur du premier import',
      String(dup.json.error).includes('déjà été importé'), String(dup.json.error).slice(0, 120))
    check('aucun second import n-a été enregistré',
      (await db.select({ n: sql<number>`count(*)::int` }).from(offerImports)
        .where(eq(offerImports.offerId, offerB)))[0].n === 1)

    /*
     * Une RÉVISION LÉGITIME ne doit pas être prise pour un doublon.
     *
     * Un octet retourné au hasard ne convient pas comme cas de test : un
     * `.xltx` est une archive ZIP, et le corrompre fait échouer l'analyse pour
     * une raison qui n'a rien à voir avec l'idempotence. Le classeur de
     * révision est donc produit par l'export de l'application elle-même —
     * contenu différent, structure valide, empreinte différente. C'est aussi
     * le cycle réel : on exporte, le client annote, on réimporte.
     */
    const exported = await fetch(
      `${BASE}/api/commercial/offers/${offerB}/bordereau/export`,
      { headers: { cookie: admin.cookie! } },
    )
    check("l'export du bordereau importé répond", exported.ok, String(exported.status))
    const revisionBytes = Buffer.from(await exported.arrayBuffer())
    const { createHash } = await import('crypto')
    const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')
    check("le classeur de révision a une empreinte différente de l'original",
      sha(revisionBytes) !== sha(bytes))

    const revision = await postFile(admin, 'commit', { confirmReplace: 'true' }, revisionBytes)
    check("une révision au contenu différent est acceptée, pas confondue avec le doublon",
      revision.status === 200 && revision.json.committed === true,
      `${revision.status} ${String(revision.json.error).slice(0, 110)}`)
    check('le registre porte désormais deux imports distincts pour cette offre',
      (await db.select({ n: sql<number>`count(*)::int` }).from(offerImports)
        .where(eq(offerImports.offerId, offerB)))[0].n === 2)
    check("les deux imports portent des empreintes différentes",
      (await db.select({ h: offerImports.fileHash }).from(offerImports)
        .where(eq(offerImports.offerId, offerB)))
        .map((r) => r.h).filter((v, i, a) => a.indexOf(v) === i).length === 2)

    // Et le doublon reste refusé, même après une révision légitime.
    const dupAfterRevision = await postFile(admin, 'commit', { confirmReplace: 'true' }, revisionBytes)
    check("le même classeur de révision renvoyé une seconde fois est refusé",
      dupAfterRevision.status === 409, String(dupAfterRevision.status))

    console.log('\n14. Bilan des écritures parasites')
    check('aucune offre supplémentaire n-a été créée par les tentatives refusées',
      (await count('commercial_offers')) === before.commercialOffers + createdOffers.length,
      `${before.commercialOffers} + ${createdOffers.length} ≠ ${await count('commercial_offers')}`)
  } finally {
    // ── Nettoyage : les deux offres jetables et leur trace ────────────────
    console.log('\n15. Nettoyage')
    await db.update(projects).set({
      contractAmountSourceOfferId: null,
      contractAmountSourceVersionId: null,
    }).where(eq(projects.id, anyProject.id))

    for (const id of createdOffers) {
      await db.update(commercialOffers).set({ approvedVersionId: null })
        .where(eq(commercialOffers.id, id))
    }
    await db.execute(sql.raw('ALTER TABLE offer_versions DISABLE TRIGGER offer_versions_guard_trg'))
    try {
      for (const id of createdOffers) {
        await db.delete(offerVersions).where(eq(offerVersions.offerId, id))
      }
    } finally {
      await db.execute(sql.raw('ALTER TABLE offer_versions ENABLE TRIGGER offer_versions_guard_trg'))
    }
    for (const id of createdOffers) {
      await db.delete(offerImports).where(eq(offerImports.offerId, id))
      await db.delete(offerPaymentMilestones).where(eq(offerPaymentMilestones.offerId, id))
      await db.delete(offerLineItems).where(eq(offerLineItems.offerId, id))
      await db.delete(commercialOffers).where(eq(commercialOffers.id, id))
      await db.execute(sql`
        DELETE FROM record_audit_log
         WHERE (entity_type = 'commercial_offer' AND entity_id = ${id}::uuid)
            OR (entity_type = 'bordereau_line' AND metadata->>'offerId' = ${id})
      `)
    }
    await db.execute(sql`
      DELETE FROM record_audit_log
       WHERE entity_type = 'project_contract_amount'
         AND entity_id = ${anyProject.id}::uuid
         AND occurred_at > now() - interval '1 hour'
    `)
  }

  console.log('\n16. Données existantes inchangées')
  const after = {
    commercialOffers: await count('commercial_offers'),
    offerLineItems: await count('offer_line_items'),
    offerVersions: await count('offer_versions'),
    offerImports: await count('offer_imports'),
    offerMilestones: await count('offer_payment_milestones'),
    recordAuditLog: await count('record_audit_log'),
    projects: await count('projects'),
    users: await count('users'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
