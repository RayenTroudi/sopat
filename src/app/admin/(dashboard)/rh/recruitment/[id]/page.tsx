import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getRecruitmentRequestById } from '@/lib/db/rh'
import { ArrowLeft, UserPlus } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  ouvert: 'Ouvert', en_cours: 'En cours', pourvu: 'Pourvu', annule: 'Annulé',
}
const STATUS_COLORS: Record<string, string> = {
  ouvert: 'var(--green)', en_cours: '#3b82f6', pourvu: '#6b7280', annule: '#ef4444',
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--admin-muted)' }}>{label}</div>
      <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-fg)' }}>{value}</div>
    </div>
  )
}

export default async function RecruitmentDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const req = await getRecruitmentRequestById(params.id)
  if (!req) notFound()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/recruitment" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
          <UserPlus size={20} style={{ color: 'var(--ivory)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>{req.postTitle}</h1>
          <div className="flex items-center gap-2 mt-1">
            {req.refCode && <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>{req.refCode}</span>}
            <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ background: STATUS_COLORS[req.status] }}>
              {STATUS_LABELS[req.status]}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Département', value: req.requestingDept },
          { label: 'Statut proposé', value: req.proposedStatus },
          { label: 'Date ouverture', value: req.openedDate ? new Date(req.openedDate).toLocaleDateString('fr-FR') : null },
        ].map(({ label, value }) => value && (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>{label}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--admin-fg)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="p-5">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Motif & contexte</h2>
          <Row label="Supérieur hiérarchique" value={req.hierarchicalSuperior} />
          <Row label="Motif du recrutement" value={req.reason} />
        </div>
        <div className="p-5">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Profil recherché</h2>
          <Row label="Niveau d'études" value={req.studyLevel} />
          <Row label="Spécialité" value={req.studySpecialty} />
          <Row label="Expérience" value={req.experienceDuration} />
          <Row label="Missions principales" value={req.mainMissions} />
          <Row label="Compétences requises" value={req.requiredSkills} />
        </div>
        {req.notes && (
          <div className="p-5">
            <Row label="Notes" value={req.notes} />
          </div>
        )}
      </div>
    </div>
  )
}
