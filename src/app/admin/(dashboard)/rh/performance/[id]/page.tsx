import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getPerformanceEvaluationById } from '@/lib/db/rh'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, Star } from 'lucide-react'

function ScoreBar({ label, score, max = 4 }: { label: string; score?: number | null; max?: number }) {
  if (score == null) return null
  const pct = (score / max) * 100
  const color = pct >= 75 ? 'var(--green)' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm" style={{ color: 'var(--admin-fg)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--admin-bg)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default async function PerformanceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const ev = await getPerformanceEvaluationById(params.id)
  if (!ev) notFound()

  const [evUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, ev.userId)).limit(1)

  const pct = ev.globalScorePct ? Number(ev.globalScorePct) : 0
  const color = pct >= 75 ? 'var(--green)' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/performance" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
          <Star size={20} style={{ color: 'var(--ivory)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>
            Évaluation — {evUser?.name ?? '—'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
            {ev.evaluationDate ? new Date(ev.evaluationDate).toLocaleDateString('fr-FR') : '—'} · {ev.currentPosition ?? '—'}
          </p>
        </div>
        <div className="ml-auto text-center">
          <div className="text-3xl font-bold" style={{ color }}>{pct.toFixed(0)}%</div>
          <div className="text-xs" style={{ color: 'var(--admin-muted)' }}>Score global</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Compétences techniques & présence</h2>
          <ScoreBar label="Techniques de travail" score={ev.workTechniquesScore ? Number(ev.workTechniquesScore) : null} />
          <ScoreBar label="Assiduité / Ponctualité" score={ev.attendanceScore ? Number(ev.attendanceScore) : null} />
        </div>

        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Comportement & discipline</h2>
          <ScoreBar label="Rigueur & organisation" score={ev.rigorScore ? Number(ev.rigorScore) : null} />
          <ScoreBar label="Discipline" score={ev.disciplineScore ? Number(ev.disciplineScore) : null} />
          <ScoreBar label="Esprit d'amélioration" score={ev.improvementScore ? Number(ev.improvementScore) : null} />
          <ScoreBar label="Respect SMQ" score={ev.smqRespectScore ? Number(ev.smqRespectScore) : null} />
          <ScoreBar label="Analyse des risques" score={ev.riskAnalysisScore ? Number(ev.riskAnalysisScore) : null} />
        </div>

        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Qualité & communication</h2>
          <ScoreBar label="Qualité du travail" score={ev.qualityScore ? Number(ev.qualityScore) : null} />
          <ScoreBar label="Communication" score={ev.communicationScore ? Number(ev.communicationScore) : null} />
          <ScoreBar label="Travail en équipe" score={ev.teamworkScore ? Number(ev.teamworkScore) : null} />
          <ScoreBar label="Management / encadrement" score={ev.managementScore ? Number(ev.managementScore) : null} />
          <ScoreBar label="Capacité d'apprentissage" score={ev.learningScore ? Number(ev.learningScore) : null} />
        </div>

        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--admin-fg)' }}>Commentaires</h2>
          {ev.evalueeNeeds && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Besoins de l'évalué</div>
              <p className="text-sm" style={{ color: 'var(--admin-fg)' }}>{ev.evalueeNeeds}</p>
            </div>
          )}
          {ev.nextObjectives && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Objectifs prochaine période</div>
              <p className="text-sm" style={{ color: 'var(--admin-fg)' }}>{ev.nextObjectives}</p>
            </div>
          )}
          {ev.remarks && (
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Remarques</div>
              <p className="text-sm" style={{ color: 'var(--admin-fg)' }}>{ev.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
