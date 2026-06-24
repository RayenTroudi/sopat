import { cn } from '@/lib/utils'

function Skeleton({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded', className)}
      style={{ background: 'var(--admin-border)', ...style }}
      {...props}
    />
  )
}

function SkeletonCard() {
  return (
    <div
      className="p-4 space-y-3"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 shrink-0" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-2.5 w-36" />
    </div>
  )
}

function SkeletonTable({ rows = 6 }: { rows?: number }) {
  const widths = ['w-16', 'flex-1', 'w-20', 'w-16', 'w-24']
  return (
    <div
      className="overflow-hidden"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-4"
        style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}
      >
        {widths.map((w, i) => (
          <Skeleton key={i} className={cn('h-3', w)} />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-2.5 flex items-center gap-4"
            style={{ borderBottom: i < rows - 1 ? '1px solid var(--admin-border)' : undefined }}
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityFeedSkeleton({ rows = 8 }: { rows?: number }) {
  const textWidths = ['w-48', 'w-56', 'w-40', 'w-52', 'w-44', 'w-60', 'w-36', 'w-50']
  return (
    <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
          <Skeleton className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className={cn('h-3', textWidths[i % textWidths.length])} />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-2.5 w-8 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="overflow-hidden"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
        >
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="p-4">
            <ActivityFeedSkeleton rows={7} />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <SkeletonTable rows={4} />
          <SkeletonTable rows={3} />
        </div>
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable, ActivityFeedSkeleton, DashboardSkeleton }
