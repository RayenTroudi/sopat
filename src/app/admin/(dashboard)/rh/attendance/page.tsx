import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { attendanceSheets, users } from '@/db/schema'
import { desc, eq, and } from 'drizzle-orm'
import { Clock, Plus, ChevronRight } from 'lucide-react'

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const CURRENT_YEAR = new Date().getFullYear()

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam) : CURRENT_YEAR

  const sheets = await db
    .select({
      id: attendanceSheets.id,
      month: attendanceSheets.month,
      year: attendanceSheets.year,
      daysWorked: attendanceSheets.daysWorked,
      userName: users.name,
      userId: attendanceSheets.userId,
    })
    .from(attendanceSheets)
    .leftJoin(users, eq(users.id, attendanceSheets.userId))
    .where(eq(attendanceSheets.year, year))
    .orderBy(desc(attendanceSheets.month), users.name)

  const years = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Clock size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Fiches de pointage</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-13 — {sheets.length} fiche(s) en {year}</p>
          </div>
        </div>
        <Link href="/admin/rh/attendance/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
          <Plus size={16} /> Nouvelle fiche
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {years.map(y => (
          <Link key={y} href={`/admin/rh/attendance?year=${y}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={year === y
              ? { background: 'var(--green)', color: 'var(--ivory)' }
              : { background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>
            {y}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé', 'Mois', 'Jours travaillés', 'Avance sur salaire', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheets.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                Aucune fiche de pointage pour {year}
              </td></tr>
            )}
            {sheets.map(s => (
              <tr key={s.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{s.userName ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-fg)' }}>{MONTHS[s.month - 1]} {s.year}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ background: 'var(--admin-bg)', color: 'var(--green)', border: '1px solid var(--green)' }}>
                    {s.daysWorked ?? '—'} j
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>—</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/attendance/${s.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
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
