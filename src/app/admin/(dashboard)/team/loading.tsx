import { Skeleton } from '@/components/ui/Skeleton'

export default function TeamLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-36 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
          >
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
