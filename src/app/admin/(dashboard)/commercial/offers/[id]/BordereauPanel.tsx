'use client'

/**
 * FOR-CO-02 « Bordereau des prix » — the document, as the ERP holds it.
 *
 * Sections, categories and priced lines, with every subtotal, the general
 * total, the VAT, the TTC and the « RECAPITULATIF GENERAL » computed by
 * `bordereau-calc` from the tree. Nothing shown here is a stored duplicate of
 * a figure printed above it, so the recap can never disagree with the body.
 *
 * ── Excel est la source, l'ERP est le système d'exploitation ────────────────
 *
 * Le classeur sert à importer et à exporter ; le travail courant se fait ici.
 * Chaque ligne s'ouvre en place — désignation, spécification, norme, unité,
 * quantité, prix unitaire, code — et se déplace d'une catégorie à l'autre sans
 * repasser par Excel. Les modifications partent une par une vers
 * `/bordereau/lines`, qui conserve l'identifiant de la ligne et journalise
 * l'avant et l'après ; le PUT « document entier » reste réservé à l'import,
 * parce qu'il régénère tous les identifiants.
 *
 * Trois états, trois comportements :
 *
 *   brouillon → modifiable
 *   en revue  → gelé, le temps que la revue tranche
 *   approuvé  → immuable ; la réouverture est un acte tracé et motivé
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileDown, Lock, Pencil, RotateCcw, X } from 'lucide-react'
import { BordereauImportPanel } from '@/components/commercial/BordereauImportPanel'
import {
  BordereauTemplatePanel,
  type TemplateSummary,
} from '@/components/commercial/BordereauTemplatePanel'
import { RevisionHistory, revisionLabel } from '@/components/commercial/RevisionHistory'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatMoney, formatQuantity, formatVatRate } from '@/lib/bordereau-calc'
import type { BordereauLineRow, BordereauRow } from '@/lib/db/bordereau'

const inputClass =
  'w-full px-2 py-1.5 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
} as const

const cellMuted = { color: 'var(--admin-text-muted)' } as const
const cellText = { color: 'var(--admin-text)' } as const

/** Le nœud synthétique qu'`asSections` fabrique autour d'un bordereau plat. */
const SYNTHETIC_ROOT = '__legacy__'

/** Depth-first list of the nodes a new line may be attached to. */
function parentOptions(sections: BordereauLineRow[]) {
  const out: { id: string; label: string }[] = []
  const walk = (node: BordereauLineRow, depth: number) => {
    if (node.lineType === 'section' || node.lineType === 'category') {
      const code = node.displayCode ?? node.sourceCode
      out.push({
        id: node.id,
        label: `${'— '.repeat(depth)}${code ? `${code} ` : ''}${node.designation}`,
      })
      node.children.forEach((c) => walk(c, depth + 1))
    }
  }
  sections.forEach((s) => walk(s, 0))
  return out
}

/**
 * La colonne sur laquelle on a double-cliqué, pour ouvrir la ligne AVEC le bon
 * champ déjà actif. Double-cliquer un prix pour devoir ensuite viser le champ
 * prix à la souris ne ferait gagner qu'un clic sur deux.
 */
type EditField =
  | 'sourceCode'
  | 'designation'
  | 'description'
  | 'norme'
  | 'unit'
  | 'quantity'
  | 'unitPrice'

/** Ce qu'un formulaire d'édition tient : des chaînes, converties à l'envoi. */
type LineDraft = {
  sourceCode: string
  designation: string
  description: string
  norme: string
  unit: string
  quantity: string
  unitPrice: string
  parentId: string
}

function draftFrom(node: BordereauLineRow): LineDraft {
  return {
    sourceCode: node.sourceCode ?? '',
    designation: node.designation,
    description: node.description ?? '',
    norme: node.norme ?? '',
    unit: node.unit ?? '',
    quantity: node.quantity !== null ? String(node.quantity) : '',
    unitPrice: node.unitPrice !== null ? String(node.unitPrice) : '',
    parentId: node.parentId ?? '',
  }
}

/**
 * Message d'échec quand le serveur n'a PAS renvoyé de motif exploitable.
 *
 * Pourquoi ce détour plutôt qu'un « Action refusée » sec : toutes les réponses
 * d'erreur de l'API portent un champ `error` en français. S'il manque, c'est
 * que la réponse n'est pas celle de l'API — page d'erreur HTML de Next, route
 * absente, serveur tombé. Afficher le même texte dans les deux cas fait
 * chercher un refus métier là où il s'agit d'un problème d'exécution.
 *
 * Le cas 404 est nommé explicitement parce qu'il a une cause dominante et une
 * solution immédiate : un serveur de développement qui tourne depuis avant
 * l'ajout d'une route sert une page 404 en HTML pour cette route, et un
 * redémarrage suffit.
 */
function describeFailure(status: number, body: string): string {
  const looksLikeHtml = body.trimStart().startsWith('<')
  if (status === 404 && looksLikeHtml) {
    return (
      "Route introuvable (404) : le serveur a répondu une page HTML, pas l'API. " +
      'Si un serveur de développement tourne depuis avant la dernière ' +
      'modification, redémarrez-le.'
    )
  }
  if (status >= 500) return `Erreur serveur (${status}). Consultez les journaux du serveur.`
  if (looksLikeHtml) return `Réponse inattendue du serveur (${status}).`
  return `Action refusée (${status}).`
}

/**
 * Champ numérique saisi : vide → `null` (« pas encore chiffré »), sinon un
 * nombre. Rendre 0 sur une saisie vide mettrait sur le document un prix que
 * personne n'a écrit — c'est la distinction que tout le module tient.
 */
function numberOrNull(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export default function BordereauPanel({
  document,
  canEdit,
  canApprove,
  template,
}: {
  document: BordereauRow
  canEdit: boolean
  canApprove: boolean
  /**
   * Le modèle vierge officiel, ou `null` s'il n'a jamais été chargé. Sans lui,
   * « Partir du modèle vierge » n'a rien à cloner : le bouton est désactivé et
   * le panneau ci-dessous dit comment y remédier.
   */
  template: TemplateSummary | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [freezeOpen, setFreezeOpen] = useState(false)
  const [freezeSummary, setFreezeSummary] = useState('')
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<LineDraft | null>(null)
  const [focusField, setFocusField] = useState<EditField>('designation')

  /**
   * Donne le focus au champ visé à l'ouverture d'une ligne, et SÉLECTIONNE sa
   * valeur.
   *
   * La sélection est le point important. Double-cliquer « 450 » puis taper
   * « 480 » doit donner 480, pas 450480 : le geste veut dire « remplace cette
   * valeur », comme dans un tableur. Un simple `autoFocus` posait le curseur
   * sans sélectionner et produisait, sans rien signaler, un prix concaténé.
   *
   * Les dépendances sont la ligne ouverte et le champ visé, jamais le brouillon :
   * refocaliser à chaque frappe resélectionnerait ce qui vient d'être tapé.
   * Une seule ligne est éditable à la fois, donc l'identifiant est unique dans
   * le document.
   */
  useEffect(() => {
    if (!editingId) return
    const el = window.document.getElementById(`bordereau-edit-${focusField}`)
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus()
      el.select()
    }
  }, [editingId, focusField])

  const { offer, sections, totals, milestones, milestoneSummary, versions, locked } = document
  const underReview = versions.some((v) => v.status === 'submitted')
  // Un document en revue est gelé : l'objet revu ne doit pas changer sous les
  // yeux du relecteur. Le serveur le refuse aussi ; l'interface le dit avant.
  const editable = canEdit && !locked && !underReview
  const approvedRevision = versions.find((v) => v.status === 'approved') ?? null
  const nextRevisionNo = versions.reduce((max, v) => Math.max(max, v.versionNo), 0) + 1
  const modalOpen = reopenOpen || freezeOpen || rejectFor !== null
  const parents = parentOptions(sections)
  const attachable = parents.filter((p) => p.id !== SYNTHETIC_ROOT)

  /**
   * Appel unique vers l'API du bordereau.
   *
   * Le corps est lu en TEXTE d'abord, puis analysé : une réponse non-JSON — la
   * page d'erreur HTML de Next, typiquement — doit pouvoir être reconnue comme
   * telle et non se réduire à un refus sans explication.
   */
  async function call(path: string, init: RequestInit): Promise<boolean> {
    setLoading(true)
    setError(null)

    let res: Response
    try {
      res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
    } catch {
      setLoading(false)
      setError('Serveur injoignable. Vérifiez votre connexion, puis réessayez.')
      return false
    }

    const body = await res.text().catch(() => '')
    let data: { error?: string } = {}
    try { data = body ? (JSON.parse(body) as { error?: string }) : {} } catch { /* pas du JSON */ }

    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? describeFailure(res.status, body))
      return false
    }
    router.refresh()
    return true
  }

  const linesUrl = `/api/commercial/offers/${offer.id}/bordereau/lines`

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const lineType = fd.get('lineType') as 'section' | 'category' | 'item' | 'spec'
    const priceable = lineType === 'item' || lineType === 'spec'

    const quantity = numberOrNull(String(fd.get('quantity') ?? ''))
    const unitPrice = numberOrNull(String(fd.get('unitPrice') ?? ''))
    if (quantity === undefined || unitPrice === undefined) {
      setError('Quantité ou prix unitaire invalide')
      return
    }

    const ok = await call(linesUrl, {
      method: 'POST',
      body: JSON.stringify({
        parentId: (fd.get('parentId') as string) || null,
        lineType,
        sourceCode: (fd.get('sourceCode') as string) || null,
        designation: fd.get('designation') as string,
        unit: priceable ? (fd.get('unit') as string) || null : null,
        quantity: priceable ? quantity : null,
        unitPrice: priceable ? unitPrice : null,
      }),
    })
    if (ok) form.reset()
  }

  async function handleDelete(lineId: string) {
    await call(`${linesUrl}?lineId=${lineId}`, { method: 'DELETE' })
  }

  /**
   * Ouvre une ligne en édition.
   *
   * `field` est la colonne à activer. Une section ou une catégorie ne porte ni
   * unité, ni quantité, ni prix : double-cliquer une de ces colonnes sur un
   * en-tête ouvre donc la ligne sur sa désignation plutôt que sur un champ qui
   * n'existe pas — ouvrir sans rien focaliser laisserait l'utilisateur devant
   * un formulaire sans point d'entrée.
   */
  function startEdit(node: BordereauLineRow, field: EditField = 'designation') {
    const priceableNode = node.lineType === 'item' || node.lineType === 'spec'
    const unavailable =
      (!priceableNode && (field === 'unit' || field === 'quantity' || field === 'unitPrice')) ||
      (node.lineType === 'category' && field === 'norme')
    setError(null)
    setEditingId(node.id)
    setDraft(draftFrom(node))
    setFocusField(unavailable ? 'designation' : field)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
  }

  /**
   * Enregistre la ligne en cours d'édition.
   *
   * Le changement de parent part sur `?op=move` et le reste sur le PATCH de
   * champs : ce sont deux modifications de nature différente, et le journal
   * doit pouvoir dire « déplacée de II.1 vers II.3 » sans le noyer dans une
   * liste de champs inchangés.
   */
  async function saveEdit(node: BordereauLineRow) {
    if (!draft) return
    const priceable = node.lineType === 'item' || node.lineType === 'spec'

    const quantity = numberOrNull(draft.quantity)
    const unitPrice = numberOrNull(draft.unitPrice)
    if (priceable && (quantity === undefined || unitPrice === undefined)) {
      setError('Quantité ou prix unitaire invalide')
      return
    }
    if (draft.designation.trim() === '') {
      setError('La désignation ne peut pas être vide')
      return
    }

    const patch: Record<string, unknown> = {
      designation: draft.designation.trim(),
      description: draft.description.trim(),
      sourceCode: draft.sourceCode.trim(),
    }
    if (node.lineType !== 'category') patch.norme = draft.norme.trim()
    if (priceable) {
      patch.unit = draft.unit.trim()
      patch.quantity = quantity ?? null
      patch.unitPrice = unitPrice ?? null
    }

    const saved = await call(`${linesUrl}?lineId=${node.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (!saved) return

    const nextParent = draft.parentId || null
    if (nextParent !== (node.parentId ?? null)) {
      const moved = await call(`${linesUrl}?lineId=${node.id}&op=move`, {
        method: 'PATCH',
        body: JSON.stringify({ parentId: nextParent }),
      })
      if (!moved) return
    }

    cancelEdit()
  }

  function versionAction(body: Record<string, unknown>) {
    return call(`/api/commercial/offers/${offer.id}/bordereau/versions`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Action de version lancée depuis une fenêtre modale.
   *
   * La fenêtre ne se ferme qu'en cas de succès : un refus du serveur laisse la
   * saisie en place et l'erreur sous le champ, plutôt que de faire retaper un
   * motif que l'utilisateur vient d'écrire.
   */
  async function submitFromModal(body: Record<string, unknown>, onSuccess: () => void) {
    if (await versionAction(body)) onSuccess()
  }

  function submitReopen() {
    const reason = reopenReason.trim()
    if (!reason) return
    return submitFromModal({ action: 'reopen', reason }, () => {
      setReopenOpen(false)
      setReopenReason('')
    })
  }

  function submitFreeze() {
    const changeSummary = freezeSummary.trim()
    if (!changeSummary) return
    return submitFromModal({ action: 'create', changeSummary }, () => {
      setFreezeOpen(false)
      setFreezeSummary('')
    })
  }

  function submitReject() {
    const reason = rejectReason.trim()
    if (!reason || !rejectFor) return
    return submitFromModal({ action: 'reject', versionId: rejectFor, reason }, () => {
      setRejectFor(null)
      setRejectReason('')
    })
  }

  async function useTemplate() {
    await call(`/api/commercial/offers/${offer.id}/bordereau/from-template`, {
      method: 'POST',
      body: JSON.stringify({ confirmReplace: totals.lineCount > 0 }),
    })
  }

  const renderRows = (node: BordereauLineRow, depth: number): React.ReactNode[] => {
    const code = node.sourceCode ?? ''
    const isHeader = node.lineType === 'section' || node.lineType === 'category'
    const priceable = node.lineType === 'item' || node.lineType === 'spec'
    const isSynthetic = node.id === SYNTHETIC_ROOT
    const isEditing = editingId === node.id && draft !== null
    const rows: React.ReactNode[] = []

    if (isEditing && draft) {
      rows.push(
        <tr key={node.id} style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-accent-dim)' }}>
          <td className="px-2 py-2 align-top">
            <input
              value={draft.sourceCode}
              onChange={(e) => setDraft({ ...draft, sourceCode: e.target.value })}
              className={inputClass}
              style={inputStyle}
              aria-label="Numéro"
              id="bordereau-edit-sourceCode"
            />
          </td>
          <td className="px-2 py-2 align-top" style={{ paddingLeft: `${8 + depth * 16}px` }}>
            <input
              value={draft.designation}
              onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
              className={inputClass}
              style={inputStyle}
              aria-label="Désignation"
              id="bordereau-edit-designation"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              placeholder="Spécification (ce que le client signe)"
              className={`${inputClass} mt-1 resize-y text-[12px]`}
              style={inputStyle}
              aria-label="Spécification"
              id="bordereau-edit-description"
            />
            {/* Changer de parent = changer de catégorie : le déplacement est
                une modification à part entière, tracée comme telle. */}
            {!isSynthetic && (
              <select
                value={draft.parentId}
                onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
                className={`${inputClass} mt-1 text-[12px]`}
                style={inputStyle}
                aria-label="Rattachement"
              >
                <option value="">Racine du document</option>
                {attachable
                  .filter((p) => p.id !== node.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
              </select>
            )}
          </td>
          <td className="px-2 py-2 align-top">
            {node.lineType !== 'category' && (
              <input
                value={draft.norme}
                onChange={(e) => setDraft({ ...draft, norme: e.target.value })}
                className={inputClass}
                style={inputStyle}
                aria-label="Norme"
                id="bordereau-edit-norme"
              />
            )}
          </td>
          <td className="px-2 py-2 align-top">
            {priceable && (
              <input
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                className={inputClass}
                style={inputStyle}
                aria-label="Unité"
                id="bordereau-edit-unit"
              />
            )}
          </td>
          <td className="px-2 py-2 align-top">
            {priceable && (
              <input
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                inputMode="decimal"
                placeholder="—"
                className={inputClass}
                style={inputStyle}
                aria-label="Quantité"
                id="bordereau-edit-quantity"
              />
            )}
          </td>
          <td className="px-2 py-2 align-top">
            {priceable && (
              <input
                value={draft.unitPrice}
                onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })}
                inputMode="decimal"
                placeholder="—"
                className={inputClass}
                style={inputStyle}
                aria-label="Prix unitaire"
                id="bordereau-edit-unitPrice"
              />
            )}
          </td>
          <td className="px-2 py-2 text-[12px] align-top" style={cellMuted}>
            {/* Le montant reste calculé par le serveur : afficher ici un
                produit local ferait exister, le temps d'une saisie, un total
                que la base ne connaît pas. */}
            recalculé
          </td>
          <td className="px-2 py-2 align-top whitespace-nowrap">
            <button
              onClick={() => saveEdit(node)}
              disabled={loading}
              className="mr-1 disabled:opacity-30"
              style={{ color: 'var(--green)' }}
              aria-label="Enregistrer"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEdit}
              disabled={loading}
              className="disabled:opacity-30"
              style={{ color: 'var(--admin-text-muted)' }}
              aria-label="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
          </td>
        </tr>,
      )
    } else {
      /*
       * Double-cliquer une cellule ouvre la ligne sur CE champ.
       *
       * C'est le geste attendu dans un tableau chiffré : on vise la valeur à
       * corriger, pas une icône en bout de ligne. Le crayon reste — il est le
       * seul repère visible qu'une ligne est modifiable, il fonctionne au
       * doigt sur tablette, et il est atteignable au clavier ; un double-clic
       * n'a aucun de ces trois mérites.
       *
       * `openable` verrouille le geste exactement là où le crayon l'est déjà :
       * document approuvé, version en revue, droits insuffisants, ou nœud
       * synthétique d'un bordereau plat.
       */
      const openable = editable && !isSynthetic
      const openOn = (field: EditField) =>
        openable && !loading ? () => startEdit(node, field) : undefined
      // `select-none` : sans cela le double-clic sélectionne le texte de la
      // cellule, et la sélection reste en surbrillance derrière le champ.
      const cellClass = openable ? ' cursor-text select-none' : ''
      const hint = openable ? 'Double-cliquez pour modifier' : undefined

      rows.push(
        <tr
          key={node.id}
          style={{
            borderTop: '1px solid var(--admin-border)',
            background: node.lineType === 'section'
              ? 'var(--admin-accent-dim)'
              : node.lineType === 'category' ? 'var(--admin-bg)' : undefined,
          }}
        >
          <td
            className={`px-3 py-2 text-xs tabular-nums align-top${cellClass}`}
            style={cellMuted}
            onDoubleClick={openOn('sourceCode')}
            title={hint}
          >
            {node.displayCode && node.displayCode !== code ? (
              <span title={`Numérotation du corps du document : ${code}`}>
                {node.displayCode}
                <span className="opacity-50"> ({code})</span>
              </span>
            ) : code}
          </td>
          <td
            className={`px-3 py-2 text-[13px] align-top${cellClass}`}
            style={{ ...cellText, paddingLeft: `${12 + depth * 16}px`, fontWeight: isHeader ? 600 : 400 }}
            onDoubleClick={openOn('designation')}
            title={hint}
          >
            {node.designation}
            {/* La spécification a son propre champ : le double-clic l'ouvre. */}
            {node.description && (
              <p
                className="mt-1 text-[11px] whitespace-pre-wrap"
                style={cellMuted}
                onDoubleClick={openOn('description')}
              >
                {node.description}
              </p>
            )}
          </td>
          <td
            className={`px-3 py-2 text-xs align-top${cellClass}`}
            style={cellMuted}
            onDoubleClick={openOn('norme')}
            title={hint}
          >
            {node.norme ?? ''}
          </td>
          <td
            className={`px-3 py-2 text-xs align-top${cellClass}`}
            style={cellMuted}
            onDoubleClick={openOn('unit')}
            title={hint}
          >
            {node.unit ?? ''}
          </td>
          <td
            className={`px-3 py-2 text-[13px] tabular-nums align-top${cellClass}`}
            style={cellText}
            onDoubleClick={openOn('quantity')}
            title={hint}
          >
            {node.quantity !== null ? formatQuantity(node.quantity) : ''}
          </td>
          <td
            className={`px-3 py-2 text-[13px] tabular-nums align-top${cellClass}`}
            style={cellText}
            onDoubleClick={openOn('unitPrice')}
            title={hint}
          >
            {node.unitPrice !== null ? formatMoney(node.unitPrice) : ''}
          </td>
          {/*
            Le montant n'est pas saisissable : il vaut quantité × prix unitaire,
            recalculé. Le double-clic y ouvre donc le prix unitaire, qui est ce
            que l'on cherche à corriger quand on vise un montant.
          */}
          <td
            className={`px-3 py-2 text-[13px] tabular-nums font-medium align-top${cellClass}`}
            style={cellText}
            onDoubleClick={openOn('unitPrice')}
            title={openable ? 'Montant calculé — double-cliquez pour corriger le prix unitaire' : undefined}
          >
            {isHeader ? formatMoney(node.subtotal) : node.total !== null ? formatMoney(node.total) : '—'}
          </td>
          <td className="px-3 py-2 align-top whitespace-nowrap">
            {editable && !isSynthetic && (
              <>
                <button
                  onClick={() => startEdit(node, 'designation')}
                  disabled={loading}
                  className="mr-2 disabled:opacity-30"
                  style={cellMuted}
                  aria-label={`Modifier ${node.designation}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(node.id)}
                  disabled={loading}
                  className="text-xs disabled:opacity-30"
                  style={{ color: 'var(--admin-red)' }}
                  aria-label={`Supprimer ${node.designation}`}
                >
                  ✕
                </button>
              </>
            )}
          </td>
        </tr>,
      )
    }

    node.children.forEach((child) => rows.push(...renderRows(child, depth + 1)))

    if (node.lineType === 'category') {
      rows.push(
        <tr key={`${node.id}-subtotal`} style={{ background: 'var(--admin-bg)' }}>
          <td />
          <td className="px-3 py-1.5 text-[12px] font-medium" colSpan={5} style={cellMuted}>
            TOTAL PARTIEL HTVA
          </td>
          <td className="px-3 py-1.5 text-[13px] tabular-nums font-semibold" style={cellText}>
            {formatMoney(node.subtotal)}
          </td>
          <td />
        </tr>,
      )
    }
    return rows
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div>
            <h2 className="text-[14px] font-semibold" style={cellText}>
              Bordereau des prix ({offer.documentCode}
              {offer.formRevision !== null ? ` — rév. ${offer.formRevision}` : ''})
            </h2>
            <p className="text-[11px] mt-0.5" style={cellMuted}>
              {totals.sectionCount} section(s) · {totals.categoryCount} catégorie(s) ·{' '}
              {totals.lineCount} ligne(s), dont {totals.pricedCount} chiffrée(s)
              {locked && ' · document approuvé et verrouillé'}
              {!locked && underReview && ' · version en revue, édition suspendue'}
            </p>
            {/* Un double-clic ne se devine pas : il faut le dire une fois. */}
            {editable && (
              <p className="text-[11px] mt-0.5" style={cellMuted}>
                Double-cliquez une cellule pour la modifier.
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold" style={cellText}>
              {formatMoney(totals.totalTtc)} {offer.currency} TTC
            </p>
            <p className="text-[11px]" style={cellMuted}>
              {formatMoney(totals.totalHtva)} HTVA + {formatMoney(totals.totalVat)} TVA{' '}
              ({formatVatRate(offer.vatRate)})
            </p>
          </div>
        </div>

        {/* Une erreur née dans une modale s'affiche sous le champ concerné, pas ici aussi. */}
        {error && !modalOpen && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['N°', 'Désignation des prestations', 'Norme', 'Unité', 'Qté', 'P.U.', 'Montant', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[11px] font-medium" style={cellMuted}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.flatMap((s) => renderRows(s, 0))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm" style={cellMuted}>
                    Aucune ligne — importez un FOR-CO-02, partez du modèle vierge, ou ajoutez les postes ci-dessous.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <form
            onSubmit={handleAdd}
            className="p-4 grid grid-cols-1 sm:grid-cols-[110px_1fr_90px_1fr_70px_80px_100px_auto] gap-2"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            {/* Le type est explicite : une section, une catégorie et un poste
                chiffrable ne sont pas la même chose, et un bordereau se
                structure dans l'ERP comme il se structure sur le formulaire. */}
            <select name="lineType" className={inputClass} style={inputStyle} defaultValue="item" aria-label="Type de ligne">
              <option value="item">Poste</option>
              <option value="spec">Spécification</option>
              <option value="category">Catégorie</option>
              <option value="section">Section</option>
            </select>
            <select name="parentId" className={inputClass} style={inputStyle} defaultValue="" aria-label="Rattachement">
              <option value="">Racine du document</option>
              {attachable.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <input name="sourceCode" placeholder="N°" className={inputClass} style={inputStyle} aria-label="Numéro" />
            <input name="designation" required placeholder="Désignation" className={inputClass} style={inputStyle} />
            <input name="unit" placeholder="Unité" className={inputClass} style={inputStyle} aria-label="Unité" />
            <input name="quantity" inputMode="decimal" placeholder="Qté" className={inputClass} style={inputStyle} aria-label="Quantité" />
            <input name="unitPrice" inputMode="decimal" placeholder="P.U." className={inputClass} style={inputStyle} aria-label="Prix unitaire" />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}
            >
              Ajouter
            </button>
          </form>
        )}
      </div>

      {/* ── RECAPITULATIF GENERAL — generated, never a stored duplicate ── */}
      {totals.sections.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h3 className="text-[13px] font-semibold" style={cellText}>Récapitulatif général</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {totals.sections.map((s) => (
                <tr key={s.sourceCode ?? s.designation} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2 text-xs" style={cellMuted}>{s.sourceCode ?? ''}</td>
                  <td className="px-4 py-2 text-[13px]" style={cellText}>{s.designation}</td>
                  <td className="px-4 py-2 text-[13px] tabular-nums text-right font-medium" style={cellText}>
                    {formatMoney(s.subtotal)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                <td />
                <td className="px-4 py-2 text-[13px] font-semibold" style={cellText}>Total général HTVA</td>
                <td className="px-4 py-2 text-[13px] tabular-nums text-right font-semibold" style={cellText}>
                  {formatMoney(totals.totalHtva)}
                </td>
              </tr>
              <tr style={{ background: 'var(--admin-bg)' }}>
                <td />
                <td className="px-4 py-2 text-[13px]" style={cellMuted}>TVA ({formatVatRate(offer.vatRate)})</td>
                <td className="px-4 py-2 text-[13px] tabular-nums text-right" style={cellText}>
                  {formatMoney(totals.totalVat)}
                </td>
              </tr>
              <tr style={{ background: 'var(--admin-accent-dim)' }}>
                <td />
                <td className="px-4 py-2 text-[13px] font-bold" style={cellText}>Total général T.T.C</td>
                <td className="px-4 py-2 text-[13px] tabular-nums text-right font-bold" style={cellText}>
                  {formatMoney(totals.totalTtc)} {offer.currency}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Payment milestones — planning data only ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h3 className="text-[13px] font-semibold" style={cellText}>Modalités de paiement</h3>
          <span className="text-[11px]" style={milestoneSummary.complete ? cellMuted : { color: 'var(--admin-red)' }}>
            {milestoneSummary.totalPercentage} %
            {!milestoneSummary.complete && ' — le plan ne totalise pas 100 %'}
          </span>
        </div>
        {milestones.length === 0 ? (
          <p className="px-5 py-4 text-[13px]" style={cellMuted}>
            Aucune échéance enregistrée. Ce sont des données de planification : aucune facture ni
            écriture de solde client n&apos;en découle automatiquement.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2 text-[13px] tabular-nums w-20" style={cellText}>{m.percentage} %</td>
                  <td className="px-4 py-2 text-[13px]" style={cellText}>{m.label}</td>
                  <td className="px-4 py-2 text-xs" style={cellMuted}>{m.basis.toUpperCase()}</td>
                  <td className="px-4 py-2 text-[13px] tabular-nums text-right font-medium" style={cellText}>
                    {formatMoney(m.amount)} {offer.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Document control ── */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/commercial/offers/${offer.id}/bordereau/export`}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Exporter en FOR-CO-02
          </a>
          {canEdit && (
            <>
              <BordereauImportPanel
                offerId={offer.id}
                disabled={locked || underReview}
                onImported={() => router.refresh()}
              />
              <button
                onClick={useTemplate}
                disabled={loading || !editable || template === null}
                title={
                  template === null
                    ? "Aucun modèle vierge n'est chargé : chargez d'abord le formulaire officiel."
                    : `Modèle FOR-CO-02 rév. ${template.revision} — ${template.lineCount} ligne(s), sans prix`
                }
                className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-40"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                Partir du modèle vierge
              </button>
              <button
                onClick={() => { setError(null); setFreezeOpen(true) }}
                disabled={loading || !editable}
                className="px-3 py-1.5 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                <Lock className="w-3.5 h-3.5" aria-hidden />
                Figer une version
              </button>
            </>
          )}
          {canApprove && locked && (
            <button
              onClick={() => { setError(null); setReopenOpen(true) }}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden />
              Rouvrir pour révision
            </button>
          )}
        </div>

        {/*
          ── Le modèle vierge ──────────────────────────────────────────────
          Son état, et le moyen de le charger. Il était jusqu'ici invisible :
          l'API existait, aucun écran ne l'appelait, et « Partir du modèle
          vierge » ne pouvait donc que se plaindre d'un catalogue vide.
        */}
        {canEdit && (
          <BordereauTemplatePanel
            template={template}
            canLoad={canApprove}
            onLoaded={() => router.refresh()}
          />
        )}

        {/*
          ── Documents source ──────────────────────────────────────────────
          La provenance du document : quel classeur a produit ces chiffres,
          qui l'a chargé, quand, et où l'original est conservé. Un total dans
          l'ERP dont on ne peut plus produire la source n'est pas une preuve —
          c'est le versant « information documentée d'origine externe » de la
          maîtrise documentaire (ISO 9001:2015 §7.5.3.2).
        */}
        {document.imports.length > 0 && (
          <div className="pt-1">
            <h4 className="text-[12px] font-semibold mb-2" style={cellText}>Documents source</h4>
            <ul className="space-y-1.5">
              {document.imports.map((imp) => (
                <li
                  key={imp.id}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]"
                  style={cellMuted}
                >
                  <FileDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {imp.sourceFileUrl ? (
                    <a
                      href={imp.sourceFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                      style={{ color: 'var(--green)' }}
                    >
                      {imp.fileName}
                    </a>
                  ) : (
                    <span className="font-medium" style={cellText}>{imp.fileName}</span>
                  )}
                  <span>
                    {new Date(imp.importedAt).toLocaleDateString('fr-FR')}
                    {imp.importedByName ? ` · ${imp.importedByName}` : ''} · {imp.lineCount} ligne(s)
                  </span>
                  {/* L'empreinte, tronquée : de quoi vérifier qu'un fichier
                      retrouvé ailleurs est bien celui qui a été importé. */}
                  <code className="text-[10px] opacity-70" title={`SHA-256 : ${imp.fileHash}`}>
                    {imp.fileHash.slice(0, 12)}…
                  </code>
                  {!imp.sourceFileUrl && (
                    <span style={{ color: 'var(--admin-amber)' }}>
                      original non archivé
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Historique de révision — chronologie, pas un tableau de bord ── */}
        <div className="pt-1">
          <h4 className="text-[12px] font-semibold mb-3" style={cellText}>Historique de révision</h4>
          <RevisionHistory
            versions={versions}
            currency={offer.currency}
            canApprove={canApprove && !locked}
            canSubmit={canEdit && !locked}
            busy={loading}
            onApprove={(versionId) => versionAction({ action: 'approve', versionId })}
            onSubmit={(versionId) => versionAction({ action: 'submit', versionId })}
            onReject={(versionId) => { setError(null); setRejectReason(''); setRejectFor(versionId) }}
          />
        </div>
      </div>

      {/*
        Figer une version : le motif est le « changeSummary » de l'enregistrement.
        Il devient la ligne d'historique que quelqu'un lira dans deux ans pour
        comprendre ce que cette révision changeait — un motif vide serait une
        version sans justification.
      */}
      <ConfirmModal
        open={freezeOpen}
        tone="neutral"
        title="Figer la version"
        description={
          <>
            Cette action enregistre un instantané du bordereau. Vous pourrez ensuite le
            soumettre à la revue, qui suspendra les modifications jusqu&apos;à la décision.
          </>
        }
        confirmLabel="Figer l'offre"
        loadingLabel="Verrouillage…"
        confirmIcon={<Lock className="w-3.5 h-3.5" aria-hidden />}
        loading={loading}
        canConfirm={freezeSummary.trim().length > 0}
        onConfirm={submitFreeze}
        onClose={() => { if (!loading) { setFreezeOpen(false); setError(null) } }}
      >
        <div className="space-y-1.5">
          <label htmlFor="freeze-summary" className="block text-[12px] font-medium" style={cellText}>
            Motif de la nouvelle version <span style={{ color: 'var(--admin-red)' }}>*</span>
          </label>
          <textarea
            id="freeze-summary"
            required
            rows={3}
            maxLength={2000}
            value={freezeSummary}
            onChange={(e) => setFreezeSummary(e.target.value)}
            placeholder="Ex. : intégration des quantités révisées après visite de site du 04/03."
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
          <p className="text-[11px]" style={cellMuted}>
            Enregistré comme motif de la {revisionLabel(nextRevisionNo)}. {freezeSummary.trim().length}/2000
          </p>
          {error && freezeOpen && (
            <p className="text-[12px]" style={{ color: 'var(--admin-red)' }}>{error}</p>
          )}
        </div>
      </ConfirmModal>

      {/*
        Refus en revue. Le motif est ce que l'auteur va lire pour corriger, et
        l'information documentée qu'ISO 9001:2015 §8.2.3 demande de conserver
        sur une exigence écartée. La version refusée n'est pas supprimée : elle
        reste la trace de ce qui a été proposé.
      */}
      <ConfirmModal
        open={rejectFor !== null}
        tone="danger"
        title="Refuser cette version"
        description={
          <>
            La version restera dans l&apos;historique, marquée comme refusée. Le bordereau
            redeviendra modifiable et une version corrigée devra être figée puis resoumise.
          </>
        }
        confirmLabel="Refuser la version"
        loadingLabel="Refus…"
        confirmIcon={<X className="w-3.5 h-3.5" aria-hidden />}
        loading={loading}
        canConfirm={rejectReason.trim().length > 0}
        onConfirm={submitReject}
        onClose={() => { if (!loading) { setRejectFor(null); setError(null) } }}
      >
        <div className="space-y-1.5">
          <label htmlFor="reject-reason" className="block text-[12px] font-medium" style={cellText}>
            Motif du refus <span style={{ color: 'var(--admin-red)' }}>*</span>
          </label>
          <textarea
            id="reject-reason"
            required
            rows={3}
            maxLength={2000}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex. : prix unitaire des palmiers non conforme au dernier devis fournisseur."
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
          <p className="text-[11px]" style={cellMuted}>
            Conservé sur la version refusée et dans le journal d&apos;audit. {rejectReason.trim().length}/2000
          </p>
          {error && rejectFor !== null && (
            <p className="text-[12px]" style={{ color: 'var(--admin-red)' }}>{error}</p>
          )}
        </div>
      </ConfirmModal>

      {/*
        Réouverture d'un engagement commercial : le motif est obligatoire.
        ISO 9001:2015 §8.2.3.2 demande de conserver l'information documentée sur
        les modifications apportées aux exigences — le « pourquoi », pas
        seulement le « quoi ».
      */}
      <ConfirmModal
        open={reopenOpen}
        tone="danger"
        title="Rouvrir l'offre pour révision"
        description={
          <>
            Cette action déverrouillera le bordereau (FOR-CO-02) et incrémentera le numéro
            de révision ({approvedRevision ? revisionLabel(approvedRevision.versionNo) : 'Rev 00'} →{' '}
            {revisionLabel(nextRevisionNo)}). L&apos;historique sera conservé.
          </>
        }
        confirmLabel="Confirmer la révision"
        loadingLabel="Réouverture…"
        confirmIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden />}
        loading={loading}
        canConfirm={reopenReason.trim().length > 0}
        onConfirm={submitReopen}
        onClose={() => { if (!loading) { setReopenOpen(false); setError(null) } }}
      >
        <div className="space-y-1.5">
          <label htmlFor="reopen-reason" className="block text-[12px] font-medium" style={cellText}>
            Motif de la révision <span style={{ color: 'var(--admin-red)' }}>*</span>
          </label>
          <textarea
            id="reopen-reason"
            required
            rows={3}
            maxLength={2000}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Ex. : révision du prix unitaire des palmiers à la demande du client, cf. courriel du 12/03."
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
          <p className="text-[11px]" style={cellMuted}>
            Conservé sur la version remplacée et dans le journal d&apos;audit. {reopenReason.trim().length}/2000
          </p>
          {error && reopenOpen && (
            <p className="text-[12px]" style={{ color: 'var(--admin-red)' }}>{error}</p>
          )}
        </div>
      </ConfirmModal>
    </div>
  )
}
