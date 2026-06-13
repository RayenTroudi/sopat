'use client'
import { useState } from 'react'

export type PickerProject = {
  id: string
  name: string
  projectType: string
  country: string
  conceptTitle: string | null
}

export function ProjectPicker({
  projects,
  selected,
  onChange,
}: {
  projects: PickerProject[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [q, setQ] = useState('')
  const filtered = projects.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.conceptTitle ?? '').toLowerCase().includes(q.toLowerCase()),
  )
  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }
  return (
    <div className="border rounded p-3 max-h-96 overflow-auto">
      <input
        className="w-full border rounded px-2 py-1 mb-2"
        placeholder="Rechercher…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.map((p) => (
        <label key={p.id} className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={selected.has(p.id)}
            onChange={() => toggle(p.id)}
          />
          <span className="flex-1">
            {p.name}{' '}
            <span className="text-xs text-gray-500">
              · {p.country} · {p.projectType}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}
