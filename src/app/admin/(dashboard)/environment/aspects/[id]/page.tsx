import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import {
  getEnvironmentalAspectById,
  AES_CONDITION_LABELS,
  AES_STATUS_LABELS,
} from '@/lib/db/environmental-aspects'
import Link from 'next/link'
import AspectStatusPanel from './AspectStatusPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Aspect environnemental | SOPAT Admin' }

export default async function AspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const aspect = await getEnvironmentalAspectById(id)
  if (!aspect) notFound()

  const fields: { label: string; value: string | null }[] = [
    { label: 'Activité / processus', value: aspect.activity },
    { label: 'Aspect environnemental', value: aspect.aspect },
    { label: 'Impact', value: aspect.impact },
    { label: 'Condition', value: AES_CONDITION_LABELS[aspect.condition] },
    {
      label: 'Évaluation',
      value: aspect.significance != null
        ? `F ${aspect.frequency} × G ${aspect.gravity} = ${aspect.significance} (${aspect.isSignificant ? 'SIGNIFICATIF' : 'non significatif'})`
        : null,
    },
    { label: 'Mesures de maîtrise', value: aspect.controlMeasures },
    { label: 'Exigence légale', value: aspect.legalRequirement },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/environment/aspects" className="text-[13px] hover:opacity-70" style={{ color: 'var(--admin-text-muted)' }}>
            ← Retour
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            {aspect.reference}
          </h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
            {AES_STATUS_LABELS[aspect.status]}
          </span>
          {aspect.isSignificant && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
              Significatif
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <dl className="space-y-3">
          {fields.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <AspectStatusPanel aspectId={aspect.id} status={aspect.status} />
    </div>
  )
}
