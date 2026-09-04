/**
 * Fiche client — l'édition du profil, vérifiée en HTTP RÉEL.
 *
 * Ce que ce test protège
 * ----------------------
 * Le profil se modifie désormais sur place, dans la fiche du client, au lieu
 * d'ouvrir une page séparée. Le formulaire envoie tout l'en-tête en une seule
 * requête PATCH ; si un champ n'est pas accepté par la route, il est jeté sans
 * bruit — c'est exactement ce qui se produisait pour « Secteur » et « Potentiel
 * client », saisissables à l'écran depuis le début mais retirés par le schéma
 * de validation avant d'atteindre la base.
 *
 * Un champ silencieusement ignoré ne se voit pas : l'écran affiche la valeur
 * saisie jusqu'au prochain rechargement. D'où ce test, qui relit la base après
 * chaque écriture.
 *
 * Sécurité du test
 * ----------------
 * Il modifie un client existant, donc il exige une branche isolée et remet le
 * client dans son état d'origine à la fin.
 *
 *   TEST_DATABASE_URL="postgres://…branche…" \
 *   npx tsx --env-file=.env scripts/verify-client-profile.ts [--base http://localhost:3010]
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error(
    '\nCe test écrit dans un enregistrement client réel.\n' +
    'Il exige une branche isolée :\n' +
    '  TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env scripts/verify-client-profile.ts\n',
  )
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Base   : ${target.label}`)

import { eq, isNull, and } from 'drizzle-orm'
import { db } from '../db/index'
import { clients, users } from '../db/schema'
import { mintSessionCookie } from './lib/qms-session'
import { getClientById } from '../src/lib/db/clients'
import type { UserRole } from '../src/lib/auth-utils'

const baseIdx = process.argv.indexOf('--base')
const BASE = baseIdx >= 0 ? process.argv[baseIdx + 1] : 'http://localhost:3010'
console.log(`Serveur: ${BASE}\n`)

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

async function patch(cookie: string | null, id: string, body: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  const res = await fetch(`${BASE}/api/clients/${id}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch { json = { raw: text.slice(0, 120) } }
  return { status: res.status, json }
}

async function main() {
  const [client] = await db
    .select().from(clients).where(isNull(clients.deletedAt)).limit(1)
  if (!client) { console.error('Aucun client dans la base de test.'); process.exit(2) }

  // État d'origine, restauré à la fin.
  const origin = { ...client }
  console.log(`Client : ${client.displayName} (${client.id})\n`)

  async function actorFor(role: UserRole) {
    const [u] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(and(eq(users.role, role), isNull(users.deletedAt))).limit(1)
    if (!u) return null
    return mintSessionCookie({ userId: u.id, email: u.email, name: u.name, role: u.role as UserRole })
  }

  const admin = await actorFor('admin')
  if (!admin) { console.error('Aucun compte admin dans la base de test.'); process.exit(2) }

  try {
    console.log('1. Tous les champs du profil sont enregistrés')
    const payload = {
      companyName: 'Société Témoin SA',
      displayName: 'Témoin',
      clientType: 'hotellerie',
      sectorFreeText: 'Hôtellerie de luxe',
      clientPotential: 'fort_potentiel',
      country: 'TN',
      city: 'Hammamet',
      address: '12 rue des Oliviers',
      primaryContactName: 'Mme Leila Trabelsi',
      primaryContactTitle: 'Directrice technique',
      primaryContactEmail: 'leila@example.com',
      primaryContactPhone: '+216 22 000 000',
      secondaryContactName: 'M. Karim Ben Salah',
      secondaryContactEmail: 'karim@example.com',
      notes: 'Note interne de vérification.',
    }
    const first = await patch(admin, client.id, payload)
    check('la requête est acceptée', first.status === 200, JSON.stringify(first.json))

    const after = await getClientById(client.id)
    for (const [field, expected] of Object.entries(payload)) {
      const actual = (after as unknown as Record<string, unknown>)[field]
      check(`${field} enregistré`, actual === expected, `attendu ${expected}, obtenu ${String(actual)}`)
    }

    console.log('\n2. Les deux champs autrefois jetés par la validation')
    // La régression exacte : ils passaient le formulaire, pas le schéma de la route.
    check('secteur libre présent en base', after?.sectorFreeText === 'Hôtellerie de luxe')
    check('potentiel présent en base', after?.clientPotential === 'fort_potentiel')

    console.log('\n3. Un champ peut être vidé')
    await patch(admin, client.id, { clientPotential: '', city: '' })
    const cleared = await getClientById(client.id)
    check('le potentiel repasse à « non renseigné »', cleared?.clientPotential === null,
      String(cleared?.clientPotential))
    check('la ville est vidée', (cleared?.city ?? '') === '', String(cleared?.city))

    console.log('\n4. Les règles du serveur tiennent toujours')
    const anon = await patch(null, client.id, { notes: 'sans session' })
    check('sans session : refusé', anon.status === 401, String(anon.status))

    // `realisation_chef` peut consulter une fiche client mais pas l'écrire :
    // c'est la frontière que la route doit tenir.
    const readOnly = await actorFor('realisation_chef')
    if (readOnly) {
      const res = await patch(readOnly, client.id, { notes: 'consultation seule' })
      check('rôle sans droit d-édition : refusé', res.status === 403, String(res.status))
    } else {
      console.log('  (aucun compte realisation_chef : cas non exercé)')
    }

    const bad = await patch(admin, client.id, { primaryContactEmail: 'pas-un-email' })
    check('email invalide : refusé', bad.status === 400, String(bad.status))

    const featured = await patch(admin, client.id, {
      clientType: 'residentiel_prive', isFeatured: true,
    })
    check('résidentiel privé + vedette : refusé', featured.status === 400,
      JSON.stringify(featured.json))

    const untouched = await getClientById(client.id)
    check('aucune de ces tentatives n-a modifié la base',
      untouched?.primaryContactEmail === 'leila@example.com' &&
      untouched?.clientType === 'hotellerie' && untouched?.isFeatured === origin.isFeatured,
      `${untouched?.primaryContactEmail} / ${untouched?.clientType} / ${untouched?.isFeatured}`)
  } finally {
    console.log('\n5. Restauration de l-état d-origine')
    await db.update(clients).set({
      companyName: origin.companyName,
      displayName: origin.displayName,
      clientType: origin.clientType,
      sectorFreeText: origin.sectorFreeText,
      clientPotential: origin.clientPotential,
      country: origin.country,
      city: origin.city,
      address: origin.address,
      primaryContactName: origin.primaryContactName,
      primaryContactTitle: origin.primaryContactTitle,
      primaryContactEmail: origin.primaryContactEmail,
      primaryContactPhone: origin.primaryContactPhone,
      secondaryContactName: origin.secondaryContactName,
      secondaryContactEmail: origin.secondaryContactEmail,
      isFeatured: origin.isFeatured,
      notes: origin.notes,
      updatedAt: origin.updatedAt,
    }).where(eq(clients.id, origin.id))

    const restored = await getClientById(origin.id)
    check('le client retrouve son nom d-origine', restored?.displayName === origin.displayName,
      `${restored?.displayName} ≠ ${origin.displayName}`)
    check('le client retrouve son type d-origine', restored?.clientType === origin.clientType)
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
