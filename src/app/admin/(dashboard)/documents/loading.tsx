import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function DocumentsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-36 rounded" />
      </div>
      <SkeletonTable rows={8} />
    </div>
  )
}
