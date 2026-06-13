import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { listPortfolioExports } from '@/lib/db/portfolio'
import { HistoryTable } from './HistoryTable'

export default async function PortfolioHistoryPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasFullAccess(session.user.role)) redirect('/admin')
  const rows = await listPortfolioExports()
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Historique des exports</h1>
      <HistoryTable
        rows={rows.map((r) => ({
          e: {
            id: r.e.id,
            name: r.e.name,
            exportType: r.e.exportType,
            generatedAt: r.e.generatedAt,
            projectIdsIncluded: r.e.projectIdsIncluded,
            fileSizeBytes: r.e.fileSizeBytes,
            downloadCount: r.e.downloadCount,
          },
          assetUrl: r.assetUrl,
          generatorName: r.generatorName,
        }))}
      />
    </div>
  )
}
