/**
 * Rattache leur classeur d'origine aux imports FOR-CO-02 antérieurs à la
 * migration 0037 — et UNIQUEMENT quand c'est démontrable.
 *
 * ── La règle, et pourquoi elle est stricte ─────────────────────────────────
 *
 * Un import antérieur à 0037 a gardé le nom, la taille et le SHA-256 du
 * classeur, mais pas ses octets. Si le fichier existe encore quelque part, on
 * peut le rattacher — à une condition non négociable : que son SHA-256 soit
 * EXACTEMENT celui enregistré au moment de l'import.
 *
 * Le hash n'est pas une commodité ici, c'est la preuve. Il établit que le
 * fichier proposé est l'octet-pour-octet de ce qui a produit les chiffres en
 * base. Sans cette égalité, rattacher un fichier « qui ressemble » fabriquerait
 * une pièce justificative fausse — bien pire qu'une colonne vide, parce qu'une
 * colonne vide se voit et se déclare, alors qu'une fausse archive se croit.
 *
 * Tout ce qui ne correspond pas est donc LAISSÉ NUL, et signalé.
 *
 * Les lignes rattachées portent `sourceArchive: 'backfilled'` dans leurs
 * statistiques : un auditeur doit pouvoir distinguer une archive prise au
 * moment de l'import d'une archive reconstituée après coup, même si les deux
 * sont également prouvées.
 *
 *   npx tsx --env-file=.env scripts/backfill-bordereau-source-archives.ts \
 *     --file "FOR CO 02 Bordereau des prix.xltx" [--apply]
 *
 * Sans `--apply`, le script n'écrit rien : il dit ce qu'il ferait.
 */
import { selectTestTarget } from './lib/test-target'

const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { basename, join } from 'path'
import { eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { offerImports } from '../db/schema'
import { archiveSourceWorkbook, isArchiveConfigured } from '../src/lib/bordereau-archive'

const apply = process.argv.includes('--apply')

/** Fichiers candidats : ceux passés en `--file`, plus le classeur du dépôt. */
function candidatePaths(): string[] {
  const out: string[] = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--file' && process.argv[i + 1]) out.push(process.argv[i + 1])
  }
  const repoCopy = join(__dirname, '..', 'FOR CO 02 Bordereau des prix.xltx')
  if (existsSync(repoCopy)) out.push(repoCopy)
  return [...new Set(out)]
}

async function main() {
  if (!isArchiveConfigured()) {
    console.error("Stockage objet non configuré (CLOUDINARY_*) : rien ne peut être archivé.")
    process.exit(2)
  }

  const pending = await db.select().from(offerImports).where(isNull(offerImports.sourceFileUrl))
  console.log(`Imports sans classeur archivé : ${pending.length}\n`)
  if (pending.length === 0) { console.log('Rien à faire.'); process.exit(0) }

  // Index des candidats par empreinte : la clé de la démonstration.
  const byHash = new Map<string, { path: string; bytes: Buffer }>()
  for (const path of candidatePaths()) {
    if (!existsSync(path)) { console.log(`Candidat introuvable, ignoré : ${path}`); continue }
    const bytes = readFileSync(path)
    const hash = createHash('sha256').update(bytes).digest('hex')
    byHash.set(hash, { path, bytes })
    console.log(`Candidat : ${basename(path)} — ${hash.slice(0, 16)}… (${bytes.byteLength} o)`)
  }
  console.log('')

  let matched = 0
  let skipped = 0

  for (const row of pending) {
    const hit = byHash.get(row.fileHash)
    if (!hit) {
      skipped++
      console.log(
        `SANS PREUVE  ${row.fileName} (${row.fileHash.slice(0, 16)}…) — ` +
        'aucun fichier disponible ne porte cette empreinte. Laissé NUL.',
      )
      continue
    }
    if (hit.bytes.byteLength !== row.byteSize) {
      // Ne peut pas arriver si le hash correspond ; vérifié quand même, parce
      // qu'une incohérence ici voudrait dire que l'un des deux est corrompu.
      skipped++
      console.log(`INCOHÉRENT   ${row.fileName} — taille ${hit.bytes.byteLength} ≠ ${row.byteSize}. Laissé NUL.`)
      continue
    }

    matched++
    if (!apply) {
      console.log(`RATTACHERAIT ${row.fileName} → ${basename(hit.path)} (empreintes identiques)`)
      continue
    }

    const ab = hit.bytes.buffer.slice(hit.bytes.byteOffset, hit.bytes.byteOffset + hit.bytes.byteLength)
    const archive = await archiveSourceWorkbook(ab as ArrayBuffer, row.fileHash)
    if (!archive.ok || !archive.source) {
      console.log(`ÉCHEC        ${row.fileName} — archivage impossible, laissé NUL.`)
      skipped++
      matched--
      continue
    }
    await db.update(offerImports).set({
      sourceFileUrl: archive.source.url,
      sourceFilePublicId: archive.source.publicId,
      sourceFileStoredAt: new Date(),
      stats: sql`coalesce(${offerImports.stats}, '{}'::jsonb) || '{"sourceArchive":"backfilled"}'::jsonb`,
    }).where(eq(offerImports.id, row.id))
    console.log(`RATTACHÉ     ${row.fileName} → ${archive.source.publicId}`)
  }

  console.log(
    `\n${matched} rattaché(s)${apply ? '' : ' (simulation)'}, ${skipped} laissé(s) sans archive.`,
  )
  if (!apply && matched > 0) console.log('Relancez avec --apply pour écrire.')
  if (skipped > 0) {
    console.log(
      '\nLes imports sans preuve restent NULS, et c\'est la bonne réponse : le\n' +
      'SHA-256 est conservé, donc si le fichier ressort un jour, il pourra être\n' +
      'rattaché avec la même démonstration. Rien n\'est inventé entre-temps.',
    )
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
