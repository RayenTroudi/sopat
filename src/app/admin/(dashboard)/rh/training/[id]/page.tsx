import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTrainingSessionById } from '@/lib/db/rh'
import { ArrowLeft, GraduationCap, Users } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié', en_cours: 'En cours', realise: 'Réalisé', reporte: 'Reporté', annule: 'Annulé',
}
const STATUS_COLORS: Record<string, string> = {
  planifie: '#3b82f6', en_cours: 'var(--green)', realise: '#6b7280', reporte: '#f59e0b', annule: '#ef4444',
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--admin-muted)' }}>{label}</div>
      <div className="text-sm" style={{ color: 'var(--admin-fg)' }}>{value}</div>
    </div>
  )
}

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const { session: s, participants } = await getTrainingSessionById(id)
  if (!s) notFound()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/rh/training" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
            <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
          </Link>
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <GraduationCap size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>{s.theme}</h1>
            <div className="flex items-center gap-2 mt-1">
              {s.refCode && <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>{s.refCode}</span>}
              <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ background: STATUS_COLORS[s.status] ?? '#6b7280' }}>
                {STATUS_LABELS[s.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border p-5 space-y-1" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Informations générales</h2>
          <Row label="Thématique" value={s.thematic} />
          <Row label="Organisme" value={s.trainingOrg} />
          <Row label="Formateur" value={s.trainerName} />
          <Row label="Lieu" value={s.location} />
          <Row label="Type d'action" value={s.actionType} />
          <Row label="Objectif" value={s.objective} />
        </div>

        <div className="rounded-xl border p-5 space-y-1" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Dates</h2>
          <Row label="Année" value={String(s.year)} />
          <Row label="Période prévue" value={s.plannedStartDate && s.plannedEndDate
            ? `${new Date(s.plannedStartDate).toLocaleDateString('fr-FR')} → ${new Date(s.plannedEndDate).toLocaleDateString('fr-FR')}` : null} />
          <Row label="Période réelle" value={s.actualStartDate && s.actualEndDate
            ? `${new Date(s.actualStartDate).toLocaleDateString('fr-FR')} → ${new Date(s.actualEndDate).toLocaleDateString('fr-FR')}` : null} />
          <Row label="Éval. à chaud" value={s.hotEvalDate ? new Date(s.hotEvalDate).toLocaleDateString('fr-FR') : null} />
          <Row label="Éval. à froid" value={s.coldEvalDate ? new Date(s.coldEvalDate).toLocaleDateString('fr-FR') : null} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} style={{ color: 'var(--green)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>Participants ({participants.length})</h2>
        </div>
        {participants.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Aucun participant enregistré</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Nom', 'Présent', 'Éval. chaud', 'Éval. froid'].map(h => (
                  <th key={h} className="py-2 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map(({ p, u }) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="py-2" style={{ color: 'var(--admin-fg)' }}>{u?.name ?? '—'}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: p.attended ? 'var(--green)' : '#ef4444', color: 'white' }}>
                      {p.attended ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="py-2" style={{ color: 'var(--admin-muted)' }}>{p.hotEvalScore ?? '—'}/4</td>
                  <td className="py-2" style={{ color: 'var(--admin-muted)' }}>{p.coldEvalScore ?? '—'}/4</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
