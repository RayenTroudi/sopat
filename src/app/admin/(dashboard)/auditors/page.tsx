import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { isNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auditeurs Internes | SOPAT Admin' }

export default async function AuditorsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const allUsers = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(users.name)

  const auditors = allUsers.filter((u) => u.isInternalAuditor)
  const nonAuditors = allUsers.filter((u) => !u.isInternalAuditor && u.isActive)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Auditeurs Internes
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          LIS-MI-05 — Liste des auditeurs internes qualifiés
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Auditeurs qualifiés', value: auditors.length, color: 'var(--admin-emerald)' },
          { label: 'Personnel total', value: allUsers.length, color: 'var(--admin-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-emerald-dim)' }}>
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--admin-emerald)' }}>
            Auditeurs qualifiés ({auditors.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Nom', 'Rôle', "Domaine d'audit", 'Date qualification', 'Preuve'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditors.map((u) => (
              <tr key={u.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{u.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.role}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.auditorDomain ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.auditorQualifiedDate ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.auditorQualificationProof ?? '—'}</td>
              </tr>
            ))}
            {auditors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  Aucun auditeur qualifié. Modifiez le profil d'un utilisateur pour l'activer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {nonAuditors.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h2 className="text-[13px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              Autres membres du personnel ({nonAuditors.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Nom', 'Rôle', 'Email'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nonAuditors.map((u) => (
                <tr key={u.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{u.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.role}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
