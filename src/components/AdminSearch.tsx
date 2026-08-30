'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, CornerDownRight } from 'lucide-react'
import { DMS_SEARCH_ENTITY_LABELS, type DmsSearchResult } from '@/lib/dms/search'

// Recherche globale par code ISO / référence — tape n'importe quel fragment de
// code (ex. "MI-05", "mi05", "evt 2025"), la ponctuation et la casse sont
// ignorées, et redirige vers l'entité (projet, client, NC, etc.) au clic.
// À défaut de code correspondant, les libellés des entités sont aussi inspectés.
//
// Un résultat peut ne PAS être navigable : c'est le cas d'un document maîtrisé
// qu'aucune page opérationnelle ne met en œuvre. La ligne annonce alors « Page
// opérationnelle non configurée » et reste inerte, plutôt que de renvoyer vers
// le registre LIS-MI-01 comme si celui-ci traitait le document.
//
// Un résultat peut aussi être navigable sans mener droit au document : le
// bordereau FOR-CO-02 vit dans une offre, les check-lists de réalisation dans
// l'onglet d'un projet. `within` porte ce contenant et la ligne l'affiche sous
// la destination — « ↳ dans FOR-CO-01 (Offre) » — pour que le clic tienne ce
// qu'il annonce : le registre d'où l'on ouvre le contenant.

export function AdminSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DmsSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback((q: string) => {
    abortRef.current?.abort()
    if (q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DmsSearchResult[]) => {
        setResults(Array.isArray(data) ? data : [])
        setActiveIndex(-1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(v: string) {
    setQuery(v)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(v), 250)
  }

  function selectResult(r: DmsSearchResult) {
    if (!r.href) return
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(r.href)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = results[activeIndex] ?? results[0]
      if (chosen?.href) selectResult(chosen)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative hidden lg:flex items-center" style={{ maxWidth: '320px', width: '100%' }}>
      {loading ? (
        <Loader2
          className="absolute left-3 pointer-events-none animate-spin"
          style={{ width: '14px', height: '14px', color: 'rgba(0,0,0,0.4)' }}
        />
      ) : (
        <Search
          className="absolute left-3 pointer-events-none"
          style={{ width: '14px', height: '14px', color: 'rgba(0,0,0,0.4)' }}
        />
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher un code… (ex. MI-05, EVT-2025, Jardin)"
        className="w-full text-sm outline-none bg-transparent"
        style={{
          height:       '34px',
          paddingLeft:  '34px',
          paddingRight: '12px',
          borderRadius: '10px',
          border:       '1.5px solid rgba(0,0,0,0.15)',
          color:        '#000000',
          background:   '#F4F8F5',
        }}
        onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.4)')}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)')}
      />

      {showDropdown && (
        <div
          className="absolute left-0 top-full mt-1.5 w-full rounded-xl border shadow-lg overflow-hidden z-50"
          style={{ background: '#F4F8F5', borderColor: 'rgba(0,0,0,0.12)' }}
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs" style={{ color: 'rgba(0,0,0,0.4)' }}>
              {loading ? 'Recherche…' : `Aucun résultat pour « ${query.trim()} »`}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => {
                const navigable = !!r.href
                return (
                  <li key={`${r.entityType}-${r.code}-${i}`}>
                    <button
                      type="button"
                      disabled={!navigable}
                      aria-disabled={!navigable}
                      onMouseDown={(e) => { e.preventDefault(); selectResult(r) }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors"
                      style={{
                        background: activeIndex === i && navigable ? 'rgba(0,0,0,0.05)' : 'transparent',
                        cursor:     navigable ? 'pointer' : 'default',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold" style={{ color: navigable ? '#1F6B3D' : 'rgba(0,0,0,0.45)' }}>{r.code}</p>
                        <p className="text-sm truncate" style={{ color: navigable ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }}>{r.label}</p>
                        {r.destination ? (
                          <p
                            className="text-xs truncate"
                            style={{ color: navigable ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)', fontStyle: navigable ? 'normal' : 'italic' }}
                          >
                            {r.destination}
                          </p>
                        ) : r.sublabel ? (
                          <p className="text-xs truncate" style={{ color: 'rgba(0,0,0,0.4)' }}>{r.sublabel}</p>
                        ) : null}
                        {r.within && (
                          <p className="text-xs truncate flex items-center gap-1" style={{ color: 'rgba(0,0,0,0.35)' }}>
                            <CornerDownRight aria-hidden style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                            <span className="truncate">dans {r.within}</span>
                          </p>
                        )}
                      </div>
                      <span
                        className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.5)' }}
                      >
                        {DMS_SEARCH_ENTITY_LABELS[r.entityType]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
