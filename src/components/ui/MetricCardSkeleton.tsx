import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/Skeleton'

export function MetricCardSkeleton() {
  return (
    <Card className="min-h-[140px] p-5">
      <CardContent className="p-0 space-y-2 pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16 mt-2" />
        <Skeleton className="h-3 w-32 mt-1" />
      </CardContent>
    </Card>
  )
}
