import { SkeletonTable } from '@/components/ui/Skeleton'

export default function ProjectsLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 rounded animate-pulse w-36" style={{ background: 'var(--admin-border)' }} />
      <SkeletonTable rows={8} />
    </div>
  )
}
