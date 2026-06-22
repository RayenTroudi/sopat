'use client'
import { useState } from 'react'
import { ProjectPicker, type PickerProject } from './ProjectPicker'
import { DEFAULT_SECTIONS, type ExportConfig, type SectionToggles } from '@/lib/portfolio/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SECTION_LABELS: Record<keyof SectionToggles, string> = {
  cover: 'Page de couverture',
  company: "Présentation de l'entreprise",
  certifications: 'Certifications',
  team: 'Notre équipe',
  projectTypes: 'Nos types de projets',
  projects: 'Projets',
  realisation: 'Partie Réalisation',
  entretien: 'Partie Entretien',
  eclairageDecoration: 'Éclairage & Décoration',
  rse: 'Activités RSE',
  clients: 'Ils nous font confiance',
  achievements: 'Nos réalisations en chiffres',
  contacts: 'Contacts',
}

type Stage = 'idle' | 'projects_resolved' | 'data_loaded' | 'pdf_rendered' | 'uploaded' | 'done' | 'error'

export function ExportWizard({ projects }: { projects: PickerProject[] }) {
  const [name, setName] = useState('Portfolio SOPAT 2026')
  const [exportType, setExportType] = useState<ExportConfig['exportType']>('full')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sections, setSections] = useState<SectionToggles>(DEFAULT_SECTIONS)
  const [stage, setStage] = useState<Stage>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function generate() {
    setStage('idle')
    setDownloadUrl(null)
    setErrorMsg(null)
    const config: ExportConfig = {
      name,
      exportType,
      projectIds: exportType === 'custom' ? [...selected] : undefined,
      sections,
      language: 'fr',
    }
    const res = await fetch('/api/portfolio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.body) {
      setErrorMsg('Pas de flux SSE')
      return
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const events = buf.split('\n\n')
      buf = events.pop() ?? ''
      for (const block of events) {
        const evMatch = block.match(/^event: (.+)$/m)
        const dataMatch = block.match(/^data: (.+)$/m)
        if (!evMatch) continue
        const ev = evMatch[1]
        const data = dataMatch ? JSON.parse(dataMatch[1]) : {}
        if (ev === 'projects_resolved') {
          setStage('projects_resolved')
          setProgressMsg(`Chargement des projets… (${data.count})`)
        }
        if (ev === 'data_loaded') {
          setStage('data_loaded')
          setProgressMsg('Génération des pages…')
        }
        if (ev === 'pdf_rendered') {
          setStage('pdf_rendered')
          setProgressMsg('Compilation du PDF…')
        }
        if (ev === 'uploaded') {
          setStage('uploaded')
          setProgressMsg('Téléchargement vers Cloudinary…')
        }
        if (ev === 'done') {
          setStage('done')
          setDownloadUrl(data.secureUrl)
        }
        if (ev === 'error') {
          setStage('error')
          setErrorMsg(data.message ?? 'Erreur')
        }
      }
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <label className="block">
        <span className="text-sm">Nom de l&apos;export</span>
        <input
          className="w-full border rounded px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm">Type d&apos;export</span>
        <Select value={exportType} onValueChange={(v) => setExportType(v as ExportConfig['exportType'])}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="full">Complet</SelectItem>
            <SelectItem value="by_type">Par type</SelectItem>
            <SelectItem value="by_country">Par pays</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </label>

      {exportType === 'custom' && (
        <ProjectPicker projects={projects} selected={selected} onChange={setSelected} />
      )}

      <fieldset className="border rounded p-3">
        <legend className="text-sm font-semibold">Sections</legend>
        {(Object.keys(SECTION_LABELS) as (keyof SectionToggles)[]).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sections[k]}
              onChange={(e) => setSections({ ...sections, [k]: e.target.checked })}
            />
            <span>{SECTION_LABELS[k]}</span>
          </label>
        ))}
      </fieldset>

      <button
        onClick={generate}
        className="px-4 py-2 bg-emerald-700 text-white rounded"
      >
        Générer le Portfolio
      </button>

      {stage !== 'idle' && stage !== 'error' && (
        <div className="border rounded p-3 bg-emerald-50">
          <p className="text-sm">{progressMsg}</p>
        </div>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-4 py-2 bg-emerald-900 text-white rounded"
        >
          Télécharger le PDF
        </a>
      )}
      {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
    </div>
  )
}
