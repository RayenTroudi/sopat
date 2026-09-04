/**
 * Réconciliation classeurs FOR-MI-14 ↔ tables de référence de l'ERP.
 *
 * Compare, champ par champ, les sept classeurs de la campagne 2025 aux données
 * que l'application tient pour vraies : nom du processus, documents de référence,
 * référentiel ISO, créneau horaire, nombre et libellé de chaque étape.
 *
 * Les classeurs eux-mêmes ne sont pas lus ici. Les faits en sont extraits une
 * fois vers docs/qms/for-mi-14-workbooks.json, qui porte le SHA-256 de chaque
 * fichier source : le contrôle est donc rejouable sans les binaires, et un
 * classeur révisé se voit dans un diff de texte lisible plutôt que dans un blob.
 *
 * Lecture seule, rejouable.
 *
 *   npx tsx --env-file=.env scripts/verify-excel-reconciliation.ts
 */
import { selectTestTarget } from './lib/test-target'

const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Normalisation déclarée, appliquée AUX DEUX CÔTÉS avant comparaison.
 *
 * Les classeurs emploient la typographie française — apostrophe U+2019 et espace
 * insécable U+00A0 devant les deux-points — là où les libellés semés utilisent
 * l'apostrophe ASCII et une espace ordinaire. Ce sont des variantes typographiques
 * du même texte, pas des exigences différentes : les normaliser permet de saisir,
 * rechercher et apparier un libellé, et tout écart subsistant après normalisation
 * est signalé comme une divergence réelle plutôt qu'absorbé en silence.
 */
const norm = (s: string) =>
  (s ?? '').replace(/’/g, "'").replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

type Workbook = {
  sourceFile: string; sha256: string; processName: string
  referenceDocumentsRaw: string; horaire: string
  isoReferentialRaw: string; isoClauses: string[]
  processSteps: string[]; interlocuteurs: string
}

let passed = 0
let failed = 0
const notes: string[] = []

function check(label: string, ok: boolean, excel = '', erp = '') {
  if (ok) { passed++; return }
  failed++
  console.log(`  ÉCART ${label}`)
  if (excel || erp) {
    console.log(`        classeur : ${excel}`)
    console.log(`        ERP      : ${erp}`)
  }
}

async function main() {
  const fixturePath = join(__dirname, '..', 'docs', 'qms', 'for-mi-14-workbooks.json')
  const { workbooks } = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    workbooks: Record<string, Workbook>
  }

  const rows = (await db.execute(sql`
    SELECT p.code::text AS code, p.name, p.procedure_codes,
           p.default_start_time, p.default_end_time, p.default_interlocuteurs,
      (SELECT string_agg(pc.clause_code, '; ' ORDER BY c.sort_key)
         FROM qms_process_clauses pc JOIN iso_clauses c ON c.code = pc.clause_code
        WHERE pc.process_code = p.code) AS clauses,
      (SELECT string_agg(s.label, '||' ORDER BY s.sort_order)
         FROM qms_process_steps s WHERE s.process_code = p.code AND s.is_active) AS steps
    FROM qms_processes p ORDER BY p.sort_order
  `)).rows as Array<Record<string, string>>

  check('les sept processus du classeur sont dans la cartographie', rows.length === 7,
    String(Object.keys(workbooks).length), String(rows.length))

  for (const r of rows) {
    const wb = workbooks[r.code]
    if (!wb) { check(`${r.code} : classeur de référence présent`, false, '—', r.code); continue }
    console.log(`── ${r.code} — ${wb.sourceFile}`)

    check(`${r.code} nom du processus`, norm(wb.processName) === norm(r.name), wb.processName, r.name)

    check(`${r.code} référentiel ISO`,
      wb.isoClauses.join('; ') === (r.clauses ?? ''), wb.isoClauses.join('; '), r.clauses ?? '')

    const wbHoraire = norm(wb.horaire).replace(/\s*à\s*/, '–')
    check(`${r.code} créneau horaire`,
      wbHoraire === `${r.default_start_time}–${r.default_end_time}`,
      wbHoraire, `${r.default_start_time}–${r.default_end_time}`)

    // Les codes de procédure du classeur doivent tous se retrouver côté ERP.
    const wbCodes = [...new Set(wb.referenceDocumentsRaw.match(/PRS-[A-Z]{2}-\d{2}/g) ?? [])]
    const erpCodes = [...new Set(r.procedure_codes.match(/PRS-[A-Z]{2}-\d{2}/g) ?? [])]
    check(`${r.code} documents de référence`,
      wbCodes.every((c) => erpCodes.includes(c)) && wbCodes.length === erpCodes.length,
      wbCodes.join(', '), erpCodes.join(', '))

    // Un libellé répété dans le classeur est une redite de saisie, pas deux
    // critères : dédupliqué à l'import, et signalé ici plutôt que passé sous
    // silence.
    const wbSteps = wb.processSteps.filter(
      (s, i) => wb.processSteps.findIndex((x) => norm(x) === norm(s)) === i)
    if (wbSteps.length !== wb.processSteps.length) {
      notes.push(`${r.code} : le classeur répète ${wb.processSteps.length - wbSteps.length} libellé(s) ` +
        `d'étape (« ${wb.processSteps.find((s, i) => wb.processSteps.findIndex((x) => norm(x) === norm(s)) !== i)} ») — dédupliqué`)
    }

    const erpSteps = (r.steps ?? '').split('||').filter(Boolean)
    check(`${r.code} nombre d'étapes`, wbSteps.length === erpSteps.length,
      String(wbSteps.length), String(erpSteps.length))

    for (let i = 0; i < Math.max(wbSteps.length, erpSteps.length); i++) {
      check(`${r.code} étape ${i + 1}`, norm(wbSteps[i] ?? '') === norm(erpSteps[i] ?? ''),
        wbSteps[i] ?? '—', erpSteps[i] ?? '—')
    }

    check(`${r.code} interlocuteurs`,
      norm(wb.interlocuteurs).replace(/\s*&\s*/g, ' & ').replace(/\s+/g, ' ')
        === norm(r.default_interlocuteurs).replace(/\s*\/\s*/g, ' ').replace(/\s*&\s*/g, ' & '),
      norm(wb.interlocuteurs), r.default_interlocuteurs)
  }

  if (notes.length > 0) {
    console.log('\nRemarques sur les classeurs eux-mêmes :')
    for (const n of notes) console.log(`  · ${n}`)
  }

  console.log(`\n${passed} champ(s) concordant(s), ${failed} écart(s)`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
