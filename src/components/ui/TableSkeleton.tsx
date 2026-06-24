import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/Skeleton'

type Props = { columns: number; rows?: number }

export function TableSkeleton({ columns, rows = 6 }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow style={{ borderColor: 'var(--admin-border)' }}>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i} className="py-2.5">
              <Skeleton className="h-3 w-16" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r} style={{ borderColor: 'var(--admin-border)' }}>
            {Array.from({ length: columns }).map((_, c) => (
              <TableCell key={c} className="py-2.5">
                <Skeleton className="h-3 w-full" style={{ maxWidth: c === 0 ? '64px' : c === 1 ? '160px' : '80px' }} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
