import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getClientById } from '@/lib/db/clients'
import { ClientForm } from '@/components/clients/ClientForm'
import type { ClientFormValues } from '@/components/clients/ClientForm'

export const metadata = { title: 'Modifier client | SOPAT Admin' }

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const canEdit = ['admin', 'direction', 'etudes_chef'].includes(session.user.role)
  if (!canEdit) redirect('/admin/clients')

  const { id } = await params
  const client = await getClientById(id)
  if (!client) notFound()

  const canToggleFeatured = ['admin', 'direction'].includes(session.user.role)

  const initialValues: Partial<ClientFormValues> = {
    companyName: client.companyName,
    displayName: client.displayName,
    clientType: client.clientType as ClientFormValues['clientType'],
    country: client.country,
    city: client.city ?? undefined,
    address: client.address ?? undefined,
    primaryContactName: client.primaryContactName ?? undefined,
    primaryContactTitle: client.primaryContactTitle ?? undefined,
    primaryContactEmail: client.primaryContactEmail ?? undefined,
    primaryContactPhone: client.primaryContactPhone ?? undefined,
    secondaryContactName: client.secondaryContactName ?? undefined,
    secondaryContactEmail: client.secondaryContactEmail ?? undefined,
    isFeatured: client.isFeatured,
    notes: client.notes ?? undefined,
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
        Modifier — {client.displayName}
      </h1>
      <ClientForm
        clientId={id}
        canToggleFeatured={canToggleFeatured}
        initialValues={initialValues}
      />
    </div>
  )
}
