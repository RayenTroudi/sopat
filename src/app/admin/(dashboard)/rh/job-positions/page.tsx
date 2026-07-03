import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listJobPositions } from '@/lib/db/rh'
import { Briefcase, Plus, ChevronRight } from 'lucide-react'

export default async function JobPositionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const positions = await listJobPositions()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Briefcase size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Fiches de poste</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-08 — {positions.length} poste(s)</p>
          </div>
        </div>
        <Link
          href="/admin/rh/job-positions/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          <Plus size={16} /> Nouveau poste
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Code', 'Intitulé du poste', 'Département', 'Supérieur hiérarchique', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                  Aucune fiche de poste créée
                </td>
              </tr>
            )}
            {positions.map((pos) => (
              <tr key={pos.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)' }}>
                    {pos.code ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{pos.title}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{pos.department ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{pos.hierarchicalSuperior ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/job-positions/${pos.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
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
