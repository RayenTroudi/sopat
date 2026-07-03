import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { substitutes, users } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { RefreshCw, Plus, Pencil } from 'lucide-react'

export default async function SubstitutesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const rows = await db
    .select({
      id: substitutes.id,
      positionLabel: substitutes.positionLabel,
      holderUserId: substitutes.holderUserId,
      substituteUserId: substitutes.substituteUserId,
      updatedDate: substitutes.updatedDate,
      isActive: substitutes.isActive,
    })
    .from(substitutes)
    .where(eq(substitutes.isActive, true))
    .orderBy(asc(substitutes.positionLabel))

  // fetch user names
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users)
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <RefreshCw size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Liste des suppléants</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>LIS-RH-01 — {rows.length} poste(s)</p>
          </div>
        </div>
        <Link href="/admin/rh/substitutes/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
          <Plus size={16} /> Ajouter
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Poste', 'Titulaire', 'Suppléant', 'Mis à jour', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                Aucun suppléant défini
              </td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{r.positionLabel}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-fg)' }}>
                  {r.holderUserId ? userMap[r.holderUserId] ?? '—' : '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--green)', fontWeight: 500 }}>
                  {r.substituteUserId ? userMap[r.substituteUserId] ?? '—' : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {r.updatedDate ? new Date(r.updatedDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/substitutes/${r.id}/edit`}
                    className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
                    <Pencil size={12} /> Modifier
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
