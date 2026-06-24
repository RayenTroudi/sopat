import { Skeleton } from '@/components/ui/Skeleton'

export default function ClientsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-32 rounded" />
      </div>
      <Skeleton className="h-10 w-full rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-4 space-y-3"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
