import { NextRequest } from 'next/server'
import { calcPnl } from '@/lib/pnl'
import { ok, err } from '@/lib/admin-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await calcPnl(id)
    if (!result) return err('Project not found', 404)
    return ok(result)
  } catch {
    return err('Failed to generate P&L report', 500)
  }
}
