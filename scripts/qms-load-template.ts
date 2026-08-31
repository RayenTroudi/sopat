/**
 * Charge le modele vierge FOR-CO-02 via la route HTTP reelle, avec une session
 * direction. Sert a preparer une verification d'interface ; en exploitation, le
 * chargement se fait depuis l'ecran de l'offre.
 */
import { selectTestTarget } from './lib/test-target'
if (!process.env.TEST_DATABASE_URL?.trim()) { console.error('Exigez TEST_DATABASE_URL'); process.exit(2) }
const t = selectTestTarget(false); console.log(`Cible : ${t.label}`)
import { readFileSync } from 'fs'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { users } from '../db/schema'
import { mintSessionCookie } from './lib/qms-session'

const fileArg = process.argv.indexOf('--file')
const PATH = fileArg >= 0 ? process.argv[fileArg + 1] : 'FOR CO 02 Bordereau des prix.xltx'
const baseArg = process.argv.indexOf('--base')
const BASE = baseArg >= 0 ? process.argv[baseArg + 1] : 'http://localhost:3010'

async function main() {
  const [u] = await db.select().from(users).where(eq(users.role, 'direction')).limit(1)
  const cookie = await mintSessionCookie({ userId: u.id, email: u.email, name: u.name ?? 'd', role: u.role })
  const bytes = readFileSync(PATH)
  console.log(`Fichier : ${PATH} (${bytes.byteLength} o)`)
  for (const mode of ['preview', 'commit']) {
    const fd = new FormData()
    fd.append('file', new Blob([new Uint8Array(bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    }), 'FOR CO 02 Bordereau des prix.xltx')
    fd.append('mode', mode)
    const res = await fetch(`${BASE}/api/commercial/bordereau-template/import`, {
      method: 'POST', headers: { cookie }, body: fd,
    })
    const j = await res.json() as Record<string, unknown>
    const st = j.stats as Record<string, unknown> | undefined
    console.log(`${mode}: HTTP ${res.status} | sections=${st?.sectionCount} categories=${st?.categoryCount} lignes=${st?.lineCount} | committed=${j.committed} | ${j.error ?? ''}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
