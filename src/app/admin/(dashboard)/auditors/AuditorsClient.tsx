'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setAuditorStatus } from '@/lib/actions/auditors'

/**
 * LIS-MI-05 — le registre des auditeurs internes qualifiés.
 *
 * La page annonçait « Modifiez le profil d'un utilisateur pour l'activer » sans
 * qu'aucun écran ne le permette : l'action serveur existait mais n'était reliée à
 * rien, si bien que le registre ne pouvait pas être rempli et que le sélecteur
 * d'auditeur du module Programmes d'audit restait vide. C'est ce chaînon.
 */

export type AuditorRow = {
  id: string
  name: string
  email: string
  role: string
  isInternalAuditor: boolean
  auditorDomain: string | null
  auditorQualifiedDate: string | null
  auditorQualificationProof: string | null
}

const CELL = 'px-4 py-3 text-xs'

export function AuditorsClient({ auditors, nonAuditors, canEdit }: {
  auditors: AuditorRow[]
  nonAuditors: AuditorRow[]
  canEdit: boolean
}) {
  const [error, setError] = useState('')

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-emerald-dim)' }}>
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--admin-emerald)' }}>
            Auditeurs qualifiés ({auditors.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Nom', 'Rôle', "Domaine d'audit", 'Date qualification', 'Preuve', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2.5 text-[11px] font-medium"
                    style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditors.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{u.name}</td>
                  <td className={CELL} style={{ color: 'var(--admin-text-muted)' }}>{u.role}</td>
                  <td className={CELL} style={{ color: 'var(--admin-text-muted)' }}>{u.auditorDomain ?? '—'}</td>
                  <td className={CELL} style={{ color: 'var(--admin-text-muted)' }}>{u.auditorQualifiedDate ?? '—'}</td>
                  <td className={CELL} style={{ color: 'var(--admin-text-muted)' }}>{u.auditorQualificationProof ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && <RevokeButton user={u} onError={setError} />}
                  </td>
                </tr>
              ))}
              {auditors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm"
                    style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun auditeur qualifié au registre. Le module Programmes d&apos;audit ne pourra
                    proposer aucun auditeur interne tant que ce registre est vide
                    {canEdit ? ' — qualifiez un membre du personnel ci-dessous.' : '.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {nonAuditors.length > 0 && (
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h2 className="text-[13px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              Autres membres du personnel ({nonAuditors.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {['Nom', 'Rôle', 'Email', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2.5 text-[11px] font-medium"
                      style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nonAuditors.map((u) => (
                  <QualifyRow key={u.id} user={u} canEdit={canEdit} onError={setError} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function RevokeButton({ user, onError }: { user: AuditorRow; onError: (m: string) => void }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button disabled={pending}
      onClick={() => start(async () => {
        const r = await setAuditorStatus(user.id, { isInternalAuditor: false })
        if (!r.success) onError(r.error); else { onError(''); router.refresh() }
      })}
      className="text-[11px] font-medium px-2.5 py-1 rounded-lg border disabled:opacity-60"
      style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
      {pending ? '…' : 'Retirer du registre'}
    </button>
  )
}

function QualifyRow({ user, canEdit, onError }: {
  user: AuditorRow; canEdit: boolean; onError: (m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [domain, setDomain] = useState(user.auditorDomain ?? '')
  const [date, setDate] = useState(user.auditorQualifiedDate ?? new Date().toISOString().slice(0, 10))
  const [proof, setProof] = useState(user.auditorQualificationProof ?? '')
  const [pending, start] = useTransition()
  const router = useRouter()

  return (
    <>
      <tr style={{ borderTop: '1px solid var(--admin-border)' }}>
        <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{user.name}</td>
        <td className={CELL} style={{ color: 'var(--admin-text-muted)' }}>{user.role}</td>
        <td className={CELL} style={{ color: 'var(--admin-text-muted)' }}>{user.email}</td>
        <td className="px-4 py-3 text-right">
          {canEdit && (
            <button onClick={() => setOpen((o) => !o)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border"
              style={{ borderColor: 'var(--admin-emerald)', color: 'var(--admin-emerald)' }}>
              {open ? 'Annuler' : 'Qualifier'}
            </button>
          )}
        </td>
      </tr>
      {open && canEdit && (
        <tr style={{ background: 'var(--admin-bg)' }}>
          <td colSpan={4} className="px-4 py-4">
            <div className="flex flex-wrap gap-3 items-end">
              <Field label="Domaine d'audit" hint="ex. SMQ / Achats / Entretien">
                <input value={domain} onChange={(e) => setDomain(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-xs w-56"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </Field>
              <Field label="Date de qualification">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-xs"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </Field>
              <Field label="Preuve de qualification" hint="attestation, formation, code GED">
                <input value={proof} onChange={(e) => setProof(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-xs w-64"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </Field>
              <button disabled={pending}
                onClick={() => start(async () => {
                  const r = await setAuditorStatus(user.id, {
                    isInternalAuditor: true,
                    auditorDomain: domain,
                    auditorQualifiedDate: date,
                    auditorQualificationProof: proof || undefined,
                  })
                  if (!r.success) onError(r.error)
                  else { onError(''); setOpen(false); router.refresh() }
                })}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1C7A48, #2F6F4F)' }}>
                {pending ? 'Enregistrement…' : 'Inscrire au registre'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>
        {label}{hint && <span className="ml-1 opacity-70">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}
