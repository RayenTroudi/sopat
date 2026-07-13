/**
 * Import one-shot des photos « VF Photos SOPAT 2024 » vers public/projects/.
 * Sélectionne jusqu'à 8 photos par projet (réparties sur l'ensemble du
 * dossier), les redimensionne à 1920 px max et les compresse en JPEG q78.
 *
 * Usage : npx tsx scripts/import-2024-photos.ts
 */
import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const SOURCE_ROOT = 'D:/sopat docs/VF Photos SOPAT 2024/VF Photos SOPAT 2024'
const DEST_ROOT = join(process.cwd(), 'public', 'projects')
const MAX_PER_PROJECT = 8
const MAX_WIDTH = 1920
const QUALITY = 78

const FOLDER_TO_SLUG: Record<string, string> = {
  'Hôtel Hammamet': 'hotel-hammamet-2024',
  'Hôtel One resort': 'hotel-one-resort',
  'Hôtel Radisson': 'hotel-radisson',
  'Photo villa choutrana 3': 'villa-choutrana',
  'photos diar yassmin tazarka': 'residence-diar-yasmine',
  'VF  Villa sidi abedaziz ': 'villa-sidi-abdelaziz',
  'VF photo banque BTE': 'banque-bte-2024',
  'VF Photo de piscine belvédére ': 'piscine-belvedere',
  'VF photo novotel 2024': 'hotel-novotel',
  'VF photo villa jabas': 'villa-jabas',
  'VF Villa Korba': 'villa-korba',
  'villa beni khiar ': 'villa-beni-khiar',
  'villa lac 2': 'villa-lac-2',
}

/** Prend jusqu'à n éléments répartis uniformément dans la liste. */
function spread<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor((i * arr.length) / n)])
  }
  return out
}

/** Compare des noms de dossiers en neutralisant la normalisation Unicode (NFC/NFD). */
const norm = (s: string) => s.normalize('NFC').trim().toLowerCase()

/** Liste les images d'un dossier, en descendant d'un niveau si besoin. */
function collectImages(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const images = entries
    .filter((e) => e.isFile() && /\.(jpe?g|png)$/i.test(e.name))
    .map((e) => join(dir, e.name))
  if (images.length > 0) return images
  // Pas d'image au premier niveau : chercher dans les sous-dossiers
  return entries
    .filter((e) => e.isDirectory())
    .flatMap((e) => collectImages(join(dir, e.name)))
}

async function main() {
  const actualFolders = readdirSync(SOURCE_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)

  for (const [folder, slug] of Object.entries(FOLDER_TO_SLUG)) {
    const actual = actualFolders.find((f) => norm(f) === norm(folder))
    if (!actual) {
      console.warn(`SKIP (introuvable): ${folder}`)
      continue
    }
    const src = join(SOURCE_ROOT, actual)
    if (!existsSync(src)) {
      console.warn(`SKIP (introuvable): ${folder}`)
      continue
    }
    const files = collectImages(src)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    const picked = spread(files, MAX_PER_PROJECT)

    const dest = join(DEST_ROOT, slug)
    mkdirSync(dest, { recursive: true })

    let idx = 1
    for (const file of picked) {
      const out = join(dest, `${idx}.jpg`)
      try {
        await sharp(file, { failOn: 'none' })
          .rotate()
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: QUALITY, mozjpeg: true })
          .toFile(out)
        idx++
      } catch (e) {
        console.warn(`  erreur sur ${file}:`, (e as Error).message)
      }
    }
    console.log(`${slug}: ${idx - 1} photos`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
