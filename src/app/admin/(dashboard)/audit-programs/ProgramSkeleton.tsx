import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Squelette de chargement des programmes d'audit.
 *
 * Il reproduit la géométrie réelle de la page — bandeau de couverture, barre de
 * filtres, cartes de programme — pour que l'arrivée des données ne déplace rien.
 * Un seul module, utilisé par `loading.tsx` (chargement de la route) et par le
 * rechargement de la liste quand on change de filtre : deux squelettes distincts
 * dériveraient l'un de l'autre.
 *
 * Les largeurs sont fixes et indexées, jamais aléatoires : un squelette rendu
 * côté serveur puis re-rendu côté client doit être identique.
 */

/** Une carte de programme repliée. */
function ProgramCardSkeleton({ index = 0 }: { index?: number }) {
  const titleWidths = ['w-64', 'w-48', 'w-56']
  const metaWidths: [string, string, string][] = [
    ['w-28', 'w-20', 'w-16'],
    ['w-24', 'w-24', 'w-20'],
    ['w-32', 'w-20', 'w-14'],
  ]
  const [m1, m2, m3] = metaWidths[index % metaWidths.length]

  return (
    <div className="rounded-xl border relative overflow-hidden"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="w-full px-5 py-4 flex items-center gap-4">
        {/* Pastille du processus */}
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className={`h-3.5 ${titleWidths[index % titleWidths.length]}`} />
          <div className="flex items-center gap-3 pt-0.5">
            <Skeleton className={`h-3 ${m1}`} />
            <Skeleton className={`h-3 ${m2}`} />
            <Skeleton className={`h-3 ${m3}`} />
          </div>
        </div>

        <Skeleton className="w-4 h-4 shrink-0 rounded" />
      </div>

      {/* Bouton d'export FOR-MI-14, à sa place réelle */}
      <Skeleton className="absolute top-4 right-12 h-6 w-24 rounded-lg" />
    </div>
  )
}

/** La liste seule — ce qui se recharge quand on change de filtre. */
export function ProgramListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <ProgramCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

/**
 * Les étapes de l'ordre du jour, chargées à l'ouverture d'une carte.
 * Même géométrie que `AgendaItemRow` replié : numéro, libellé, jeton de clause,
 * pastille de conformité, chevron.
 */
export function AgendaSkeleton({ rows = 6 }: { rows?: number }) {
  const stepWidths = ['w-56', 'w-72', 'w-44', 'w-64', 'w-52', 'w-60']
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="w-full flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <Skeleton className={`h-3.5 ${stepWidths[i % stepWidths.length]} max-w-full`} />
            <div className="flex-1" />
            <Skeleton className="h-4 w-16 rounded-lg shrink-0 hidden md:block" />
            <Skeleton className="h-5 w-20 rounded-full shrink-0" />
            <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Le bandeau de couverture annuelle, replié. */
function CoveragePanelSkeleton() {
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="w-full px-4 py-3 flex items-center gap-3">
        <Skeleton className="w-4 h-4 shrink-0 rounded" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3 w-72 max-w-full" />
          <Skeleton className="h-2.5 w-96 max-w-full" />
        </div>
        {/* Les 28 témoins de clause de deuxième niveau */}
        <div className="hidden sm:flex gap-0.5 shrink-0">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="w-1.5 h-5 rounded-sm" />
          ))}
        </div>
        <Skeleton className="w-4 h-4 shrink-0 rounded" />
      </div>
    </div>
  )
}

/** La barre de filtres : années, processus, statut. */
function FiltersSkeleton() {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex flex-wrap gap-2 items-center">
        <Skeleton className="h-3 w-12 mr-1" />
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-12 rounded-lg" />
          ))}
        </div>
        <div className="w-px h-5 mx-1" style={{ background: 'var(--admin-border)' }} />
        <Skeleton className="h-8 w-[130px] rounded-md" />
        <Skeleton className="h-8 w-[120px] rounded-md" />
      </div>
    </div>
  )
}

/** La page entière, telle qu'elle apparaît avant les données. */
export function AuditProgramsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-[42px] w-48 rounded-xl" />
      </div>

      <CoveragePanelSkeleton />
      <FiltersSkeleton />
      <ProgramListSkeleton rows={3} />
    </div>
  )
}
