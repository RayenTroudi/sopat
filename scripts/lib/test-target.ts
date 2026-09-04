/**
 * Chooses which database an integration test runs against.
 *
 * Why this exists
 * ---------------
 * Some tests exercise `generateNcReference()`, which allocates a real number
 * from the current-year counter. Numbers are never reused — that is the
 * production rule and it is not negotiable — so every such run leaves a
 * permanent gap in whichever database it touched. Against the production
 * database those gaps accumulate for no reason.
 *
 * The fix is isolation, not a weaker rule: point the test at a Neon branch.
 * `db/index.ts` resolves `DATABASE_URL` lazily on first use, so overriding the
 * variable here — before any module touches the pool — redirects the whole
 * suite without a single change to production code.
 *
 * Usage
 * -----
 *   TEST_DATABASE_URL="postgres://…branch…" npx tsx --env-file=.env scripts/<test>.ts
 *
 * Create a throwaway branch with the Neon CLI or console; giving it an
 * expiry lets Neon remove it for you:
 *   neonctl branches create --name qms-test --expires-at <ISO-8601>
 *
 * Without TEST_DATABASE_URL a sequence-consuming test refuses to run unless
 * `--allow-production` is passed, so the gap is always a deliberate choice.
 */

export type TestTarget = {
  isolated: boolean
  label: string
}

/**
 * @param consumesSequence true when the test allocates a real reference number.
 */
export function selectTestTarget(consumesSequence: boolean): TestTarget {
  const branch = process.env.TEST_DATABASE_URL?.trim()
  if (branch) {
    // Validate before overriding DATABASE_URL. Anything non-empty used to be
    // accepted, so a placeholder left in the command line — TEST_DATABASE_URL="…"
    // — silently replaced a working connection string and surfaced as an
    // ERR_INVALID_URL thrown from inside the Neon driver, several frames below
    // anything the reader recognises. A wrong value should say so here.
    const host = parsePostgresHost(branch)
    if (!host) {
      console.error(
        `\nTEST_DATABASE_URL n'est pas une URL PostgreSQL utilisable : ${JSON.stringify(branch)}\n\n` +
        'Attendu : postgres://user:motdepasse@hote/base — typiquement une branche Neon jetable.\n\n' +
        'Sans outil en ligne de commande : console Neon → votre projet → Branches → New branch,\n' +
        'puis copiez la chaîne de connexion proposée.\n\n' +
        'Avec la CLI (à installer une fois : npm i -g neonctl) :\n' +
        '  neonctl branches create --name qms-test\n' +
        '  neonctl connection-string qms-test\n\n' +
        'Laissez la variable vide pour utiliser la base configurée dans .env.\n'
      )
      process.exit(2)
    }

    // Same endpoint as the configured database? Then it is not a branch, whatever
    // the string looks like. Compared on the NORMALISED endpoint, because Neon
    // publishes two hostnames for one database — the direct endpoint and the
    // pooled one, which appends `-pooler` to the endpoint id. A literal hostname
    // comparison passes the pooled form straight through, which is exactly how a
    // production connection string got accepted as a test branch once.
    const configured = parsePostgresHost(process.env.DATABASE_URL ?? '')
    const sameDatabase =
      configured !== null && normaliseEndpoint(configured) === normaliseEndpoint(host)

    if (sameDatabase && consumesSequence && !process.argv.includes('--allow-production')) {
      console.error(
        `\nTEST_DATABASE_URL désigne la MÊME base que DATABASE_URL (point de terminaison ` +
        `${normaliseEndpoint(host)}).\n\n` +
        (configured !== host
          ? `Les deux noms d'hôte diffèrent — ${configured} et ${host} — mais Neon publie deux\n` +
            "noms pour une seule base : le point de terminaison direct et sa variante « -pooler ».\n" +
            'Ce sont les mêmes données.\n\n'
          : '') +
        'Ce test écrit et consomme des numéros de référence qui ne sont jamais réutilisés :\n' +
        'le lancer ici laisserait un trou permanent dans vos séries AUD- et NC-, plus un\n' +
        "programme d'audit annulé au registre.\n\n" +
        'Créez une vraie branche — console Neon → Branches → New branch — et utilisez SA chaîne\n' +
        'de connexion : son identifiant de point de terminaison sera différent.\n'
      )
      process.exit(2)
    }
    if (sameDatabase) {
      console.warn(
        `\nAvertissement : TEST_DATABASE_URL désigne la même base que DATABASE_URL ` +
        `(${normaliseEndpoint(host)}). Ce test est en lecture seule, donc sans conséquence, ` +
        "mais ce n'est pas une branche isolée.\n"
      )
    }

    process.env.DATABASE_URL = branch
    return {
      isolated: !sameDatabase,
      label: sameDatabase ? `base configurée (${host})` : `branche de test (${host})`,
    }
  }

  if (consumesSequence && !process.argv.includes('--allow-production')) {
    console.error(
      '\nCe test consomme un numéro réel dans la séquence de références de ' +
      "l'année en cours, et les numéros ne sont jamais réutilisés.\n\n" +
      'Lancez-le sur une branche isolée — console Neon → Branches → New branch, ou\n' +
      'npm i -g neonctl puis « neonctl branches create --name qms-test » :\n' +
      '  TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env ' + (process.argv[1] ?? '<script>') + '\n\n' +
      "ou, en connaissance de cause, ajoutez --allow-production pour accepter l'écart.\n"
    )
    process.exit(2)
  }

  const host = (process.env.DATABASE_URL ?? '').match(/@([^/:]+)/)?.[1] ?? 'inconnue'
  return { isolated: false, label: `base configurée (${host}) — écart de séquence accepté` }
}

/**
 * Hostname of a PostgreSQL connection string, or null when the value is not one.
 *
 * Used as a validity test as much as an accessor: a string that yields no host
 * is not a connection string, whatever else it may be.
 */
function parsePostgresHost(value: string): string | null {
  if (!value.trim()) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return null
    return url.hostname || null
  } catch {
    return null
  }
}

/**
 * The Neon endpoint a hostname belongs to, ignoring the pooled variant.
 *
 * Neon serves one database under two hostnames: `ep-<id>.<region>…` and
 * `ep-<id>-pooler.<region>…`. Both reach the same data, so the `-pooler` suffix
 * must not make two names look like two databases. A different branch always has
 * a different endpoint id, so this stays a reliable discriminator.
 */
function normaliseEndpoint(hostname: string): string {
  const [endpoint, ...rest] = hostname.split('.')
  return [endpoint.replace(/-pooler$/, ''), ...rest].join('.')
}
