import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getStakeholderById } from '@/lib/db/stakeholders'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function StakeholderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')

  const data = await getStakeholderById(id)
  if (!data) notFound()

  const { sh, feedback } = data

  const channelLabels: Record<string, string> = {
    enquete_satisfaction: 'Enquête satisfaction',
    reunion: 'Réunion',
    email: 'Email',
    reclamation: 'Réclamation',
    audit: 'Audit',
    autre: 'Autre',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/stakeholders" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Retour
        </Link>
        <span className="font-mono text-sm text-gray-500">{sh.reference}</span>
        {sh.isPip && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
            PIP
          </span>
        )}
      </div>

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">{sh.name}</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {sh.type.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {sh.needs && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Besoins &amp; Attentes</p>
              <p className="text-sm text-gray-700">{sh.needs}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Influence</p>
            <p className="text-2xl font-bold text-gray-900">{sh.influence}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Interaction</p>
            <p className="text-2xl font-bold text-gray-900">{sh.interaction}</p>
          </div>

          {(sh.contactName || sh.contactEmail || sh.contactPhone) && (
            <div className="col-span-2 border-t pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Contact</p>
              <div className="text-sm space-y-1">
                {sh.contactName && <p>{sh.contactName}</p>}
                {sh.contactEmail && <p className="text-blue-600">{sh.contactEmail}</p>}
                {sh.contactPhone && <p>{sh.contactPhone}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback history */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Historique des échanges ({feedback.length})</h2>
        </div>
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun échange enregistré.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      {channelLabels[f.channel] ?? f.channel}
                    </span>
                    <span className="text-xs text-gray-500">{f.date}</span>
                    {f.satisfactionScore && (
                      <span className="text-xs text-gray-500">Score: {f.satisfactionScore}/5</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{f.summary}</p>
                  {f.responseActions && (
                    <p className="text-xs text-gray-500 mt-1">Actions: {f.responseActions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
