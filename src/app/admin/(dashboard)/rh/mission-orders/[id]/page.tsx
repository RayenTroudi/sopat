import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { missionOrders, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, MapPin, CheckCircle, Clock } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', pending: 'En attente', approved: 'Approuvé', completed: 'Terminé',
}

export default async function MissionOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const [order] = await db
    .select({
      id: missionOrders.id,
      cinNumber: missionOrders.cinNumber,
      cinIssuedAt: missionOrders.cinIssuedAt,
      destination: missionOrders.destination,
      missionPurpose: missionOrders.missionPurpose,
      startDate: missionOrders.startDate,
      endDate: missionOrders.endDate,
      status: missionOrders.status,
      gmApprovedAt: missionOrders.gmApprovedAt,
      rhApprovedAt: missionOrders.rhApprovedAt,
      userName: users.name,
      createdAt: missionOrders.createdAt,
    })
    .from(missionOrders)
    .leftJoin(users, eq(users.id, missionOrders.userId))
    .where(eq(missionOrders.id, id))

  if (!order) redirect('/admin/rh/mission-orders')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/mission-orders" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <MapPin size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Ordre de mission</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>{order.userName} — FOR-RH-41</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Agent</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span style={{ color: 'var(--admin-muted)' }}>Nom :</span> <strong style={{ color: 'var(--admin-fg)' }}>{order.userName}</strong></div>
            <div><span style={{ color: 'var(--admin-muted)' }}>CIN :</span> <strong style={{ color: 'var(--admin-fg)' }}>{order.cinNumber ?? '—'}</strong></div>
            <div><span style={{ color: 'var(--admin-muted)' }}>CIN délivrée à :</span> <span style={{ color: 'var(--admin-fg)' }}>{order.cinIssuedAt ?? '—'}</span></div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Mission</p>
          <div className="text-sm space-y-2">
            <div><span style={{ color: 'var(--admin-muted)' }}>Destination :</span> <strong style={{ color: 'var(--admin-fg)' }}>{order.destination ?? '—'}</strong></div>
            <div><span style={{ color: 'var(--admin-muted)' }}>Objet :</span> <span style={{ color: 'var(--admin-fg)' }}>{order.missionPurpose ?? '—'}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span style={{ color: 'var(--admin-muted)' }}>Départ :</span> <span style={{ color: 'var(--admin-fg)' }}>{order.startDate ? new Date(order.startDate).toLocaleDateString('fr-FR') : '—'}</span></div>
              <div><span style={{ color: 'var(--admin-muted)' }}>Retour :</span> <span style={{ color: 'var(--admin-fg)' }}>{order.endDate ? new Date(order.endDate).toLocaleDateString('fr-FR') : '—'}</span></div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Statut & Approbations</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ background: order.status === 'approved' ? 'var(--green)' : order.status === 'pending' ? '#f59e0b' : '#6b7280' }}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {order.gmApprovedAt ? <CheckCircle size={14} style={{ color: 'var(--green)' }} /> : <Clock size={14} style={{ color: '#f59e0b' }} />}
              <span style={{ color: 'var(--admin-muted)' }}>DG :</span>
              <span style={{ color: 'var(--admin-fg)' }}>{order.gmApprovedAt ? new Date(order.gmApprovedAt).toLocaleDateString('fr-FR') : 'En attente'}</span>
            </div>
            <div className="flex items-center gap-2">
              {order.rhApprovedAt ? <CheckCircle size={14} style={{ color: 'var(--green)' }} /> : <Clock size={14} style={{ color: '#f59e0b' }} />}
              <span style={{ color: 'var(--admin-muted)' }}>RH :</span>
              <span style={{ color: 'var(--admin-fg)' }}>{order.rhApprovedAt ? new Date(order.rhApprovedAt).toLocaleDateString('fr-FR') : 'En attente'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
