// db/seeds/backfill-dms-codes.ts — NEUTRALISÉ (migration 0038)
//
// Ce seed portait la même faute que `attachDmsCode()` : pour chaque client,
// fournisseur, projet, bon de commande, NC, CAPA et audit existant, il
// consommait un numéro dans `dms_code_sequences` puis INSÉRAIT une ligne dans
// `dms_documents` reliée en 'origin' à l'entité.
//
// C'est ce qui a promu des lignes d'achat au rang de formulaires maîtrisés
// (« FOR-AC-12 — Phoenix dactylifera T60 — 3 unités ») et fait gonfler
// LIS-MI-01 à 714 lignes dont 485 n'étaient que des transactions ERP.
//
// Le corps est retiré plutôt que le fichier, parce qu'un seed re-exécutable
// laissé en place aurait défait le nettoyage de la migration 0038 au premier
// `npm run db:seed` venu.
//
// LIS-MI-01 est le registre des informations documentées *maîtrisées*. On n'y
// entre que de deux façons :
//   1. explicitement, via QMS → Informations documentées → « Nouveau document »
//      (POST /api/dms → createDmsDocument) ;
//   2. par l'import du registre source (db/seeds/dms-import.ts).
//
// Rattacher un enregistrement ERP à la définition qui le régit se fait par une
// relation, jamais par une nouvelle ligne : voir `linkControlledDocument()`
// dans src/lib/dms/attach.ts.

export async function backfillDmsCodes(): Promise<never> {
  throw new Error(
    'backfill-dms-codes est neutralisé : il inscrivait chaque entité ERP dans ' +
    'LIS-MI-01. Utiliser linkControlledDocument() (src/lib/dms/attach.ts) pour ' +
    'relier un enregistrement à sa définition maîtrisée.',
  )
}
