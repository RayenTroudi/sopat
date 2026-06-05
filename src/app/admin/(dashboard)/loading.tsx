import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="h-8 rounded animate-pulse w-48" style={{ background: 'var(--admin-border)' }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable rows={4} />
    </div>
  )
}
