'use client'
import { useState } from 'react'

type Row = {
  e: {
    id: string
    name: string
    exportType: string
    generatedAt: string | Date
    projectIdsIncluded: string[] | null
    fileSizeBytes: number | null
    downloadCount: number
  }
  assetUrl: string | null
  generatorName: string | null
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function HistoryTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial)

  async function del(id: string) {
    if (!confirm('Supprimer cet export ?')) return
    const res = await fetch(`/api/portfolio/exports/${id}`, { method: 'DELETE' })
    if (res.ok) setRows((r) => r.filter((x) => x.e.id !== id))
  }

  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left p-2">Nom</th>
          <th>Type</th>
          <th>Date</th>
          <th>Projets</th>
          <th>Auteur</th>
          <th>Taille</th>
          <th>Téléchargements</th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.e.id} className="border-t">
            <td className="p-2">{r.e.name}</td>
            <td className="text-center">{r.e.exportType}</td>
            <td className="text-center">
              {new Date(r.e.generatedAt).toLocaleDateString('fr-FR')}
            </td>
            <td className="text-center">{r.e.projectIdsIncluded?.length ?? 0}</td>
            <td className="text-center">{r.generatorName ?? '—'}</td>
            <td className="text-center">{fmtSize(r.e.fileSizeBytes)}</td>
            <td className="text-center">{r.e.downloadCount}</td>
            <td className="text-center">
              {r.assetUrl && (
                <a
                  className="text-emerald-700 underline"
                  href={`/api/portfolio/exports/${r.e.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Télécharger
                </a>
              )}
            </td>
            <td className="text-center">
              <button className="text-red-700" onClick={() => del(r.e.id)}>
                Supprimer
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
