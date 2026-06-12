export type Transform = { w?: number; h?: number; q?: 'auto' | number; f?: 'jpg' | 'png' | 'webp' }

export function transformUrl(secureUrl: string, t: Transform): string {
  const marker = '/image/upload/'
  const i = secureUrl.indexOf(marker)
  if (i < 0) return secureUrl
  const parts: string[] = []
  if (t.w) parts.push(`w_${t.w}`)
  if (t.h) parts.push(`h_${t.h}`)
  if (t.q !== undefined) parts.push(`q_${t.q}`)
  if (t.f) parts.push(`f_${t.f}`)
  if (parts.length === 0) return secureUrl
  return secureUrl.slice(0, i + marker.length) + parts.join(',') + '/' + secureUrl.slice(i + marker.length)
}

export const PORTFOLIO_IMG = { w: 1200, q: 'auto' as const, f: 'jpg' as const }
export const PORTFOLIO_THUMB = { w: 400, q: 'auto' as const, f: 'jpg' as const }
