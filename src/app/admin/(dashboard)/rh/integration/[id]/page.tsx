import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { integrationPlans, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, ClipboardList, CheckCircle, Clock, Loader } from 'lucide-react'

type PlanItem = { theme: string; responsible: string; plannedDate?: string; actualDate?: string; status: string; comment?: string }

const STATUS_ICONS: Record<string, React.ReactNode> = {
  done:        <CheckCircle size={14} style={{ color: 'var(--green)' }} />,
  in_progress: <Loader size={14} style={{ color: '#f59e0b' }} />,
  pending:     <Clock size={14} style={{ color: '#6b7280' }} />,
}
const STATUS_LABELS: Record<string, string> = { done: 'Réalisé', in_progress: 'En cours', pending: 'À faire' }

export default async function IntegrationPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const [plan] = await db
    .select({
      id: integrationPlans.id,
      userId: integrationPlans.userId,
      plannedStartDate: integrationPlans.plannedStartDate,
      plannedEndDate: integrationPlans.plannedEndDate,
      items: integrationPlans.items,
      notes: integrationPlans.notes,
      userName: users.name,
    })
    .from(integrationPlans)
    .leftJoin(users, eq(users.id, integrationPlans.userId))
    .where(eq(integrationPlans.id, id))

  if (!plan) redirect('/admin/rh/integration')

  const items = (plan.items as PlanItem[]) ?? []
  const done = items.filter(i => i.status === 'done').length
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/integration" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <ClipboardList size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Plan d'intégration</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>{plan.userName} — PLA-RH-01</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Progression</div>
          <div className="text-2xl font-bold mb-2" style={{ color: 'var(--green)' }}>{pct}%</div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--admin-bg)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--green)' }} />
          </div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Période</div>
          <div className="text-sm" style={{ color: 'var(--admin-fg)' }}>
            {plan.plannedStartDate ? new Date(plan.plannedStartDate).toLocaleDateString('fr-FR') : '—'}
            {plan.plannedEndDate ? ` → ${new Date(plan.plannedEndDate).toLocaleDateString('fr-FR')}` : ''}
          </div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Étapes</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--admin-fg)' }}>{done}<span className="text-sm font-normal" style={{ color: 'var(--admin-muted)' }}>/{items.length}</span></div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Étapes du plan</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Thème / Activité', 'Responsable', 'Date prévue', 'Date réelle', 'Statut', 'Commentaire'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-muted)' }}>Aucune étape</td></tr>
            )}
            {items.map((item, i) => (
              <tr key={i} className="even:bg-[var(--admin-bg)]/40" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-2 font-medium" style={{ color: 'var(--admin-fg)' }}>{item.theme}</td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-muted)' }}>{item.responsible || '—'}</td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {item.plannedDate ? new Date(item.plannedDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {item.actualDate ? new Date(item.actualDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-2">
                  <span className="flex items-center gap-1 text-xs">
                    {STATUS_ICONS[item.status] ?? STATUS_ICONS.pending}
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-muted)' }}>{item.comment ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.notes && (
        <div className="mt-4 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-muted)' }}>
          <strong style={{ color: 'var(--admin-fg)' }}>Notes :</strong> {plan.notes}
        </div>
      )}
    </div>
  )
}
