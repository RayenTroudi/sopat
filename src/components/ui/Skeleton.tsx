export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'var(--admin-border)', ...style }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <Skeleton style={{ height: 12, width: '40%' }} />
      <Skeleton style={{ height: 32, width: '60%' }} />
      <Skeleton style={{ height: 10, width: '80%' }} />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <Skeleton style={{ height: 16, width: 160 }} />
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <Skeleton style={{ height: 14, flex: 2 }} />
            <Skeleton style={{ height: 14, flex: 3 }} />
            <Skeleton style={{ height: 14, flex: 1 }} />
            <Skeleton style={{ height: 14, width: 60 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
