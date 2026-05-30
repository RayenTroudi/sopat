import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOST = 'www.sopat.tn'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  // Only proxy images from the allowed WordPress host
  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const res = await fetch(url, {
    headers: {
      Referer: 'https://www.sopat.tn/',
      'User-Agent': 'Mozilla/5.0 (compatible; SOPAT-Next/1.0)',
    },
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    return new NextResponse('Upstream error', { status: res.status })
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
