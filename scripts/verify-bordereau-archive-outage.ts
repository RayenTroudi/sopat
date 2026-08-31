/**
 * FOR-CO-02 — un import est REFUSÉ quand la pièce d'origine ne peut pas être
 * conservée, et rien n'est écrit.
 *
 * Pourquoi ce test est séparé
 * ---------------------------
 * `verify-bordereau-archive.ts` prouve la politique au niveau du module, en
 * manipulant les variables d'environnement dans son propre processus. Cela ne
 * dit rien du comportement de la ROUTE : c'est elle qui décide si l'import est
 * annulé, et avec quel code. Ce test appelle donc un serveur réellement démarré
 * SANS identifiants de stockage objet.
 *
 *   node scripts/dev-qms-verify.mjs --no-archive        (port 3011)
 *   TEST_DATABASE_URL="postgres://…" \
 *   npx tsx --env-file=.env scripts/verify-bordereau-archive-outage.ts
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error('\nCe test crée une offre jetable. Exigez TEST_DATABASE_URL.\n')
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Base   : ${target.label}`)

import { readFileSync } from 'fs'
import { join } from 'path'
import { eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { commercialOffers, offerImports, offerLineItems, projects, users } from '../db/schema'
import { mintSessionCookie } from './lib/qms-session'

const baseIdx = process.argv.indexOf('--base')
const BASE = baseIdx >= 0 ? process.argv[baseIdx + 1] : 'http://localhost:3011'
console.log(`Serveur: ${BASE} (censé être SANS stockage objet)\n`)

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

async function main() {
  const before = {
    offerImports: await count('offer_imports'),
    offerLineItems: await count('offer_line_items'),
    commercialOffers: await count('commercial_offers'),
  }

  const [adminRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  const [project] = await db
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects).where(isNull(projects.deletedAt)).limit(1)
  if (!adminRow || !project) { console.error('Fixtures manquantes.'); process.exit(2) }

  const cookie = await mintSessionCookie({
    userId: adminRow.id, email: adminRow.email, name: adminRow.name ?? 'admin', role: adminRow.role,
  })

  const [offer] = await db.insert(commercialOffers).values({
    reference: `TST-OUTAGE-${Date.now().toString(36).toUpperCase()}`,
    projectTitle: 'Vérification panne archivage',
    projectId: project.id,
    clientId: project.clientId,
    currency: 'TND',
    vatRate: '0.1900',
    createdBy: adminRow.id,
  }).returning({ id: commercialOffers.id })
  const offerId = offer.id

  try {
    const bytes = readFileSync(join(__dirname, '..', 'FOR CO 02 Bordereau des prix.xltx'))
    const post = async (mode: string) => {
      const fd = new FormData()
      fd.append('file', new Blob([new Uint8Array(bytes)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
      }), 'FOR CO 02 Bordereau des prix.xltx')
      fd.append('mode', mode)
      fd.append('confirmReplace', 'true')
      const res = await fetch(`${BASE}/api/commercial/offers/${offerId}/bordereau/import`, {
        method: 'POST', headers: { cookie }, body: fd,
      })
      let json: Record<string, unknown> = {}
      try { json = (await res.json()) as Record<string, unknown> } catch { /* vide */ }
      return { status: res.status, json }
    }

    console.log("1. L'aperçu reste possible : il n'écrit rien, donc rien à conserver")
    const preview = await post('preview')
    check("l'aperçu analyse le classeur normalement",
      preview.status === 200 && preview.json.committed === false, String(preview.status))
    check("il compte bien les 266 lignes",
      Number((preview.json.stats as Record<string, unknown>)?.lineCount) === 266,
      JSON.stringify(preview.json.stats).slice(0, 120))

    console.log("\n2. L'écriture est REFUSÉE, avec un code d'indisponibilité")
    const commit = await post('commit')
    check("l'import est refusé", commit.status === 503, String(commit.status))
    check('le message explique la cause et la sortie de secours',
      String(commit.json.error).includes('archiv') &&
      String(commit.json.error).includes('BORDEREAU_REQUIRE_SOURCE_ARCHIVE'),
      String(commit.json.error).slice(0, 180))
    check("la réponse n'annonce pas un import effectué", commit.json.committed === false)

    console.log('\n3. RIEN n-a été écrit : ni ligne, ni registre')
    const [{ lines }] = await db
      .select({ lines: sql<number>`count(*)::int` }).from(offerLineItems)
      .where(eq(offerLineItems.offerId, offerId))
    check('le bordereau est resté vide', lines === 0, String(lines))
    const [{ imports }] = await db
      .select({ imports: sql<number>`count(*)::int` }).from(offerImports)
      .where(eq(offerImports.offerId, offerId))
    check("aucune ligne de registre d'import n-a été créée", imports === 0, String(imports))
    const [amounts] = await db
      .select({ a: commercialOffers.amount, t: commercialOffers.totalTtc })
      .from(commercialOffers).where(eq(commercialOffers.id, offerId))
    check("les totaux de l'offre n-ont pas bougé", amounts.a === null && amounts.t === null,
      `${amounts.a} / ${amounts.t}`)

    console.log('\n4. Le refus est reproductible, et ne consomme pas l-empreinte')
    const again = await post('commit')
    check('un second essai est refusé de la même façon, pas en « doublon »',
      again.status === 503 && !String(again.json.error).includes('déjà été importé'),
      `${again.status} ${String(again.json.error).slice(0, 90)}`)
  } finally {
    console.log('\n5. Nettoyage')
    await db.delete(offerImports).where(eq(offerImports.offerId, offerId))
    await db.delete(offerLineItems).where(eq(offerLineItems.offerId, offerId))
    await db.delete(commercialOffers).where(eq(commercialOffers.id, offerId))
    await db.execute(sql`
      DELETE FROM record_audit_log
       WHERE (entity_type = 'commercial_offer' AND entity_id = ${offerId}::uuid)
          OR (entity_type = 'bordereau_line' AND metadata->>'offerId' = ${offerId})
    `)
  }

  console.log('\n6. Données existantes inchangées')
  const after = {
    offerImports: await count('offer_imports'),
    offerLineItems: await count('offer_line_items'),
    commercialOffers: await count('commercial_offers'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
