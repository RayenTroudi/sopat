/**
 * Serveur applicatif pointé sur une branche Neon ISOLÉE.
 *
 * Pourquoi ce lanceur existe
 * --------------------------
 * La vérification de bout en bout du bordereau FOR-CO-02 crée des offres, les
 * approuve, les rouvre et les supprime. Rien de tout cela ne doit toucher la
 * base de production : on ne teste pas un contrôle qualité en écrivant dans les
 * enregistrements qu'il protège.
 *
 * `next dev` ne prend pas `--env-file`, et l'ordre de priorité de Next ferait
 * gagner `.env` sur tout ce qu'on passerait après. Ce script charge donc
 * `.env.qms-verify` (ignoré par git, `DATABASE_URL` pointant sur la branche)
 * AVANT de démarrer Next, et refuse de démarrer si l'URL ressemble encore à
 * celle de `.env` — un garde-fou, pas une politesse.
 *
 * Mode `start` par défaut, et non `dev` : Next 16 refuse un second serveur de
 * développement dans le même répertoire, et le serveur du développeur tourne
 * déjà sur 3000. `next start` sert le build de production existant, ne réclame
 * pas l'exclusivité, et lit `DATABASE_URL` à l'exécution — la branche de test
 * l'emporte donc sans qu'aucune reconstruction soit nécessaire.
 *
 *   node scripts/dev-qms-verify.mjs          (next start, port 3010)
 *   node scripts/dev-qms-verify.mjs --dev    (next dev, si 3000 est libre)
 */
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const testEnvPath = join(root, '.env.qms-verify')
const prodEnvPath = join(root, '.env')

if (!existsSync(testEnvPath)) {
  console.error(
    'Fichier .env.qms-verify absent.\n' +
    'Copiez .env, remplacez DATABASE_URL par la branche Neon de test, et relancez.',
  )
  process.exit(2)
}

/** Parseur minimal : KEY=VALUE, commentaires et lignes vides ignorés. */
function parseEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const testEnv = parseEnv(testEnvPath)
if (!testEnv.DATABASE_URL) {
  console.error('.env.qms-verify ne définit pas DATABASE_URL.')
  process.exit(2)
}

// Le garde-fou : si la branche de test porte le même hôte que la production,
// le script s'arrête. Une erreur de copier-coller ne doit pas pouvoir diriger
// une suite destructive vers les enregistrements réels.
if (existsSync(prodEnvPath)) {
  const prod = parseEnv(prodEnvPath).DATABASE_URL ?? ''
  const host = (u) => (u.match(/@([^/:?]+)/)?.[1] ?? '')
  if (host(prod) && host(prod) === host(testEnv.DATABASE_URL)) {
    console.error(
      'REFUS : .env.qms-verify pointe sur le même hôte que .env.\n' +
      `  ${host(prod)}\n` +
      'Créez une branche Neon isolée avant de lancer cette vérification.',
    )
    process.exit(2)
  }
}

/*
 * `--no-archive` retire les identifiants du stockage objet de l'environnement
 * du serveur. Sert a verifier, en HTTP reel, qu'un import est REFUSE quand la
 * piece d'origine ne peut pas etre conservee — le comportement corrige apres
 * l'audit, qui laissait auparavant passer l'import avec une lacune muette.
 */
if (process.argv.includes('--no-archive')) {
  delete testEnv.CLOUDINARY_CLOUD_NAME
  delete testEnv.CLOUDINARY_API_KEY
  delete testEnv.CLOUDINARY_API_SECRET
  testEnv.CLOUDINARY_CLOUD_NAME = ''
  testEnv.CLOUDINARY_API_KEY = ''
  testEnv.CLOUDINARY_API_SECRET = ''
  console.log('Stockage objet volontairement absent : les imports doivent etre refuses.')
}

const port = process.env.PORT ?? (process.argv.includes('--no-archive') ? '3011' : '3010')
console.log(`Serveur de vérification sur http://localhost:${port}`)
console.log(`Base : ${testEnv.DATABASE_URL.match(/@([^/:?]+)/)?.[1] ?? 'inconnue'}\n`)

// `next dev` lit `.env` lui-même et ses valeurs l'emporteraient. On passe donc
// l'environnement complet déjà résolu, la branche ayant remplacé la production.
const useDev = process.argv.includes('--dev')
const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  useDev ? ['next', 'dev', '--turbopack', '-p', port] : ['next', 'start', '-p', port],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...testEnv, PORT: port },
    shell: process.platform === 'win32',
  },
)

child.on('exit', (code) => process.exit(code ?? 0))
