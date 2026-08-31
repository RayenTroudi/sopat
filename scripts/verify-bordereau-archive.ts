/**
 * FOR-CO-02 — le classeur source est réellement archivé, et l'archive est
 * réellement celui qui a été importé.
 *
 * Ce que ce test prouve, qu'aucun autre ne prouvait
 * ------------------------------------------------
 * Que `source_file_url` n'est pas nul ne prouve rien : il faut aller CHERCHER
 * le fichier à cette adresse, le hacher, et comparer au SHA-256 enregistré et
 * à celui du fichier de départ. Sans cet aller-retour, on vérifie une colonne,
 * pas une pièce justificative.
 *
 * Le test parcourt tout le chemin :
 *
 *   fichier local → import HTTP → Cloudinary → offer_imports
 *                                                   ↓
 *                            téléchargement ← source_file_url
 *                                    ↓
 *                        SHA-256 identique aux deux autres
 *
 * Il vérifie aussi la politique : depuis la correction, un archivage impossible
 * ANNULE l'import au lieu de le laisser passer avec une lacune muette.
 *
 *   TEST_DATABASE_URL="postgres://…branche…" \
 *   npx tsx --env-file=.env scripts/verify-bordereau-archive.ts [--base http://localhost:3010]
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error('\nCe test importe et supprime des offres. Exigez TEST_DATABASE_URL.\n')
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Base   : ${target.label}`)

import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  bordereauTemplateLines, bordereauTemplates,
  commercialOffers, offerImports, offerLineItems, offerPaymentMilestones, offerVersions, projects, users,
} from '../db/schema'
import { mintSessionCookie } from './lib/qms-session'
import {
  archiveSourceWorkbook,
  isArchiveConfigured,
  isArchiveRequired,
} from '../src/lib/bordereau-archive'
import { hashWorkbook } from '../src/lib/import/bordereau-import'

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

const sha256 = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex')

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

async function main() {
  console.log('1. Politique d-archivage')
  check('le stockage objet est configuré dans cet environnement', isArchiveConfigured())
  check("l'archivage est EXIGÉ par défaut", isArchiveRequired())

  // La porte de sortie n'ouvre que sur la chaîne exacte « false ».
  const saved = process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE
  process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE = 'FALSE'
  check("une valeur mal orthographiée ne désarme pas l'exigence", isArchiveRequired())
  process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE = 'false'
  check('seule la chaîne exacte « false » la lève', !isArchiveRequired())
  if (saved === undefined) delete process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE
  else process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE = saved

  console.log("\n2. Un stockage injoignable ANNULE l'import, il ne le laisse pas passer")
  const realCloud = process.env.CLOUDINARY_CLOUD_NAME
  const realKey = process.env.CLOUDINARY_API_KEY
  const realSecret = process.env.CLOUDINARY_API_SECRET
  delete process.env.CLOUDINARY_CLOUD_NAME
  delete process.env.CLOUDINARY_API_KEY
  delete process.env.CLOUDINARY_API_SECRET
  const unconfigured = await archiveSourceWorkbook(new ArrayBuffer(8), 'a'.repeat(64))
  check('sans stockage configuré et exigence active : refus explicite',
    unconfigured.ok === false, JSON.stringify(unconfigured).slice(0, 120))
  check('le refus dit quoi faire',
    unconfigured.ok === false && unconfigured.error.includes('BORDEREAU_REQUIRE_SOURCE_ARCHIVE'),
    unconfigured.ok === false ? unconfigured.error.slice(0, 100) : '')

  process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE = 'false'
  const waived = await archiveSourceWorkbook(new ArrayBuffer(8), 'a'.repeat(64))
  check("exigence levée : l'import continue, sans archive",
    waived.ok === true && waived.source === null)
  check('et la lacune est DÉCLARÉE, pas muette',
    waived.ok === true && waived.note === 'disabled')
  if (saved === undefined) delete process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE
  else process.env.BORDEREAU_REQUIRE_SOURCE_ARCHIVE = saved
  if (realCloud) process.env.CLOUDINARY_CLOUD_NAME = realCloud
  if (realKey) process.env.CLOUDINARY_API_KEY = realKey
  if (realSecret) process.env.CLOUDINARY_API_SECRET = realSecret

  // ── Import réel, de bout en bout ────────────────────────────────────────
  const before = {
    commercialOffers: await count('commercial_offers'),
    offerImports: await count('offer_imports'),
    offerLineItems: await count('offer_line_items'),
    recordAuditLog: await count('record_audit_log'),
  }

  const [adminRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
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
  const [project] = await db
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects)
    .where(freeProjects.rows.length ? eq(projects.id, freeProjects.rows[0].id) : isNull(projects.deletedAt))
    .limit(1)
  if (!adminRow || !project) { console.error('\nFixtures manquantes.'); process.exit(2) }

  const cookie = await mintSessionCookie({
    userId: adminRow.id, email: adminRow.email, name: adminRow.name ?? 'admin', role: adminRow.role,
  })

  const [offer] = await db.insert(commercialOffers).values({
    reference: `TST-ARCH-${Date.now().toString(36).toUpperCase()}`,
    projectTitle: 'Vérification archivage FOR-CO-02',
    projectId: project.id,
    clientId: project.clientId,
    currency: 'TND',
    vatRate: '0.1900',
    createdBy: adminRow.id,
  }).returning({ id: commercialOffers.id })
  const offerId = offer.id
  let createdTemplateId: string | null = null

  try {
    const bytes = readFileSync(WORKBOOK)
    const localHash = sha256(bytes)

    console.log('\n3. Le hash applicatif est bien le SHA-256 du fichier')
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    check("hashWorkbook() reproduit le SHA-256 de l'octet-pour-octet",
      hashWorkbook(ab as ArrayBuffer) === localHash, `${hashWorkbook(ab as ArrayBuffer)} ≠ ${localHash}`)

    console.log('\n4. Import HTTP réel')
    const fd = new FormData()
    fd.append('file', new Blob([new Uint8Array(bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    }), 'FOR CO 02 Bordereau des prix.xltx')
    fd.append('mode', 'commit')
    fd.append('confirmReplace', 'true')
    const res = await fetch(`${BASE}/api/commercial/offers/${offerId}/bordereau/import`, {
      method: 'POST', headers: { cookie }, body: fd,
    })
    const body = (await res.json()) as Record<string, unknown>
    check("l'import aboutit", res.status === 200 && body.committed === true,
      `${res.status} ${String(body.error).slice(0, 120)}`)
    check("la réponse annonce que la source est archivée", body.sourceFileArchived === true,
      String(body.sourceFileArchived))

    console.log('\n5. Le registre porte la source, pas seulement un NULL')
    const [ledger] = await db.select().from(offerImports).where(eq(offerImports.offerId, offerId))
    check('une ligne de registre existe', ledger !== undefined)
    check("l'empreinte enregistrée est celle du fichier local", ledger?.fileHash === localHash,
      `${ledger?.fileHash} ≠ ${localHash}`)
    check("l'URL d'archive est renseignée", Boolean(ledger?.sourceFileUrl), String(ledger?.sourceFileUrl))
    check("l'identifiant public est renseigné", Boolean(ledger?.sourceFilePublicId),
      String(ledger?.sourceFilePublicId))
    check("la date d'archivage est renseignée", ledger?.sourceFileStoredAt instanceof Date)
    check("l'identifiant public dérive de l'empreinte — un autre fichier ne peut pas le prendre",
      String(ledger?.sourceFilePublicId).includes(localHash),
      String(ledger?.sourceFilePublicId))
    check("le registre déclare l'archivage comme effectué",
      (ledger?.stats as Record<string, unknown> | null)?.sourceArchive === 'stored',
      JSON.stringify((ledger?.stats as Record<string, unknown> | null)?.sourceArchive))

    console.log("\n6. L'archive est téléchargeable, et c'est le bon fichier")
    const url = String(ledger?.sourceFileUrl)
    let downloaded: Buffer | null = null
    try {
      const dl = await fetch(url)
      check(`le fichier archivé se télécharge (${dl.status})`, dl.ok, String(dl.status))
      if (dl.ok) downloaded = Buffer.from(await dl.arrayBuffer())
    } catch (e) {
      check("le fichier archivé se télécharge", false, String(e).slice(0, 120))
    }
    if (downloaded) {
      check('sa taille est celle du fichier importé', downloaded.byteLength === bytes.byteLength,
        `${downloaded.byteLength} ≠ ${bytes.byteLength}`)
      check('son SHA-256 est identique à celui du fichier local',
        sha256(downloaded) === localHash, `${sha256(downloaded)} ≠ ${localHash}`)
      check("son SHA-256 est identique à celui qu'enregistre le registre",
        sha256(downloaded) === ledger?.fileHash)
    }

    console.log("\n7. L'archive est rattachée au bon import")
    check("elle appartient à l'offre importée", ledger?.offerId === offerId)
    check("elle n'est pas rattachée à un modèle", ledger?.templateId === null)
    check("l'auteur de l'import est enregistré", ledger?.importedBy === adminRow.id)

    console.log("\n8. Un contenu différent ne peut pas se substituer à l'archive")
    // L'identifiant public EST le hash du contenu. Un fichier différent a un
    // autre hash, donc une autre adresse : il ne peut pas écraser celle-ci.
    const other = Buffer.from(bytes)
    other[0] = other[0] ^ 0xff
    const otherHash = sha256(other)
    check('un contenu modifié produit une autre empreinte', otherHash !== localHash)
    const otherArchive = await archiveSourceWorkbook(
      other.buffer.slice(other.byteOffset, other.byteOffset + other.byteLength) as ArrayBuffer,
      otherHash,
    )
    check("il est archivé sous une AUTRE adresse", otherArchive.ok === true &&
      otherArchive.source !== null && !otherArchive.source.publicId.includes(localHash),
      otherArchive.ok && otherArchive.source ? otherArchive.source.publicId : '')
    if (downloaded) {
      const recheck = await fetch(url)
      const stillThere = recheck.ok ? Buffer.from(await recheck.arrayBuffer()) : null
      check("l'archive d'origine est intacte après l'envoi d'un autre fichier",
        stillThere !== null && sha256(stillThere) === localHash)
    }

    console.log("\n8b. Le formulaire vierge officiel est archive lui aussi")
    // Il ne porte aucun prix, mais il EST un document maitrise : c'est la
    // revision du formulaire dont descend la structure de chaque devis. Ce
    // qu'il prouve est different — pas un montant, une version de formulaire.
    const tplForm = new FormData()
    tplForm.append('file', new Blob([new Uint8Array(bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    }), 'FOR CO 02 Bordereau des prix.xltx')
    tplForm.append('mode', 'commit')
    const tplRes = await fetch(`${BASE}/api/commercial/bordereau-template/import`, {
      method: 'POST', headers: { cookie }, body: tplForm,
    })
    const tplBody = (await tplRes.json()) as Record<string, unknown>
    if (tplRes.status === 409) {
      check('le modele etait deja charge : le meme fichier est refuse', true,
        String(tplBody.error).slice(0, 80))
    } else {
      check('le modele officiel se charge', tplRes.status === 200 && tplBody.committed === true,
        `${tplRes.status} ${String(tplBody.error).slice(0, 110)}`)
      check("la reponse annonce l'archivage du formulaire", tplBody.sourceFileArchived === true)
      const [tplLedger] = await db.select().from(offerImports)
        .where(sql`${offerImports.templateId} IS NOT NULL AND ${offerImports.fileHash} = ${localHash}`)
      check("le registre du modele porte l'URL d'archive",
        Boolean(tplLedger?.sourceFileUrl), String(tplLedger?.sourceFileUrl))
      check("il declare l'archivage comme effectue",
        (tplLedger?.stats as Record<string, unknown> | null)?.sourceArchive === 'stored')
      createdTemplateId = tplLedger?.templateId ?? null
    }
    console.log("\n9. Le document expose sa source à l'écran")
    const docRes = await fetch(`${BASE}/api/commercial/offers/${offerId}/bordereau`, {
      headers: { cookie },
    })
    const doc = (await docRes.json()) as { imports?: { fileName: string; sourceFileUrl: string | null; fileHash: string }[] }
    check("le document renvoie son historique d'import", Array.isArray(doc.imports) && doc.imports.length === 1,
      JSON.stringify(doc.imports?.length))
    check("l'entrée porte le nom du fichier et son URL d'archive",
      doc.imports?.[0]?.sourceFileUrl === url && doc.imports?.[0]?.fileName.includes('FOR CO 02'))
    check("elle porte l'empreinte, de quoi vérifier un fichier retrouvé ailleurs",
      doc.imports?.[0]?.fileHash === localHash)
  } finally {
    console.log('\n10. Nettoyage')
    if (createdTemplateId) {
      await db.delete(offerImports).where(eq(offerImports.templateId, createdTemplateId))
      await db.delete(bordereauTemplateLines)
        .where(eq(bordereauTemplateLines.templateId, createdTemplateId))
      await db.delete(bordereauTemplates).where(eq(bordereauTemplates.id, createdTemplateId))
      await db.execute(sql`
        DELETE FROM record_audit_log
         WHERE entity_type = 'bordereau_template' AND entity_id = ${createdTemplateId}::uuid`)
      await db.execute(sql`
        UPDATE bordereau_templates SET is_active = true
         WHERE id = (SELECT id FROM bordereau_templates
                      WHERE code = 'FOR-CO-02' ORDER BY revision DESC LIMIT 1)
           AND NOT EXISTS (SELECT 1 FROM bordereau_templates
                            WHERE code = 'FOR-CO-02' AND is_active)`)
    }
    await db.update(commercialOffers).set({ approvedVersionId: null })
      .where(eq(commercialOffers.id, offerId))
    await db.execute(sql.raw('ALTER TABLE offer_versions DISABLE TRIGGER offer_versions_guard_trg'))
    try {
      await db.delete(offerVersions).where(eq(offerVersions.offerId, offerId))
    } finally {
      await db.execute(sql.raw('ALTER TABLE offer_versions ENABLE TRIGGER offer_versions_guard_trg'))
    }
    await db.delete(offerImports).where(eq(offerImports.offerId, offerId))
    await db.delete(offerPaymentMilestones).where(eq(offerPaymentMilestones.offerId, offerId))
    await db.delete(offerLineItems).where(eq(offerLineItems.offerId, offerId))
    await db.delete(commercialOffers).where(eq(commercialOffers.id, offerId))
    await db.execute(sql`
      DELETE FROM record_audit_log
       WHERE (entity_type = 'commercial_offer' AND entity_id = ${offerId}::uuid)
          OR (entity_type = 'bordereau_line' AND metadata->>'offerId' = ${offerId})
    `)
  }

  console.log('\n11. Données existantes inchangées')
  const after = {
    commercialOffers: await count('commercial_offers'),
    offerImports: await count('offer_imports'),
    offerLineItems: await count('offer_line_items'),
    recordAuditLog: await count('record_audit_log'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  console.log(
    '\nNote : les objets déposés sur Cloudinary pendant ce test restent dans le\n' +
    'dossier « bordereaux-sources ». Ils sont nommés par leur empreinte, donc un\n' +
    'nouvel essai ne les duplique pas.',
  )
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
