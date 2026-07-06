import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { attendanceSheets, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, Clock } from 'lucide-react'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

type Entry = { day: number; entryTime: string; exitTime: string; lunchOut: string; lunchIn: string; notes?: string }

export default async function AttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const [sheet] = await db
    .select({
      id: attendanceSheets.id,
      month: attendanceSheets.month,
      year: attendanceSheets.year,
      daysWorked: attendanceSheets.daysWorked,
      salaryAdvance: attendanceSheets.salaryAdvance,
      notes: attendanceSheets.notes,
      entries: attendanceSheets.entries,
      userName: users.name,
      createdAt: attendanceSheets.createdAt,
    })
    .from(attendanceSheets)
    .leftJoin(users, eq(users.id, attendanceSheets.userId))
    .where(eq(attendanceSheets.id, id))

  if (!sheet) redirect('/admin/rh/attendance')

  const entries = (sheet.entries as Entry[]) ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/attendance" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Clock size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Fiche de pointage</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
              {sheet.userName} — {MONTHS[(sheet.month ?? 1) - 1]} {sheet.year}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Jours travaillés', value: sheet.daysWorked ?? '—' },
          { label: 'Avance sur salaire', value: sheet.salaryAdvance ? `${sheet.salaryAdvance} DT` : '—' },
          { label: 'Entrées saisies', value: entries.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Détail journalier</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {['Jour', 'Entrée', 'Sortie déjeuner', 'Retour déjeuner', 'Sortie', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="even:bg-[var(--admin-bg)]/40" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--admin-fg)' }}>{e.day}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--admin-fg)' }}>{e.entryTime ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--admin-muted)' }}>{e.lunchOut ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--admin-muted)' }}>{e.lunchIn ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--admin-fg)' }}>{e.exitTime ?? '—'}</td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-muted)' }}>{e.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sheet.notes && (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-muted)' }}>
          <strong style={{ color: 'var(--admin-fg)' }}>Notes :</strong> {sheet.notes}
        </div>
      )}
    </div>
  )
}
