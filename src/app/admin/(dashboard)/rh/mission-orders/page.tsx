import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { missionOrders, users } from '@/db/schema'
import { desc, eq, isNull } from 'drizzle-orm'
import { MapPin, Plus, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', pending: 'En attente', approved: 'Approuvé', completed: 'Terminé',
}
const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', pending: '#f59e0b', approved: 'var(--green)', completed: '#3b82f6',
}

export default async function MissionOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const orders = await db
    .select({
      id: missionOrders.id,
      userName: users.name,
      destination: missionOrders.destination,
      missionPurpose: missionOrders.missionPurpose,
      startDate: missionOrders.startDate,
      endDate: missionOrders.endDate,
      status: missionOrders.status,
    })
    .from(missionOrders)
    .leftJoin(users, eq(users.id, missionOrders.userId))
    .where(isNull(missionOrders.deletedAt))
    .orderBy(desc(missionOrders.createdAt))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <MapPin size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Ordres de mission</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-41 — {orders.length} ordre(s)</p>
          </div>
        </div>
        <Link href="/admin/rh/mission-orders/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
          <Plus size={16} /> Nouvel ordre
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé', 'Destination', 'Objet', 'Du', 'Au', 'Statut', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                Aucun ordre de mission
              </td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{o.userName ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-fg)' }}>{o.destination ?? '—'}</td>
                <td className="px-4 py-3 max-w-xs truncate" style={{ color: 'var(--admin-muted)' }}>{o.missionPurpose ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {o.startDate ? new Date(o.startDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {o.endDate ? new Date(o.endDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ background: STATUS_COLORS[o.status] ?? '#6b7280' }}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/mission-orders/${o.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
                    Voir <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
