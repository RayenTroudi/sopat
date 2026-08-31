'use client'

/**
 * Le montant contractuel d'un chantier — le prix de VENTE, à côté du budget de
 * COÛT, jamais confondu avec lui.
 *
 * Pourquoi cet écran existe
 * -------------------------
 * `projects.approved_budget` est le plafond de coût interne : `project-spend.ts`
 * mesure la consommation contre lui et les alertes 90 % / 100 % se déclenchent
 * sur ce rapport. `contract_amount` est ce que le client paie. Écrire l'un dans
 * l'autre dégonflerait silencieusement tous les pourcentages de consommation de
 * l'application — c'est précisément ce que cet écran rend impossible en
 * affichant les deux chiffres côte à côte, avec des rôles nommés.
 *
 * Le bordereau approuvé ne fait que SUGGÉRER. La valeur suggérée, la valeur
 * confirmée, l'auteur, l'horodatage et la version FOR-CO-02 d'origine sont tous
 * conservés : une confirmation qui s'écarte de l'offre se voit, au lieu d'être
 * simplement absente (ISO 9001:2015 §8.5.2 — identification et traçabilité).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatMoney } from '@/lib/bordereau-calc'
import type { ProjectContractAmount } from '@/lib/db/bordereau'

const muted = { color: 'var(--admin-text-muted)' } as const
const text = { color: 'var(--admin-text)' } as const

function revisionLabel(versionNo: number): string {
  return `Rev ${String(versionNo).padStart(2, '0')}`
}

export function ContractAmountCard({
  projectId,
  data,
  canConfirm,
}: {
  projectId: string
  data: ProjectContractAmount
  /** Direction / administration seulement : fixer le prix contractuel est leur décision. */
  canConfirm: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>(
    data.proposal ? String(data.proposal.suggestedAmount) : '',
  )

  const { proposal } = data
  // Rien à montrer : ni montant confirmé, ni offre gagnée dont il découlerait.
  if (!proposal && data.contractAmount === null) return null

  const differs =
    data.contractAmount !== null &&
    data.contractAmountSuggested !== null &&
    Math.abs(data.contractAmount - data.contractAmountSuggested) > 0.0005

  const pending =
    proposal !== null &&
    (data.contractAmount === null ||
      data.contractAmountSourceVersionId !== proposal.sourceVersionId)

  async function confirm() {
    if (!proposal) return
    const value = Number(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0) {
      setError('Montant invalide')
      return
    }
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/projects/${projectId}/contract-amount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: proposal.offerId,
        suggestedAmount: proposal.suggestedAmount,
        approvedAmount: value,
      }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) setError((body as { error?: string }).error ?? 'Action refusée')
    else router.refresh()
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold" style={text}>Montant contractuel</h2>
        <p className="text-[11px]" style={muted}>
          Prix de vente au client — distinct du budget approuvé, qui reste le plafond de coût interne
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide" style={muted}>Contrat (vente)</p>
          <p className="text-[15px] font-semibold mt-0.5 tabular-nums" style={text}>
            {data.contractAmount !== null
              ? `${formatMoney(data.contractAmount)} ${data.currency}`
              : '—'}
          </p>
          {data.contractAmountConfirmedAt && (
            <p className="text-[11px] mt-0.5" style={muted}>
              Confirmé le {new Date(data.contractAmountConfirmedAt).toLocaleDateString('fr-FR')}
              {data.contractAmountConfirmedByName ? ` par ${data.contractAmountConfirmedByName}` : ''}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide" style={muted}>Budget approuvé (coût)</p>
          <p className="text-[15px] font-semibold mt-0.5 tabular-nums" style={text}>
            {data.approvedBudget !== null
              ? `${formatMoney(data.approvedBudget)} ${data.currency}`
              : '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={muted}>
            Jamais écrit par le bordereau
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide" style={muted}>Base contractuelle</p>
          {data.contractAmountSourceOfferId ? (
            <Link
              href={`/admin/commercial/offers/${data.contractAmountSourceOfferId}`}
              className="text-[13px] font-medium mt-0.5 inline-block hover:underline"
              style={{ color: 'var(--green)' }}
            >
              FOR-CO-02
              {data.contractAmountSourceVersionNo !== null
                ? ` · ${revisionLabel(data.contractAmountSourceVersionNo)}`
                : ''}
            </Link>
          ) : (
            <p className="text-[13px] mt-0.5" style={muted}>—</p>
          )}
          {/*
            La version figée, pas seulement l'offre : l'offre a pu être rouverte
            et révisée depuis, la version, elle, est immuable. C'est la réponse
            à « sur quelle base ce chantier a-t-il été chiffré ? ».
          */}
          {data.contractAmountSourceVersionNo !== null && (
            <p className="text-[11px] mt-0.5" style={muted}>
              Version figée : le contrat ne suit pas les révisions ultérieures
            </p>
          )}
        </div>
      </div>

      {differs && (
        <p className="text-[12px]" style={{ color: 'var(--admin-amber)' }}>
          Le montant confirmé s&apos;écarte de la suggestion du bordereau
          ({formatMoney(data.contractAmountSuggested!)} {data.currency}). Les deux chiffres sont conservés.
        </p>
      )}

      {error && (
        <div
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
        >
          {error}
        </div>
      )}

      {pending && proposal && (
        <div
          className="rounded-lg p-3 space-y-2"
          style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-[12px]" style={text}>
            Le bordereau approuvé de l&apos;offre{' '}
            <Link
              href={`/admin/commercial/offers/${proposal.offerId}`}
              className="font-medium hover:underline"
              style={{ color: 'var(--green)' }}
            >
              {proposal.offerReference}
            </Link>{' '}
            ({revisionLabel(proposal.sourceVersionNo)}) propose{' '}
            <span className="font-semibold tabular-nums">
              {formatMoney(proposal.suggestedAmount)} {data.currency}
            </span>{' '}
            TTC.
          </p>
          {canConfirm ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                aria-label="Montant contractuel à confirmer"
                className="px-3 py-2 rounded-lg border text-sm w-44 tabular-nums"
                style={{
                  borderColor: 'var(--admin-border)',
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-text)',
                }}
              />
              <button
                onClick={confirm}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
                style={{ background: 'var(--green)', color: 'var(--ivory)' }}
              >
                {busy ? 'Enregistrement…' : 'Confirmer le montant contractuel'}
              </button>
              <span className="text-[11px]" style={muted}>
                Le budget approuvé n&apos;est pas touché
              </span>
            </div>
          ) : (
            <p className="text-[11px]" style={muted}>
              Seules la direction et l&apos;administration peuvent confirmer ce montant.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
