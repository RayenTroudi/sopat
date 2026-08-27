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
  const branch = process.env.TEST_DATABASE_URL
  if (branch && branch.trim()) {
    process.env.DATABASE_URL = branch
    const host = branch.match(/@([^/:]+)/)?.[1] ?? 'branch'
    return { isolated: true, label: `branche de test (${host})` }
  }

  if (consumesSequence && !process.argv.includes('--allow-production')) {
    console.error(
      '\nCe test consomme un numéro réel dans la séquence de références de ' +
      "l'année en cours, et les numéros ne sont jamais réutilisés.\n\n" +
      'Lancez-le sur une branche isolée :\n' +
      '  TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env ' + (process.argv[1] ?? '<script>') + '\n\n' +
      "ou, en connaissance de cause, ajoutez --allow-production pour accepter l'écart.\n"
    )
    process.exit(2)
  }

  const host = (process.env.DATABASE_URL ?? '').match(/@([^/:]+)/)?.[1] ?? 'inconnue'
  return { isolated: false, label: `base configurée (${host}) — écart de séquence accepté` }
}
