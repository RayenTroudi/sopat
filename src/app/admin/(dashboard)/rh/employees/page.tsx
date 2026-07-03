import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listEmployeesWithProfiles } from '@/lib/db/rh'
import { Users, Plus, ChevronRight } from 'lucide-react'

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', civp: 'CIVP', stage: 'Stage', interim: 'Intérim', autre: 'Autre',
}

const CONTRACT_COLORS: Record<string, string> = {
  cdi: 'var(--green)', cdd: '#3b82f6', civp: '#8b5cf6', stage: '#f59e0b', interim: '#6b7280', autre: '#6b7280',
}

export default async function EmployeesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const employees = await listEmployeesWithProfiles()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Users size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Registre du personnel</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>LIS-RH-02 — {employees.length} employé(s)</p>
          </div>
        </div>
        <Link
          href="/admin/rh/employees/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          <Plus size={16} /> Nouvel employé
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Matricule', 'Nom', 'Poste', 'Département', 'Contrat', 'Solde congés', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                  Aucun employé enregistré
                </td>
              </tr>
            )}
            {employees.map((emp) => (
              <tr key={emp.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)' }}>
                    {emp.profile?.matricule ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>
                  {emp.name}
                  <div className="text-xs" style={{ color: 'var(--admin-muted)' }}>{emp.email}</div>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-fg)' }}>{emp.profile?.jobTitle ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{emp.role}</td>
                <td className="px-4 py-3">
                  {emp.profile?.contractType ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ background: CONTRACT_COLORS[emp.profile.contractType] ?? 'var(--admin-muted)' }}>
                      {CONTRACT_LABELS[emp.profile.contractType]}
                    </span>
                  ) : <span style={{ color: 'var(--admin-muted)' }}>—</span>}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-fg)' }}>
                  {emp.profile?.leaveBalanceDays != null ? `${emp.profile.leaveBalanceDays}j` : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/employees/${emp.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
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
