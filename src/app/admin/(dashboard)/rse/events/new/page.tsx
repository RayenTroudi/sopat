import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '../../../../../../../db/index'
import { users, rsePartnerships } from '../../../../../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { EventWizard } from '@/components/rse/EventWizard'

export default async function NewRseEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') redirect('/admin/rse/events')

  const sp = await searchParams
  const step = parseInt(sp.step ?? '1', 10)
  if (isNaN(step) || step < 1 || step > 6) redirect('/admin/rse/events/new?step=1')

  const [teamMembers, partnerships] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(and(eq(users.isActive, true)))
      .orderBy(users.name),
    db
      .select({ id: rsePartnerships.id, partnerName: rsePartnerships.partnerName })
      .from(rsePartnerships)
      .where(eq(rsePartnerships.status, 'actif'))
      .orderBy(rsePartnerships.partnerName),
  ])

  return (
    <EventWizard
      step={step}
      teamMembers={teamMembers}
      partnerships={partnerships}
      currentUserId={session.user.userId}
    />
  )
}
