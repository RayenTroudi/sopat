/**
 * Acteur utilisé par les tâches de fond (relances, digests, rappels) pour
 * renseigner les colonnes `created_by`, qui sont des uuid NOT NULL référençant
 * users.id — une chaîne littérale comme 'system' y déclenche une erreur 22P02.
 *
 * La ligne correspondante est créée par la migration 0026_system_user.sql.
 * Le compte est is_active = false : il ne peut pas se connecter.
 */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'
