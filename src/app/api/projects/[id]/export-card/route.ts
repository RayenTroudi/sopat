import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import type { ExportConfig, SectionToggles } from '@/lib/portfolio/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!hasFullAccess(session.user.role)) return new Response('Forbidden', { status: 403 })
  const { id } = await params

  const sections: SectionToggles = {
    cover: false,
    company: false,
    certifications: false,
    team: false,
    projectTypes: false,
    projects: true,
    realisation: true,
    entretien: false,
    eclairageDecoration: false,
    rse: false,
    clients: false,
    achievements: false,
    contacts: false,
  }
  const config: ExportConfig = {
    name: `Fiche projet — ${new Date().toISOString().slice(0, 10)}`,
    exportType: 'single_project',
    projectIds: [id],
    sections,
    language: 'fr',
  }

  const url = new URL('/api/portfolio/generate', req.url)
  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify(config),
  })
}
