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
      ? 'var(--admin-red)'
      : displayScore != null && displayScore >= 6
      ? 'var(--admin-amber)'
      : 'var(--admin-emerald)'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/risks-opportunities" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          ro.type === 'risk'
            ? 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]'
            : 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
        }`}>
          {ro.type === 'risk' ? 'Risque' : 'Opportunité'}
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
          {ro.reference}
        </span>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <h1 className="text-[18px] font-semibold mb-5" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          {ro.description}
        </h1>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Catégorie</p>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{ro.category.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Statut</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              ro.status === 'identified' ? 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]' :
              ro.status === 'treated' ? 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]' :
              ro.status === 'monitored' ? 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]' :
              'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
            }`}>
              {ro.status}
            </span>
          </div>
          {ro.context && (
            <div className="col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Contexte / Source</p>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{ro.context}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Responsable</p>
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{ro.owner ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Date cible</p>
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{ro.targetDate ?? '—'}</p>
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-[11px] font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-muted)' }}>Évaluation</p>
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {ro.type === 'risk' ? 'Gravité' : 'Priorité'}
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                {ro.type === 'risk' ? (ro.gravity ?? '—') : (ro.priority ?? '—')}
              </p>
            </div>
            <div style={{ color: 'var(--admin-border)' }} className="text-xl">×</div>
            <div className="text-center">
              <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {ro.type === 'risk' ? 'Probabilité' : 'Importance'}
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                {ro.type === 'risk' ? (ro.probability ?? '—') : (ro.importance ?? '—')}
              </p>
            </div>
            <div style={{ color: 'var(--admin-border)' }} className="text-xl">=</div>
            <div className="text-center">
              <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{scoreLabel}</p>
              <p className="text-2xl font-bold" style={{ color: scoreColor }}>{displayScore ?? '—'}</p>
            </div>
          </div>
        </div>

        {ro.notes && (
          <div className="border-t mt-4 pt-4" style={{ borderColor: 'var(--admin-border)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Notes</p>
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{ro.notes}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Actions de traitement ({actions.length})
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune action enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--admin-bg)' }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: action.completedAt ? 'var(--admin-emerald)' : 'var(--admin-amber)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{action.description}</p>
                  <div className="flex gap-4 mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {action.responsible && <span>Resp: {action.responsible}</span>}
                    {action.targetDate && <span>Échéance: {action.targetDate}</span>}
                    {action.completedAt && <span style={{ color: 'var(--admin-emerald)' }}>✓ Clôturée</span>}
                  </div>
                  {action.result && <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{action.result}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
