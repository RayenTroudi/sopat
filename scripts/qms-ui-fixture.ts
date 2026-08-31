/**
 * Prépare le terrain pour la vérification MANUELLE / navigateur de FOR-CO-02.
 *
 * Crée une offre jetable sur la branche isolée et imprime : son identifiant,
 * l'URL de sa page, et un cookie de session valide à injecter dans le
 * navigateur. `next start` tourne en `NODE_ENV=production`, donc le cookie que
 * poserait le formulaire de connexion serait marqué `Secure` et refusé sur
 * `http://localhost` — d'où l'injection.
 *
 *   TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env scripts/qms-ui-fixture.ts [role]
 *   TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env scripts/qms-ui-fixture.ts --cookie-only direction
 *
 * Nettoyage : scripts/qms-purge-test-offers.ts
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error('\nRefus : ce script écrit en base. Exigez TEST_DATABASE_URL.\n')
  process.exit(2)
}
const target = selectTestTarget(false)
console.error(`Cible : ${target.label}`)

import { eq, isNull } from 'drizzle-orm'
import { db } from '../db/index'
import { commercialOffers, projects, users } from '../db/schema'
import { mintSessionCookie } from './lib/qms-session'

const args = process.argv.slice(2)
const cookieOnly = args.includes('--cookie-only')
const role = args.find((a) => !a.startsWith('--')) ?? 'admin'

async function main() {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, role as 'admin')).limit(1)
  if (!user) { console.error(`\nAucun utilisateur de rôle « ${role} ».`); process.exit(2) }

  const cookie = await mintSessionCookie({
    userId: user.id, email: user.email, name: user.name ?? role, role: user.role,
  })

  if (cookieOnly) {
    console.log(JSON.stringify({ role: user.role, name: user.name, cookie }))
    process.exit(0)
  }

  const [project] = await db
    .select({ id: projects.id, clientId: projects.clientId, name: projects.name })
    .from(projects).where(isNull(projects.deletedAt)).limit(1)
  if (!project) { console.error('\nAucun projet.'); process.exit(2) }

  const reference = `TST-UI-${Date.now().toString(36).toUpperCase()}`
  const [offer] = await db.insert(commercialOffers).values({
    reference,
    projectTitle: 'Vérification interface FOR-CO-02',
    projectId: project.id,
    clientId: project.clientId,
    currency: 'TND',
    vatRate: '0.1900',
    createdBy: user.id,
  }).returning({ id: commercialOffers.id })

  console.log(JSON.stringify({
    offerId: offer.id,
    reference,
    projectId: project.id,
    projectName: project.name,
    url: `/admin/commercial/offers/${offer.id}`,
    role: user.role,
    cookie,
  }, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
