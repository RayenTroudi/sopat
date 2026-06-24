import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function SuppliersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-32 rounded" />
      </div>
      <SkeletonTable rows={8} />
    </div>
  )
}
