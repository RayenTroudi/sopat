import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getRiskOpportunityById } from '@/lib/db/risks-opportunities'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RiskOpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')

  const data = await getRiskOpportunityById(id)
  if (!data) notFound()

  const { ro, actions } = data

  const displayScore = ro.type === 'risk' ? ro.criticality : ro.score
  const scoreLabel = ro.type === 'risk' ? 'Criticité (G×P)' : 'Score (Pr×I)'
  const scoreColor =
    displayScore != null && displayScore >= 12
      ? 'text-red-600 font-bold text-2xl'
      : displayScore != null && displayScore >= 6
      ? 'text-orange-500 font-bold text-2xl'
      : 'text-green-600 font-bold text-2xl'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/risks-opportunities" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Retour
        </Link>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          ro.type === 'risk' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {ro.type === 'risk' ? 'Risque' : 'Opportunité'}
        </span>
        <span className="font-mono text-sm text-gray-500">{ro.reference}</span>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{ro.description}</h1>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Catégorie</p>
            <p className="text-sm font-medium">{ro.category.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Statut</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              ro.status === 'identified' ? 'bg-yellow-100 text-yellow-700' :
              ro.status === 'treated' ? 'bg-blue-100 text-blue-700' :
              ro.status === 'monitored' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {ro.status}
            </span>
          </div>
          {ro.context && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contexte / Source</p>
              <p className="text-sm">{ro.context}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Responsable</p>
            <p className="text-sm">{ro.owner ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date cible</p>
            <p className="text-sm">{ro.targetDate ?? '—'}</p>
          </div>
        </div>

        {/* Scoring */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Évaluation</p>
          {ro.type === 'risk' ? (
            <div className="flex gap-8 items-center">
              <div className="text-center">
                <p className="text-xs text-gray-500">Gravité</p>
                <p className="text-xl font-bold text-gray-700">{ro.gravity ?? '—'}</p>
              </div>
              <div className="text-gray-300 text-xl">×</div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Probabilité</p>
                <p className="text-xl font-bold text-gray-700">{ro.probability ?? '—'}</p>
              </div>
              <div className="text-gray-300 text-xl">=</div>
              <div className="text-center">
                <p className="text-xs text-gray-500">{scoreLabel}</p>
                <p className={scoreColor}>{displayScore ?? '—'}</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-8 items-center">
              <div className="text-center">
                <p className="text-xs text-gray-500">Priorité</p>
                <p className="text-xl font-bold text-gray-700">{ro.priority ?? '—'}</p>
              </div>
              <div className="text-gray-300 text-xl">×</div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Importance</p>
                <p className="text-xl font-bold text-gray-700">{ro.importance ?? '—'}</p>
              </div>
              <div className="text-gray-300 text-xl">=</div>
              <div className="text-center">
                <p className="text-xs text-gray-500">{scoreLabel}</p>
                <p className={scoreColor}>{displayScore ?? '—'}</p>
              </div>
            </div>
          )}
        </div>

        {ro.notes && (
          <div className="border-t mt-4 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">{ro.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Actions de traitement ({actions.length})
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune action enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  action.completedAt ? 'bg-green-500' : 'bg-orange-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{action.description}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    {action.responsible && <span>Resp: {action.responsible}</span>}
                    {action.targetDate && <span>Échéance: {action.targetDate}</span>}
                    {action.completedAt && <span className="text-green-600">✓ Clôturée</span>}
                  </div>
                  {action.result && <p className="text-xs text-gray-600 mt-1">{action.result}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
