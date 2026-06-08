import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  session.destroy()

  const response = NextResponse.json({ success: true })
  response.cookies.delete('sopat_auth')
  return response
}
