/**
 * Verifies the NC reference generator: atomicity under concurrency, correct
 * seeding, no reuse after deletion, and per-year independence.
 *
 * Run: npx tsx --env-file=.env scripts/verify-nc-reference.ts
 */
import { db } from '../db/index'
import { nonConformances, ncReferenceSequences, users } from '../db/schema'
import { eq, sql, inArray, like } from 'drizzle-orm'
import { generateNcReference } from '../src/lib/db/iso'

let pass = 0, fail = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}

/** Far-future years so the test never disturbs real sequences. */
const Y1 = 2907
const Y2 = 2908

async function cleanup() {
  await db.delete(nonConformances).where(like(nonConformances.reference, 'NC-290%'))
  await db.delete(ncReferenceSequences).where(inArray(ncReferenceSequences.year, [Y1, Y2]))
}

async function main() {
  const [admin] = await db.select({ id: users.id }).from(users).limit(1)
  await cleanup()

  console.log('\n1. Existing references are untouched and correctly seeded')
  const seeds = await db.select().from(ncReferenceSequences).where(inArray(ncReferenceSequences.year, [2025, 2026]))
  const s2025 = seeds.find((s) => s.year === 2025)
  const s2026 = seeds.find((s) => s.year === 2026)
  check('2025 seeded from NC-2025-003', s2025?.lastNumber === 3, `got ${s2025?.lastNumber}`)
  // The counter only moves forward, and other suites legitimately consume
  // current-year numbers, so the invariant is "seeded at or past the highest
  // existing reference", not an absolute value.
  check('2026 seeded at or past NC-2026-004', (s2026?.lastNumber ?? 0) >= 4, `got ${s2026?.lastNumber}`)
  const existing = await db
    .select({ reference: nonConformances.reference })
    .from(nonConformances)
    .where(sql`reference ~ '^NC-[0-9]{4}-[0-9]+$'`)
    .orderBy(nonConformances.reference)
  check('the 4 existing platform references still exist unchanged',
    JSON.stringify(existing.map((r) => r.reference)) ===
    JSON.stringify(['NC-2025-001', 'NC-2025-002', 'NC-2025-003', 'NC-2026-004']),
    JSON.stringify(existing.map((r) => r.reference)))

  console.log('\n2. A fresh year starts at 001')
  const first = await generateNcReference(Y1)
  check(`first reference of ${Y1} is 001`, first === `NC-${Y1}-001`, first)
  const second = await generateNcReference(Y1)
  check('second increments to 002', second === `NC-${Y1}-002`, second)

  console.log('\n3. Concurrent allocation never duplicates (the reported 500)')
  const CONCURRENCY = 25
  const refs = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => generateNcReference(Y1))
  )
  const unique = new Set(refs)
  check(`${CONCURRENCY} simultaneous callers got ${CONCURRENCY} distinct references`,
    unique.size === CONCURRENCY, `${unique.size} distinct of ${CONCURRENCY}`)
  const nums = refs.map((r) => Number(r.slice(-3))).sort((a, b) => a - b)
  check('they form a contiguous block with no gap or repeat',
    nums[0] === 3 && nums[nums.length - 1] === 2 + CONCURRENCY &&
    nums.every((n, i) => i === 0 || n === nums[i - 1] + 1),
    `${nums[0]}..${nums[nums.length - 1]}`)

  console.log('\n4. Concurrent creation actually persists (unique constraint holds)')
  const created = await Promise.all(
    Array.from({ length: 10 }, async () => {
      const reference = await generateNcReference(Y2)
      const [row] = await db.insert(nonConformances).values({
        reference,
        description: 'Contrôle de concurrence du générateur de références.',
        detectedBy: admin.id,
        createdBy: admin.id,
        status: 'open',
      }).returning({ id: nonConformances.id, reference: nonConformances.reference })
      return row
    })
  )
  check('10 concurrent inserts all succeeded', created.length === 10)
  check('no unique-constraint failure', new Set(created.map((c) => c.reference)).size === 10)

  console.log('\n5. Deleting an NC does not free its number')
  const victim = created[created.length - 1]
  const victimNum = Number(victim.reference.slice(-3))
  await db.delete(nonConformances).where(eq(nonConformances.id, victim.id))
  const afterHardDelete = await generateNcReference(Y2)
  check('a hard-deleted number is not reissued',
    Number(afterHardDelete.slice(-3)) > victimNum,
    `deleted ${victimNum}, next was ${afterHardDelete}`)

  const [survivor] = await db.insert(nonConformances).values({
    reference: await generateNcReference(Y2),
    description: 'Contrôle de suppression douce du générateur de références.',
    detectedBy: admin.id, createdBy: admin.id, status: 'open',
  }).returning({ id: nonConformances.id, reference: nonConformances.reference })
  await db.update(nonConformances).set({ deletedAt: new Date() }).where(eq(nonConformances.id, survivor.id))
  const afterSoftDelete = await generateNcReference(Y2)
  check('a soft-deleted number is not reissued',
    afterSoftDelete !== survivor.reference &&
    Number(afterSoftDelete.slice(-3)) > Number(survivor.reference.slice(-3)),
    `soft-deleted ${survivor.reference}, next was ${afterSoftDelete}`)

  console.log('\n6. Years are independent')
  const y1Next = await generateNcReference(Y1)
  const y2Next = await generateNcReference(Y2)
  check(`${Y1} continues its own sequence`, y1Next.startsWith(`NC-${Y1}-`), y1Next)
  check(`${Y2} continues its own sequence`, y2Next.startsWith(`NC-${Y2}-`), y2Next)
  check('the two years hold different counters',
    Number(y1Next.slice(-3)) !== Number(y2Next.slice(-3)),
    `${y1Next} vs ${y2Next}`)
  const rollover = await generateNcReference(Y2 + 1)
  check('a brand-new year rolls over to 001', rollover === `NC-${Y2 + 1}-001`, rollover)
  await db.delete(ncReferenceSequences).where(eq(ncReferenceSequences.year, Y2 + 1))

  console.log('\n7. Imported register rows do not consume platform numbers')
  const [{ registerRows }] = await db
    .select({ registerRows: sql<number>`count(*)` })
    .from(nonConformances)
    .where(sql`reference like 'FOR-MI-05/%'`)
  const s2026After = (await db.select().from(ncReferenceSequences).where(eq(ncReferenceSequences.year, 2026)))[0]
  check(`${registerRows} register rows exist but the 2026 counter is far below that`,
    (s2026After?.lastNumber ?? 0) < Number(registerRows), `counter=${s2026After?.lastNumber}`)
  check('the counter is not derived from row count',
    Number(registerRows) > (s2026After?.lastNumber ?? 0))

  await cleanup()
  console.log('\n  (test references and sequences removed)')
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) })
