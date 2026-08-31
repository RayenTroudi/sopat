'use client'

/**
 * Le modèle vierge FOR-CO-02 — son état, et le moyen de le charger.
 *
 * Pourquoi ce composant existe
 * ----------------------------
 * « Partir du modèle vierge » clone un catalogue de structure : les 2 sections,
 * les 17 catégories, les 266 désignations, leurs unités et leurs spécifications
 * — et aucun prix, le catalogue n'ayant pas de colonne de prix. Tant que ce
 * catalogue est vide, le bouton ne peut rien faire.
 *
 * L'API de chargement existait depuis le début, mais AUCUN écran ne l'appelait :
 * le seul chemin pour alimenter le catalogue passait par un appel HTTP à la
 * main. « Partir du modèle vierge » était donc une impasse — un bouton qui
 * renvoyait « aucun modèle chargé » sans offrir nulle part le moyen d'en
 * charger un.
 *
 * Le chargement est réservé à la direction et à l'administration, comme l'API :
 * le modèle est la forme que reprend chaque devis futur, donc le remplacer est
 * un acte de maîtrise documentaire, pas une manipulation courante.
 */

import { useRef, useState } from 'react'
import { FileUp } from 'lucide-react'

export type TemplateSummary = {
  revision: number
  title: string
  sourceFileName: string | null
  sourceFileHash: string
  createdAt: string | Date
  createdByName: string | null
  sectionCount: number
  categoryCount: number
  lineCount: number
}

type TemplateImportResponse = {
  ok: boolean
  errors: { row: number | null; message: string }[]
  warnings: { row: number | null; message: string }[]
  stats: {
    sectionCount: number
    categoryCount: number
    lineCount: number
    specCount: number
    refErrorCount: number
    bannerFormulaCount: number
  }
  header: { documentCode: string | null; formRevision: number | null }
  currentRevision: number | null
  alreadyImported: { importedAt: string; importedByName: string | null } | null
  committed: boolean
  error?: string
}

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLTX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.template'

export function BordereauTemplatePanel({
  template,
  canLoad,
  onLoaded,
}: {
  template: TemplateSummary | null
  /** Direction / administration seulement — même règle que l'API. */
  canLoad: boolean
  onLoaded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<TemplateImportResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const muted = { color: 'var(--admin-text-muted)' } as const
  const text = { color: 'var(--admin-text)' } as const

  function reset() {
    setFile(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function send(mode: 'preview' | 'commit') {
    if (!file) return
    setBusy(true)
    setError(null)
    const body = new FormData()
    body.set('file', file)
    body.set('mode', mode)
    try {
      const res = await fetch('/api/commercial/bordereau-template/import', { method: 'POST', body })
      const raw = await res.text()
      let data: TemplateImportResponse | { error?: string } = {}
      try { data = raw ? JSON.parse(raw) : {} } catch { /* pas du JSON */ }
      if (!res.ok) {
        setPreview('stats' in data ? (data as TemplateImportResponse) : null)
        setError(
          (data as { error?: string }).error ??
          (raw.trimStart().startsWith('<')
            ? `Réponse inattendue du serveur (${res.status}).`
            : `Chargement refusé (${res.status}).`),
        )
      } else {
        const ok = data as TemplateImportResponse
        setPreview(ok)
        if (ok.committed) {
          onLoaded()
          setOpen(false)
          reset()
        }
      }
    } catch {
      setError('Envoi impossible.')
    }
    setBusy(false)
  }

  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium" style={text}>Modèle vierge FOR-CO-02</p>
          {template ? (
            <p className="text-[11px] mt-0.5" style={muted}>
              Révision {template.revision} · {template.sectionCount} section(s) ·{' '}
              {template.categoryCount} catégorie(s) · {template.lineCount} ligne(s) ·
              chargé le {new Date(template.createdAt).toLocaleDateString('fr-FR')}
              {template.createdByName ? ` par ${template.createdByName}` : ''}
            </p>
          ) : (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-amber)' }}>
              Aucun modèle chargé — « Partir du modèle vierge » restera sans effet
              tant que le formulaire officiel n&apos;aura pas été chargé.
            </p>
          )}
        </div>
        {canLoad && !open && (
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            <FileUp className="w-3.5 h-3.5" aria-hidden />
            {template ? 'Charger une nouvelle révision' : 'Charger le modèle officiel'}
          </button>
        )}
        {!canLoad && !template && (
          <span className="text-[11px]" style={muted}>
            Chargement réservé à la direction.
          </span>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px]" style={muted}>
            Le classeur officiel <code>.xltx</code> ou <code>.xlsx</code>. Il ne fournit
            que la STRUCTURE — désignations, unités, spécifications. Aucun prix n&apos;en
            est repris : le catalogue n&apos;a pas de colonne de prix. Rien n&apos;est
            écrit avant votre confirmation.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept={`${XLSX},${XLTX},.xlsx,.xltx`}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(null) }}
            className="block w-full text-[12px]"
            style={text}
            aria-label="Classeur du modèle FOR-CO-02"
          />

          {error && (
            <p className="px-3 py-2 rounded-lg text-[12px]"
               style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
              {error}
            </p>
          )}

          {preview && (
            <div className="rounded-lg px-3 py-2 text-[11px] space-y-1"
                 style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
              <p style={text}>
                {preview.stats.sectionCount} section(s) · {preview.stats.categoryCount} catégorie(s) ·{' '}
                {preview.stats.lineCount} ligne(s) · {preview.stats.specCount} spécification(s)
              </p>
              <p style={muted}>
                Document {preview.header.documentCode ?? '—'}
                {preview.header.formRevision !== null ? ` rév. ${preview.header.formRevision}` : ''} ·{' '}
                {preview.stats.refErrorCount} cellule(s) #REF! et {preview.stats.bannerFormulaCount}{' '}
                formule(s) de bandeau ignorées
              </p>
              {preview.errors.length > 0 && (
                <p style={{ color: 'var(--admin-red)' }}>
                  {preview.errors.length} erreur(s) bloquante(s) : {preview.errors[0].message}
                </p>
              )}
              {preview.warnings.length > 0 && (
                <p style={{ color: 'var(--admin-amber)' }}>
                  {preview.warnings.length} avertissement(s)
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setOpen(false); reset() }}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border text-[12px] disabled:opacity-40"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Fermer
            </button>
            <button
              onClick={() => send('preview')}
              disabled={busy || !file}
              className="px-3 py-1.5 rounded-lg border text-[12px] font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
            >
              {busy ? 'Analyse…' : 'Analyser'}
            </button>
            {/* Le chargement ne s'offre qu'après une analyse sans erreur bloquante. */}
            {preview?.ok && !preview.committed && (
              <button
                onClick={() => send('commit')}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
                style={{ background: 'var(--green)', color: 'var(--ivory)' }}
              >
                Charger ce modèle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
