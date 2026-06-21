import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16 mt-2" />
      <Skeleton className="h-3 w-32 mt-1" />
    </div>
  )
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable }
