'use client'

// Aperçu d'une information documentée de LIS-MI-01.
//
// L'écran doit se lire comme un modèle officiel vierge : on voit CE QUE CONTIENT
// le document, pas comment il est stocké. Aucun nom de table, de colonne ou de
// type SQL n'arrive jusqu'ici — `src/lib/dms/structure.ts` ne les expose pas.
//
// Les enregistrements réels ne sont pas déversés dans l'aperçu : ils vivent
// dans le module opérationnel, qu'on atteint par « Ouvrir le module ». La
// maquette montre le modèle ; le module montre ce qui a été rempli.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ACTION_LABELS, type WorkflowAction } from '@/lib/dms/lifecycle-ui'
import {
  STRUCTURE_KIND_LABELS, type DocumentFormSection, type DocumentStructure,
} from '@/lib/dms/document-structures'
import type { DmsDocumentSheet, DmsPerson } from '@/lib/dms/structure'

type Props = {
  sheet: DmsDocumentSheet
  canEdit: boolean
}

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const STATUS_TONE: Record<string, string> = {
  'En vigueur':  'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  'Approuvé':    'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  'Obsolète':    'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
  'Archivé':     'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
}
const statusTone = (s: string) => STATUS_TONE[s] ?? 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]'

// ── Briques ──────────────────────────────────────────────────────────────────

function Card({ title, hint, right, children }: {
  title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <header className="px-5 py-4 border-b flex items-start justify-between gap-4"
        style={{ borderColor: 'var(--admin-border)' }}>
        <div className="min-w-0">
          <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
          {hint && <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--admin-text-muted)' }}>{hint}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  )
}

/**
 * Ligne « libellé → valeur » d'une fiche.
 *
 * `declared` marque un élément que l'ERP enregistre sans l'appliquer. Sans
 * cette mention, la fiche laisserait croire à un contrôle en vigueur.
 */
function Row({ label, value, declared, wide }: {
  label: string; value: React.ReactNode; declared?: boolean; wide?: boolean
}) {
  const empty = value === null || value === undefined || value === '' || value === '—'
  return (
    <div
      className={cn(
        'flex gap-4 px-5 py-2.5 border-b',
        // Le filet vertical ne sert que la colonne de gauche ; à droite il est
        // mangé par `overflow-hidden` de la carte, donc jamais visible au bord.
        'md:border-r',
        wide && 'md:col-span-2 md:border-r-0',
      )}
      style={{ borderColor: 'var(--admin-border)' }}
    >
      <dt className="text-sm w-48 shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
      <dd className="text-sm min-w-0 flex-1" style={{ color: empty ? 'var(--admin-text-muted)' : 'var(--admin-text)' }}>
        {empty ? '—' : value}
        {declared && !empty && (
          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded align-middle"
            style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
            déclaré, non appliqué
          </span>
        )}
      </dd>
    </div>
  )
}

/** Grille des paires « libellé → valeur » : une colonne en mobile, deux au-delà. */
function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="grid md:grid-cols-2">{children}</dl>
}

const personText = (p: DmsPerson | null) => (p ? p.name : '—')

// ── Maquettes ────────────────────────────────────────────────────────────────

/** Tableau vierge : l'ossature commune aux registres et aux rubriques-tableaux. */
function BlankTable({ columns, rows = 3 }: { columns: string[]; rows?: number }) {
  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="mx-auto w-auto text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--admin-bg)' }}>
            <th className="px-3 py-2.5 text-left font-medium border w-12"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>N°</th>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2.5 text-left font-medium border whitespace-nowrap min-w-[12rem]"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => i + 1).map((n) => (
            <tr key={n}>
              <td className="px-3 py-3.5 border text-center"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>{n}</td>
              {columns.map((c) => (
                <td key={c} className="px-4 py-3.5 border" style={{ borderColor: 'var(--admin-border)' }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Registre : un tableau vierge, comme le modèle Excel officiel. */
function RegisterPreview({ columns }: { columns: string[] }) {
  return <BlankTable columns={columns} />
}

/**
 * Formulaire : rubriques présentées comme sur papier. Une rubrique porte des
 * champs à remplir, ou un tableau — un PV de réception aligne une en-tête, un
 * tableau de réserves puis un bloc de signatures, et le forcer en champs le
 * trahirait.
 */
function FormPreview({ sections }: { sections: DocumentFormSection[] }) {
  return (
    <div className="px-4 py-4 space-y-5">
      {sections.map((s) => (
        <div key={s.title}>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--admin-text)' }}>{s.title}</h3>
          {'fields' in s ? (
            // Trois colonnes au-delà de 1280 px : un champ de 500 px de large
            // ne ressemble à rien qu'on remplirait à la main.
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {s.fields.map((f) => (
                <div key={f} className="min-w-0">
                  <span className="text-xs block mb-1" style={{ color: 'var(--admin-text-muted)' }}>{f}</span>
                  <div className="h-9 rounded border"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="-mx-4">
              <BlankTable columns={s.columns} rows={2} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Check-list : la colonne de conformité, le point de contrôle, puis les colonnes
 * propres au document. Quand les points sont imprimés sur le formulaire vierge,
 * ils sont listés tels quels — ils FONT le document, au même titre qu'une
 * colonne de registre.
 */
function ChecklistPreview({ columns, items }: { columns: string[]; items?: string[] }) {
  const rows: (string | null)[] = items?.length ? items : [null, null, null]
  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="mx-auto w-auto text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--admin-bg)' }}>
            <th className="px-3 py-2.5 text-center font-medium border w-12"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>✓</th>
            <th className="px-4 py-2.5 text-left font-medium border min-w-[28rem]"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>Point de contrôle</th>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2.5 text-left font-medium border whitespace-nowrap min-w-[12rem]"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((label, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 border text-center"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>☐</td>
              <td className="px-4 py-2.5 border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                {label ?? <>&nbsp;</>}
              </td>
              {columns.map((c) => (
                <td key={c} className="px-4 py-2.5 border" style={{ borderColor: 'var(--admin-border)' }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Document rédigé : le plan, numéroté comme un sommaire. */
function SectionsPreview({ sections }: { sections: string[] }) {
  return (
    <ol className="px-5 py-5 space-y-2.5 max-w-3xl">
      {sections.map((s, i) => (
        <li key={s} className="flex gap-3 items-baseline">
          <span className="text-sm font-mono w-6 shrink-0 text-right"
            style={{ color: 'var(--admin-text-muted)' }}>{i + 1}.</span>
          <span className="text-base" style={{ color: 'var(--admin-text)' }}>{s}</span>
        </li>
      ))}
    </ol>
  )
}

function StructurePreview({ s }: { s: DocumentStructure }) {
  switch (s.kind) {
    case 'register':  return <RegisterPreview columns={s.columns} />
    case 'checklist': return <ChecklistPreview columns={s.columns} items={s.items} />
    case 'form':      return <FormPreview sections={s.sections} />
    case 'sections':  return <SectionsPreview sections={s.sections} />
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function DocumentStructureClient({ sheet, canEdit }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<WorkflowAction | null>(null)
  const [error, setError] = useState('')

  const { identification: id, control, implementation: impl } = sheet

  // Les transitions viennent du serveur, calculées par le module partagé avec
  // le registre. Elles portent sur la FICHE — maîtrisée pour tout document du
  // registre — et non sur la maquette.
  const actions = sheet.availableActions

  async function transition(action: WorkflowAction) {
    setBusy(action); setError('')
    const res = await fetch(`/api/dms/${sheet.id}/transition`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json() as { error?: string }
    if (res.ok) router.refresh()
    else setError(data.error ?? 'Erreur lors de la transition')
    setBusy(null)
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-7xl">
      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/documents" className="text-sm hover:underline" style={{ color: 'var(--admin-text-muted)' }}>
          ← LIS-MI-01 · Liste des Informations Documentées Internes
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold font-mono" style={{ color: 'var(--admin-text)' }}>
                {id.reference}
              </h1>
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium', statusTone(id.status))}>{id.status}</span>
              {id.version && (
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  Version {id.version}
                </span>
              )}
            </div>
            <p className="text-base mt-1" style={{ color: 'var(--admin-text)' }}>{id.designation}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
              {id.type} · {id.process} · {id.department}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {canEdit && (
              <Link href={`/admin/documents?edit=${sheet.id}`}
                className="text-sm px-3 py-2 rounded-lg border whitespace-nowrap"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-surface)' }}>
                Modifier la fiche
              </Link>
            )}
            {impl.href && (
              <Link href={impl.href}
                className="text-sm px-3 py-2 rounded-lg font-medium text-white whitespace-nowrap"
                style={{ background: 'var(--admin-emerald)' }}>
                Ouvrir le module
              </Link>
            )}
          </div>
        </div>
      </div>

      {sheet.retiredAt && (
        <div className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', color: '#b91c1c' }}>
          <strong>Document retiré du registre</strong> le {fmtDate(sheet.retiredAt)}. Il reste consultable
          au titre de la traçabilité, mais ne figure plus dans LIS-MI-01.
        </div>
      )}

      {/* ── Identification ────────────────────────────────────────────────── */}
      <Card title="Identification du document">
        <Rows>
          <Row label="Référence"   value={<span className="font-mono">{id.reference}</span>} />
          <Row label="Désignation" value={id.designation} />
          <Row label="Type"        value={id.type} />
          <Row label="Nature"      value={id.category} />
          <Row label="Processus"   value={id.process} />
          <Row label="Département" value={id.department} />
          <Row label="Version"     value={id.version} />
          <Row label="Statut"      value={id.status} />
          <Row label="Date d’effet" value={fmtDate(id.effectiveDate)} />
          <Row label="Responsable" value={personText(control.owner)} />
          <Row label="Clauses ISO 9001" value={id.isoClauses.length ? id.isoClauses.join(', ') : null} />
          <Row label="Classement"  value={id.storageType} />
          <Row label="Observations" value={id.observations} wide />
        </Rows>
      </Card>

      {/* ── Structure du document ─────────────────────────────────────────── */}
      {!impl.implemented ? (
        <Card title="Structure du document">
          <div className="px-4 py-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Non implémenté</p>
            <p className="text-sm mt-1.5 leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
              Ce document est maîtrisé au registre, mais aucun écran de l’ERP ne le met encore en œuvre.
              Aucune maquette n’est présentée : en afficher une laisserait croire à une implémentation.
            </p>
            {impl.reason && (
              <p className="text-sm mt-2.5 leading-snug px-3 py-2 rounded"
                style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}>
                <span className="uppercase tracking-wide font-medium">Motif : </span>{impl.reason}
              </p>
            )}
          </div>
        </Card>
      ) : sheet.structure ? (
        <Card
          title="Structure du document"
          hint={
            sheet.structureIsTypicalPlan
              ? 'Plan type appliqué à cette famille de documents — le contenu propre de ce document est maîtrisé hors ERP.'
              : 'Modèle vierge : les rubriques que ce document recueille. Les informations réellement enregistrées se consultent dans le module.'
          }
          right={
            <div className="flex items-center gap-2 shrink-0">
              {sheet.structureIsTypicalPlan && (
                <span className="text-[11px] px-2 py-0.5 rounded font-medium"
                  style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>
                  Plan type
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded"
                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                {STRUCTURE_KIND_LABELS[sheet.structure.kind]}
              </span>
            </div>
          }
        >
          <StructurePreview s={sheet.structure} />
          <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {sheet.recordCount > 0
                ? <>Ce modèle est appliqué par <strong style={{ color: 'var(--admin-text)' }}>{sheet.recordCount}</strong> enregistrement{sheet.recordCount > 1 ? 's' : ''} — consultables dans le module.</>
                : <>Aperçu du modèle vierge. Les enregistrements se consultent dans le module.</>}
            </p>
            {impl.href && (
              <Link href={impl.href} className="text-xs underline whitespace-nowrap"
                style={{ color: 'var(--admin-emerald)' }}>
                {impl.destination} →
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <Card title="Structure du document">
          <div className="px-4 py-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Structure non décrite</p>
            <p className="text-sm mt-1.5 leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
              Le module existe — {impl.destination}
              {impl.within && <>, à l’intérieur de {impl.within}</>} — mais la maquette de ce document
              n’a pas encore été relevée. Rien n’est présenté ici, plutôt qu’une maquette approximative.
            </p>
          </div>
        </Card>
      )}

      {/* ── Contrôle du document ──────────────────────────────────────────── */}
      <Card title="Contrôle du document" hint="Maîtrise de l’information documentée. Les éléments marqués « déclaré, non appliqué » sont enregistrés au registre mais ne conditionnent aucun contrôle dans l’ERP.">
        <Rows>
          <Row label="Version en vigueur" value={control.version} declared={!control.enforcement.version} />
          <Row label="Date d’effet"       value={fmtDate(control.effectiveDate)} declared={!control.enforcement.effectiveDate} />
          <Row label="Prochaine revue"    value={fmtDate(control.nextReviewDate)} />
          <Row label="Propriétaire"       value={personText(control.owner)} />
          <Row label="Rédacteur"          value={personText(control.author)} />
          <Row label="Responsable de département" value={personText(control.departmentManager)} />
          <Row
            label="Approbation"
            value={control.approval?.at
              ? `${control.approval.by ?? 'Approuvé'} — ${fmtDate(control.approval.at)}`
              : null}
          />
          <Row label="Confidentialité"    value={id.confidentiality} declared={!control.enforcement.confidentiality} />
          <Row label="Géré par mot de passe" value={id.managedByPassword ? 'Oui' : 'Non'} declared={!control.enforcement.passwordManaged} />
          <Row label="Durée de conservation" value={`${control.retentionYears} ans`} declared={!control.enforcement.retention} />
          <Row label="Consultation"       value={control.access.read} />
          <Row label="Modification"       value={control.access.write} />
          <Row label="Dernière mise à jour" value={fmtDate(control.lastUpdatedAt)} />
        </Rows>
      </Card>

      {/* ── Cycle de vie ──────────────────────────────────────────────────── */}
      {actions.length > 0 && (
        <Card title="Cycle de vie" hint="Actions de maîtrise ouvertes à votre rôle. Chaque action est revalidée par le serveur.">
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <button key={a} disabled={busy !== null} onClick={() => void transition(a)}
                className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-bg)' }}>
                {busy === a ? '…' : ACTION_LABELS[a]}
              </button>
            ))}
          </div>
          {error && <p className="px-4 pb-3 text-sm" style={{ color: '#dc2626' }}>{error}</p>}
        </Card>
      )}

      {/* ── Révisions ─────────────────────────────────────────────────────── */}
      <Card title="Historique des révisions" hint="Versions successives du document et leur approbation.">
        {sheet.revisions.length === 0 ? (
          <p className="px-4 py-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune révision n’a encore été enregistrée dans l’ERP. Les modifications antérieures
            figurent, le cas échéant, dans les observations du registre.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Version', 'Statut', 'Objet de la révision', 'Rédacteur', 'Approuvée par', 'Date'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap"
                      style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.revisions.map((r) => (
                  <tr key={`${r.version}-${r.revision}`} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--admin-text)' }}>
                      {r.version}{r.isCurrent && <span className="ml-1.5 text-[11px]" style={{ color: 'var(--admin-emerald)' }}>en vigueur</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>{r.status}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--admin-text)' }}>{r.summary}</td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>{r.author ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>{r.approvedBy ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>{fmtDate(r.approvedAt ?? r.effectiveDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Documents liés ────────────────────────────────────────────────── */}
      {sheet.relatedDocuments.length > 0 && (
        <Card title="Documents liés">
          <ul className="px-4 py-3 space-y-1.5 text-sm">
            {sheet.relatedDocuments.map((r) => (
              <li key={r.id}>
                <span style={{ color: 'var(--admin-text-muted)' }}>{r.relation} : </span>
                <Link href={`/admin/documents/${r.id}`} className="font-mono hover:underline" style={{ color: 'var(--admin-text)' }}>
                  {r.reference}
                </Link>
                <span style={{ color: 'var(--admin-text-muted)' }}> — {r.title}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Traçabilité ───────────────────────────────────────────────────── */}
      <Card title="Traçabilité" hint="Évènements enregistrés sur ce document (ISO 9001:2015 §7.5.3).">
        {sheet.history.length === 0 ? (
          <p className="px-4 py-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun évènement enregistré.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {sheet.history.map((h, i) => (
              <li key={i} className="px-4 py-2 text-sm">
                {/* L'évènement et son auteur se lisent ensemble : les écarter
                    aux deux bords de la carte obligeait l'œil à traverser un
                    vide de plusieurs centaines de pixels. */}
                <span className="flex items-baseline justify-between gap-8 max-w-3xl">
                  <span style={{ color: 'var(--admin-text)' }}>{h.event}</span>
                  <span className="shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
                    {h.actor ? `${h.actor} · ` : ''}{fmtDate(h.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
