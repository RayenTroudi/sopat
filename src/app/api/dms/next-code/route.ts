// src/app/api/dms/next-code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { peekNextCode } from '@/lib/dms/numbering'
import { TYPE_CODES, PROCESS_CODES, type TypeCode, type ProcessCode } from '@/lib/dms/codes'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const type    = req.nextUrl.searchParams.get('type')
  const process = req.nextUrl.searchParams.get('process')

  if (!type || !TYPE_CODES.includes(type as TypeCode)) {
    return NextResponse.json({ error: 'Paramètre type invalide' }, { status: 400 })
  }
  if (!process || !PROCESS_CODES.includes(process as ProcessCode)) {
    return NextResponse.json({ error: 'Paramètre process invalide' }, { status: 400 })
  }

  const code = await peekNextCode(type as TypeCode, process as ProcessCode)
  return NextResponse.json({ code })
}
