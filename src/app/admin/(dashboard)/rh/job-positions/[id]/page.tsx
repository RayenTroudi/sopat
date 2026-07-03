import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getJobPositionById } from '@/lib/db/rh'
import { ArrowLeft, Briefcase } from 'lucide-react'

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>{label}</div>
      <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-fg)' }}>{value}</div>
    </div>
  )
}

export default async function JobPositionDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const pos = await getJobPositionById(params.id)
  if (!pos) notFound()

  const techniques = (pos.workTechniques as { label: string }[]) ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/rh/job-positions" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
            <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
          </Link>
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Briefcase size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>{pos.title}</h1>
            {pos.code && <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>{pos.code}</span>}
          </div>
        </div>
        <Link href={`/admin/rh/job-positions/${pos.id}/edit`}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
          Modifier
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Département', value: pos.department },
          { label: 'Supérieur hiérarchique', value: pos.hierarchicalSuperior },
          { label: 'Mis à jour le', value: pos.updatedDate ? new Date(pos.updatedDate).toLocaleDateString('fr-FR') : null },
        ].map(({ label, value }) => value && (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>{label}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--admin-fg)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="p-5">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Formation</h2>
          <Row label="Formation initiale" value={pos.initialTraining} />
          <Row label="Formation continue" value={pos.continuousTraining} />
        </div>
        <div className="p-5">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Missions & attributions</h2>
          <Row label="Missions principales" value={pos.mainMissions} />
          <Row label="Attributions" value={pos.attributions} />
        </div>
        <div className="p-5">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Profil requis</h2>
          <Row label="Critères indispensables" value={pos.indispensableCriteria} />
          <Row label="Critères souhaitables" value={pos.desirableCriteria} />
        </div>
        {techniques.length > 0 && (
          <div className="p-5">
            <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Techniques de travail</h2>
            <ul className="space-y-1">
              {techniques.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-fg)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--green)' }} />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
