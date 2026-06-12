import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listDesignTemplates } from '@/lib/db/design-concepts'
import { TemplatesManagerClient } from './TemplatesManagerClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Modèles de concepts | SOPAT Admin' }

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const allowed = ['admin', 'direction', 'etudes_chef']
  if (!allowed.includes(session.user.role)) redirect('/admin/dashboard')

  const templates = await listDesignTemplates()
  return <TemplatesManagerClient initialTemplates={templates} />
}
