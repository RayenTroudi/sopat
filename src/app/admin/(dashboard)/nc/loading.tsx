import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function NcLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-36 rounded" />
      </div>
      <div
        className="flex gap-2 px-3 py-2"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
      >
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-8 w-40 rounded" />
      </div>
      <SkeletonTable rows={8} />
    </div>
  )
}
