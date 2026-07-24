import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getHseSubmissionWithAnswers } from '@/lib/db/hse'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Soumission HSE | SOPAT Admin' }

const STATUS_META: Record<string, { label: string; dim: string; fg: string }> = {
  conforme: { label: 'Conforme', dim: 'var(--admin-emerald-dim)', fg: 'var(--admin-emerald)' },
  partiel: { label: 'Partiel', dim: 'var(--admin-amber-dim)', fg: 'var(--admin-amber)' },
  non_conforme: { label: 'Non conforme', dim: 'var(--admin-red-dim)', fg: 'var(--admin-red)' },
}

export default async function HseSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')

  const data = await getHseSubmissionWithAnswers(id)
  if (!data) notFound()

  const { submission, answers } = data
  const status = STATUS_META[submission.overallStatus] ?? STATUS_META.partiel
  const conformes = answers.filter((a) => a.answer.isCompliant).length
  const total = answers.length

  // Group answers by item category, preserving item sort order
  const sorted = [...answers].sort(
    (a, b) => (a.item?.sortOrder ?? 0) - (b.item?.sortOrder ?? 0)
  )
  const categories = [...new Set(sorted.map((a) => a.item?.category).filter(Boolean))] as string[]
  const uncategorized = sorted.filter((a) => !a.item?.category)
  const groups: { name: string | null; rows: typeof sorted }[] = [
    ...categories.map((name) => ({ name, rows: sorted.filter((a) => a.item?.category === name) })),
    ...(uncategorized.length > 0 ? [{ name: null, rows: uncategorized }] : []),
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/environment/hse-checklist" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Soumission HSE
        </h1>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: status.dim, color: status.fg }}>
          {status.label}
        </span>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <dl className="space-y-3">
          {[
            { label: 'Date', value: submission.submittedDate },
            { label: 'Département', value: submission.dept },
            { label: 'Conformité', value: total > 0 ? `${conformes}/${total} points conformes` : '—' },
            { label: 'Notes', value: submission.notes || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {groups.map((group) => (
        <div key={group.name ?? '__none__'} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          {group.name && (
            <div className="px-4 py-2" style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-[12px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>{group.name}</h3>
            </div>
          )}
          <div>
            {group.rows.map(({ answer, item }) => (
              <div
                key={answer.id}
                className="px-4 py-3"
                style={{
                  borderTop: '1px solid var(--admin-border)',
                  background: answer.isCompliant === false ? 'var(--admin-red-dim)' : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={answer.isCompliant === false
                      ? { background: 'var(--admin-red)', color: '#fff' }
                      : { background: 'var(--green)', color: 'var(--ivory)' }
                    }
                  >
                    {answer.isCompliant === false ? '✗' : '✓'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                      {item?.code && (
                        <span className="font-mono text-[10px] mr-1" style={{ color: 'var(--admin-text-muted)' }}>{item.code}</span>
                      )}
                      {item?.description ?? 'Point supprimé'}
                    </p>
                    {answer.comment && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--admin-red)' }}>{answer.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {total === 0 && (
        <div className="rounded-xl px-4 py-4 text-sm" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>
          Aucune réponse enregistrée pour cette soumission.
        </div>
      )}
    </div>
  )
}
