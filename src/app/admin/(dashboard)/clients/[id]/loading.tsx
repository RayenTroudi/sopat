import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Squelette de la fiche client.
 *
 * Sans ce fichier, `clients/loading.tsx` s'appliquait aussi à ce segment : on
 * voyait donc apparaître la grille de huit cartes de la LISTE avant que la
 * fiche ne s'affiche, deux mises en page sans rapport l'une avec l'autre.
 *
 * Celui-ci reprend la géométrie réelle de la page — même conteneur, même
 * en-tête, mêmes trois indicateurs, mêmes deux colonnes — pour que le contenu
 * prenne la place du squelette sans déplacer ce qui est déjà à l'écran.
 */

/** Une ligne d'information : intitulé court au-dessus, valeur en dessous. */
function InfoRowSkeleton({ value }: { value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--admin-border)' }}>
      <Skeleton className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className={`h-3 ${value}`} />
      </div>
    </div>
  )
}

function CardSkeleton({ rows }: { rows: string[] }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <Skeleton className="h-2.5 w-20 mb-3" />
      {rows.map((w, i) => (
        <InfoRowSkeleton key={i} value={w} />
      ))}
    </div>
  )
}

export default function ClientDetailLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* En-tête */}
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-7 w-52 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-0.5">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            </div>
          </div>

          {/* Modifier / Supprimer */}
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>

        {/* Indicateurs */}
        <div className="mt-5 pt-4 grid grid-cols-3 gap-4 border-t" style={{ borderColor: 'var(--admin-border)' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex flex-col items-center gap-1.5${i === 1 ? ' border-x' : ''}`}
              style={i === 1 ? { borderColor: 'var(--admin-border)' } : undefined}
            >
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="flex items-center gap-0.5 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        {['w-12', 'w-16', 'w-24', 'w-20'].map((w, i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton className={`h-3.5 ${w}`} />
          </div>
        ))}
      </div>

      {/* Onglet Profil : identité et contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton rows={['w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-40']} />
        <CardSkeleton rows={['w-36', 'w-28', 'w-44', 'w-32', 'w-24', 'w-40']} />
      </div>
    </div>
  )
}
