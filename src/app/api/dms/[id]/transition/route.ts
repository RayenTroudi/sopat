// src/app/api/dms/[id]/transition/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { transitionDmsDocument, TRANSITIONS } from '@/lib/dms/workflow'

const bodySchema = z.object({
  action:   z.enum(Object.keys(TRANSITIONS) as [string, ...string[]]),
  comments: z.string().max(2000).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const result = await transitionDmsDocument({
    documentId: id,
    action:     parsed.data.action as keyof typeof TRANSITIONS,
    actor:      { userId: session.user.userId, role: session.user.role },
    comments:   parsed.data.comments,
    ipAddress:  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent:  req.headers.get('user-agent') ?? undefined,
  })

  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 409
    return NextResponse.json({ error: result.error }, { status })
  }

  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json({ ok: true, status: result.status })
}
