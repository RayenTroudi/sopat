import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'
import { checkBudgetThresholdAndNotify } from '@/lib/notifications'

/**
 * À appeler après TOUTE écriture qui change la consommation budgétaire d'un
 * projet — soit `Σ purchase_orders.total_cost + Σ extra_expenses.amount
 * (approuvées)`.
 *
 * La consommation n'est stockée nulle part : elle est recalculée à chaque
 * lecture. « Mettre à jour la consommation » revient donc à deux choses, et
 * les oublier laissait des chiffres périmés à l'écran :
 *
 * 1. invalider les lectures mises en cache qui l'agrègent — la liste projets
 *    et les deux widgets du tableau de bord somment les bons de commande ;
 * 2. réévaluer les seuils d'alerte (90 % / dépassement).
 *
 * La fiche projet est en `force-dynamic`, mais on la revalide quand même pour
 * les clients qui ont déjà la route en cache côté navigateur.
 */
export async function syncBudgetConsumption(
  projectId: string | null | undefined,
  actorId: string,
) {
  if (!projectId) return

  await checkBudgetThresholdAndNotify(projectId, actorId)

  revalidateTag('projects-list', 'default')
  revalidateTag('dashboard-kpis', 'default')
  revalidateTag('dashboard-at-risk', 'default')
  revalidatePath(`/admin/projects/${projectId}`)
}
