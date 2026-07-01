import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { isNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auditeurs Internes | SOPAT Admin' }

export default async function AuditorsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const allUsers = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(users.name)

  const auditors = allUsers.filter((u) => u.isInternalAuditor)
  const nonAuditors = allUsers.filter((u) => !u.isInternalAuditor && u.isActive)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditeurs Internes</h1>
        <p className="text-sm text-gray-500 mt-1">LIS-MI-05 — Liste des auditeurs internes qualifiés</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Auditeurs qualifiés</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{auditors.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Personnel total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{allUsers.length}</p>
        </div>
      </div>

      {/* Qualified auditors */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-green-50">
          <h2 className="font-medium text-green-800">Auditeurs qualifiés ({auditors.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Domaine d'audit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date qualification</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Preuve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auditors.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.role}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.auditorDomain ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.auditorQualifiedDate ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.auditorQualificationProof ?? '—'}</td>
              </tr>
            ))}
            {auditors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun auditeur qualifié. Modifiez le profil d'un utilisateur pour l'activer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Other staff */}
      {nonAuditors.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-medium text-gray-700">Autres membres du personnel ({nonAuditors.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nonAuditors.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.role}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
