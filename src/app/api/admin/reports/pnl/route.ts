import { prisma } from '@/lib/db'
import { calcPnl } from '@/lib/pnl'
import { ok, err } from '@/lib/admin-response'

export async function GET() {
  try {
    const projects = await prisma.project.findMany({ select: { id: true } })
    const results = await Promise.all(projects.map((p) => calcPnl(p.id)))
    return ok(results.filter(Boolean))
  } catch {
    return err('Failed to generate P&L report', 500)
  }
}
