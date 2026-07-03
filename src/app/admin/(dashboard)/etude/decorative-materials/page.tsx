import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listDecorativeMaterials } from '@/lib/db/decorative-materials'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Matières Décoratives | SOPAT Admin' }

export default async function DecorativeMaterialsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const materials = await listDecorativeMaterials()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Matières Décoratives
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-ET-03 — Fiches de spécifications techniques ({materials.length} articles)
          </p>
        </div>
        <Link
          href="/admin/etude/decorative-materials/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau matériau
        </Link>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune matière décorative.{' '}
            <Link href="/admin/etude/decorative-materials/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
              Créer la première fiche
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Nom', 'Matière', 'Couleur', 'Calibre', 'Usage', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3">
                    {m.code
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>{m.code}</span>
                      : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{m.name}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{m.mainMaterial ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{m.color ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{m.caliber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {m.usedInterior && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>Intérieur</span>
                      )}
                      {m.usedExterior && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Extérieur</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/etude/decorative-materials/${m.id}`}
                      className="text-[12px] hover:underline" style={{ color: 'var(--admin-accent)' }}>
                      Détails →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
