import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { integrationPlans, users } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { ClipboardList, Plus, ChevronRight } from 'lucide-react'

export default async function IntegrationPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const plans = await db
    .select({
      id: integrationPlans.id,
      userId: integrationPlans.userId,
      userName: users.name,
      plannedStartDate: integrationPlans.plannedStartDate,
      plannedEndDate: integrationPlans.plannedEndDate,
      items: integrationPlans.items,
    })
    .from(integrationPlans)
    .leftJoin(users, eq(users.id, integrationPlans.userId))
    .orderBy(asc(integrationPlans.plannedStartDate))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <ClipboardList size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Plans d'intégration</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>PLA-RH-01 — {plans.length} plan(s)</p>
          </div>
        </div>
        <Link href="/admin/rh/integration/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
          <Plus size={16} /> Nouveau plan
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé / Stagiaire', 'Période prévue', 'Progression', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                Aucun plan d'intégration
              </td></tr>
            )}
            {plans.map(p => {
              const items = (p.items as { status?: string }[]) ?? []
              const done = items.filter(i => i.status === 'done').length
              const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0
              return (
                <tr key={p.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{p.userName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {p.plannedStartDate ? new Date(p.plannedStartDate).toLocaleDateString('fr-FR') : '—'}
                    {p.plannedEndDate ? ` → ${new Date(p.plannedEndDate).toLocaleDateString('fr-FR')}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full" style={{ background: 'var(--admin-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>{done}/{items.length}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/rh/integration/${p.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
                      Voir <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
