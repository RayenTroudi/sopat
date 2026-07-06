import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { leaveRequests, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, Calendar } from 'lucide-react'
import { LeaveApprovalPanel } from '@/components/rh/LeaveApprovalPanel'

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: 'Congé annuel',
  conge_maladie: 'Congé maladie',
  conge_maternite: 'Congé maternité',
  conge_paternite: 'Congé paternité',
  conge_sans_solde: 'Congé sans solde',
  jour_ferie: 'Jour férié',
  autre: 'Autre',
}

export default async function LeaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const u = session.user as { userId?: string; id?: string; role?: string }
  const currentUserId = (u.userId ?? u.id)!
  const currentRole = (u.role ?? '') as string

  const [leave] = await db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      durationDays: leaveRequests.durationDays,
      reason: leaveRequests.reason,
      notes: leaveRequests.notes,
      status: leaveRequests.status,
      supervisorApproval: leaveRequests.supervisorApproval,
      rhApproval: leaveRequests.rhApproval,
      directionApproval: leaveRequests.directionApproval,
      userName: users.name,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .leftJoin(users, eq(users.id, leaveRequests.userId))
    .where(eq(leaveRequests.id, id))

  if (!leave) redirect('/admin/rh/leaves')

  const canApproveSupervisor = ['admin', 'direction', 'rh_manager', 'etudes_chef', 'realisation_chef', 'entretien_chef'].includes(currentRole)
  const canApproveRh         = ['admin', 'direction', 'rh_manager', 'rh_agent'].includes(currentRole)
  const canApproveDirection  = ['admin', 'direction'].includes(currentRole)
  const isSelf = leave.userId === currentUserId

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/leaves" className="p-2 rounded-lg hover:opacity-70"
          style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Calendar size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Demande de congé</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>{leave.userName} — FOR-RH-14</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Details */}
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Détails</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Type</span>
              <p className="font-medium mt-0.5" style={{ color: 'var(--admin-fg)' }}>
                {LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType}
              </p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Durée</span>
              <p className="font-bold mt-0.5" style={{ color: 'var(--green)' }}>{leave.durationDays} jour(s)</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Du</span>
              <p className="font-medium mt-0.5" style={{ color: 'var(--admin-fg)' }}>
                {leave.startDate ? new Date(leave.startDate).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Au</span>
              <p className="font-medium mt-0.5" style={{ color: 'var(--admin-fg)' }}>
                {leave.endDate ? new Date(leave.endDate).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
          </div>
          {leave.reason && (
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Motif</span>
              <p className="text-sm mt-0.5" style={{ color: 'var(--admin-fg)' }}>{leave.reason}</p>
            </div>
          )}
          {leave.notes && (
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>{leave.notes}</p>
          )}
        </div>

        {/* Approval panel */}
        <LeaveApprovalPanel
          id={id}
          supervisorApproval={leave.supervisorApproval}
          rhApproval={leave.rhApproval}
          directionApproval={leave.directionApproval}
          canApproveSupervisor={canApproveSupervisor && !isSelf}
          canApproveRh={canApproveRh}
          canApproveDirection={canApproveDirection}
        />
      </div>
    </div>
  )
}
