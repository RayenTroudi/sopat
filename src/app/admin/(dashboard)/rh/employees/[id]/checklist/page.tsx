import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { personnelFileChecklists, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { FileCheck, CheckCircle, XCircle } from 'lucide-react'

const CHECKLIST_FIELDS: { key: string; label: string }[] = [
  { key: 'hasCin',             label: 'Copie CIN' },
  { key: 'hasBirthCertificate',label: 'Acte de naissance' },
  { key: 'hasPhoto',           label: '2 photos' },
  { key: 'hasBulletinN3',      label: 'Bulletin N°3 (chefs de projet / jardiniers)' },
  { key: 'hasCnss',            label: 'Numéro CNSS' },
  { key: 'hasRib',             label: 'RIB bancaire' },
  { key: 'hasMedicalCertificate', label: 'Certificat médical (si maladie chronique)' },
  { key: 'hasDiplomas',        label: 'Copies de diplômes' },
  { key: 'hasLastPayslip',     label: 'Dernier bulletin de salaire' },
  { key: 'hasDriverLicense',   label: 'Copie permis de conduire (si applicable)' },
  { key: 'hasPreviousAttestation', label: 'Attestation emploi précédent (si applicable)' },
  { key: 'hasSignedContract',  label: 'Contrat de travail signé' },
]

export default async function EmployeeChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const [employee] = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(eq(users.id, id))

  if (!employee) redirect('/admin/rh/employees')

  const [checklist] = await db.select()
    .from(personnelFileChecklists)
    .where(eq(personnelFileChecklists.userId, id))

  const data = checklist as Record<string, unknown> | undefined

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
          <FileCheck size={20} style={{ color: 'var(--ivory)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Check-list dossier de personnel</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-34 — {employee.name}</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Documents requis</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
          {CHECKLIST_FIELDS.map(f => {
            const checked = data ? !!data[f.key] : false
            return (
              <div key={f.key} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm" style={{ color: 'var(--admin-fg)' }}>{f.label}</span>
                {checked
                  ? <CheckCircle size={18} style={{ color: 'var(--green)' }} />
                  : <XCircle size={18} style={{ color: '#ef4444' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {data && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Responsable RH', date: data.rhSignedAt as string | null },
            { label: 'Superviseur', date: data.supervisorSignedAt as string | null },
            { label: 'Employé', date: data.employeeSignedAt as string | null },
          ].map(sig => (
            <div key={sig.label} className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--admin-muted)' }}>{sig.label}</div>
              <div className="h-10 flex items-end justify-center border-b" style={{ borderColor: 'var(--admin-border)' }}>
                {sig.date && <span className="text-xs" style={{ color: 'var(--green)' }}>
                  {new Date(sig.date).toLocaleDateString('fr-FR')}
                </span>}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--admin-muted)' }}>Signature</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
