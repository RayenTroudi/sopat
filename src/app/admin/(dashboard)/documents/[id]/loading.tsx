import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function DocumentStructureLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <SkeletonTable rows={8} />
      <SkeletonTable rows={4} />
    </div>
  )
}
