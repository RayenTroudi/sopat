import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { isNull } from 'drizzle-orm'
import { AuditorsClient, type AuditorRow } from './AuditorsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auditeurs Internes | SOPAT Admin' }

export default async function AuditorsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      isInternalAuditor: users.isInternalAuditor,
      auditorDomain: users.auditorDomain,
      auditorQualifiedDate: users.auditorQualifiedDate,
      auditorQualificationProof: users.auditorQualificationProof,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(users.name)

  const toRow = (u: (typeof allUsers)[number]): AuditorRow => ({
    id: u.id, name: u.name, email: u.email, role: u.role,
    isInternalAuditor: u.isInternalAuditor,
    auditorDomain: u.auditorDomain,
    auditorQualifiedDate: u.auditorQualifiedDate,
    auditorQualificationProof: u.auditorQualificationProof,
  })

  const auditors = allUsers.filter((u) => u.isInternalAuditor).map(toRow)
  const nonAuditors = allUsers.filter((u) => !u.isInternalAuditor && u.isActive).map(toRow)

  // Le registre reste consultable par tout utilisateur connecté, comme
  // auparavant ; seule sa modification appartient à l'équipe qualité.
  const canEdit = ['admin', 'direction'].includes(session.user.role)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold"
          style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Auditeurs Internes
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          LIS-MI-05 — Liste des auditeurs internes qualifiés · ISO 9001:2015 § 9.2.2 c)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Auditeurs qualifiés', value: auditors.length, color: 'var(--admin-emerald)' },
          { label: 'Personnel total', value: allUsers.length, color: 'var(--admin-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <AuditorsClient auditors={auditors} nonAuditors={nonAuditors} canEdit={canEdit} />
    </div>
  )
}
