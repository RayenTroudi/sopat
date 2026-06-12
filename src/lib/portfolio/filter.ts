import type { ExportConfig, ProjectType } from './types'

type ProjRow = { id: string; projectType: ProjectType; country: string; status: string }

export function resolveProjectIds(config: ExportConfig, all: ProjRow[]): string[] {
  const completed = all.filter((p) => p.status === 'completed')
  switch (config.exportType) {
    case 'full':
      return completed.map((p) => p.id)
    case 'by_type': {
      const types = new Set(config.projectTypes ?? [])
      return completed.filter((p) => types.has(p.projectType)).map((p) => p.id)
    }
    case 'by_country': {
      const ctry = new Set(config.countries ?? [])
      return completed.filter((p) => ctry.has(p.country)).map((p) => p.id)
    }
    case 'custom': {
      const allow = new Set(config.projectIds ?? [])
      return all.filter((p) => allow.has(p.id)).map((p) => p.id)
    }
    case 'single_project': {
      const first = config.projectIds?.[0]
      const hit = all.find((p) => p.id === first)
      return hit ? [hit.id] : []
    }
  }
}
