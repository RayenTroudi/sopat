import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listPhytosanitaryProducts } from '@/lib/db/phytosanitary'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Produits Phytosanitaires | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const TYPE_LABELS: Record<string, string> = {
  insecticide: 'Insecticides',
  acaricide: 'Acaricides',
  fongicide: 'Fongicides',
  herbicide: 'Herbicides',
  engrais: 'Engrais',
  autre: 'Autres',
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  insecticide: { bg: 'var(--admin-red-dim)', text: 'var(--admin-red)' },
  acaricide:   { bg: 'var(--admin-amber-dim)', text: 'var(--admin-amber)' },
  fongicide:   { bg: 'var(--admin-accent-dim)', text: 'var(--admin-accent)' },
  herbicide:   { bg: 'var(--admin-emerald-dim)', text: 'var(--admin-emerald)' },
  engrais:     { bg: 'var(--admin-bg)', text: 'var(--admin-text-muted)' },
  autre:       { bg: 'var(--admin-bg)', text: 'var(--admin-text-muted)' },
}

export default async function PhytosanitaryPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const typeFilter = sp.type as string ?? ''
  const products = await listPhytosanitaryProducts(typeFilter || undefined)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Produits Phytosanitaires
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-ET-05 — Fiches de spécifications techniques ({products.length} produits)
          </p>
        </div>
        <Link
          href="/admin/etude/phytosanitary/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau produit
        </Link>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <Link href="/admin/etude/phytosanitary"
          className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
          style={!typeFilter
            ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
            : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
          }
        >Tous</Link>
        {Object.entries(TYPE_LABELS).map(([k, label]) => (
          <Link key={k} href={`?type=${k}`}
            className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
            style={typeFilter === k
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >{label}</Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun produit.{' '}
            <Link href="/admin/etude/phytosanitary/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
              Créer la première fiche
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Type', 'Nom commercial', 'Matière active', 'N° Homologation', 'Cible', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const colors = TYPE_COLORS[p.productType] ?? TYPE_COLORS.autre
                return (
                  <tr key={p.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: colors.bg, color: colors.text }}>
                        {TYPE_LABELS[p.productType] ?? p.productType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{p.commercialName}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{p.activeIngredient ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{p.approvalNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{p.targetPests ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/etude/phytosanitary/${p.id}`}
                        className="text-[12px] hover:underline" style={{ color: 'var(--admin-accent)' }}>
                        Détails →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
