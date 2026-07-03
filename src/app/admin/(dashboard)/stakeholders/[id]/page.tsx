import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getStakeholderById } from '@/lib/db/stakeholders'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function StakeholderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')

  const data = await getStakeholderById(id)
  if (!data) notFound()

  const { sh, feedback } = data

  const channelLabels: Record<string, string> = {
    enquete_satisfaction: 'Enquête satisfaction',
    reunion: 'Réunion',
    email: 'Email',
    reclamation: 'Réclamation',
    audit: 'Audit',
    autre: 'Autre',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/stakeholders" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
          {sh.reference}
        </span>
        {sh.isPip && (
          <span className="px-2 py-0.5 bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] rounded-full text-xs font-medium">
            PIP
          </span>
        )}
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-start justify-between mb-5">
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>{sh.name}</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}>
            {sh.type.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {sh.needs && (
            <div className="col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Besoins &amp; Attentes</p>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{sh.needs}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Influence</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>{sh.influence}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Interaction</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>{sh.interaction}</p>
          </div>

          {(sh.contactName || sh.contactEmail || sh.contactPhone) && (
            <div className="col-span-2 border-t pt-4" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text-muted)' }}>Contact</p>
              <div className="text-sm space-y-1">
                {sh.contactName && <p style={{ color: 'var(--admin-text)' }}>{sh.contactName}</p>}
                {sh.contactEmail && <p style={{ color: 'var(--admin-accent)' }}>{sh.contactEmail}</p>}
                {sh.contactPhone && <p style={{ color: 'var(--admin-text)' }}>{sh.contactPhone}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Historique des échanges ({feedback.length})
          </h2>
        </div>
        {feedback.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun échange enregistré.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="flex gap-3 p-3 rounded-lg" style={{ background: 'var(--admin-bg)' }}>
                <div className="flex-shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--admin-accent)' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]">
                      {channelLabels[f.channel] ?? f.channel}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{f.date}</span>
                    {f.satisfactionScore && (
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Score: {f.satisfactionScore}/5</span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{f.summary}</p>
                  {f.responseActions && (
                    <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Actions: {f.responseActions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
