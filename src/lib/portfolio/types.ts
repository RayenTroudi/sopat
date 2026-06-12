import type {
  portfolioExports,
  portfolioSettings,
  projects,
  cloudinaryAssets,
  users,
  clients,
} from '@/db/schema'

export type { ProjectType } from '@/lib/db/projects'
import type { ProjectType } from '@/lib/db/projects'

export type SectionToggles = {
  cover: boolean
  company: boolean
  certifications: boolean
  team: boolean
  projectTypes: boolean
  projects: boolean
  realisation: boolean
  entretien: boolean
  eclairageDecoration: boolean
  rse: boolean
  clients: boolean
  achievements: boolean
  contacts: boolean
}

export const DEFAULT_SECTIONS: SectionToggles = {
  cover: true, company: true, certifications: true, team: true,
  projectTypes: true, projects: true, realisation: true, entretien: true,
  eclairageDecoration: true, rse: true, clients: true, achievements: true,
  contacts: true,
}

export type ExportConfig = {
  name: string
  exportType: 'full' | 'by_type' | 'by_country' | 'custom' | 'single_project'
  projectTypes?: ProjectType[]
  countries?: string[]
  projectIds?: string[]
  sections: SectionToggles
  language: 'fr'
  notes?: string
}

export type PortfolioSettings = typeof portfolioSettings.$inferSelect
export type PortfolioExport = typeof portfolioExports.$inferSelect

export type ProjectWithAssets = typeof projects.$inferSelect & {
  renders3d: (typeof cloudinaryAssets.$inferSelect)[]
  sitePlans: (typeof cloudinaryAssets.$inferSelect)[]
  sitePhotos: (typeof cloudinaryAssets.$inferSelect)[]
  plants: { botanicalName: string; commonName: string | null; quantity: string }[]
}

export type TeamGroup = {
  roleKey: 'direction' | 'etudes' | 'realisation' | 'entretien' | 'admin'
  labelFr: string
  members: (typeof users.$inferSelect)[]
}

export type AchievementsNumbers = {
  projectsCompleted: number
  hectaresLandscaped: number
  treesPlanted: number
  clientsServed: number
  countriesPresent: number
  yearsExperience: number
}

export type FeaturedClient = typeof clients.$inferSelect

export type RseEventSummary = {
  id: string
  title: string
  date: Date
  location: string
  eventType: string
}

export type PortfolioBundle = {
  settings: PortfolioSettings
  projects: ProjectWithAssets[]
  team: TeamGroup[]
  projectTypeCounts: Record<ProjectType, number>
  achievements: AchievementsNumbers
  featuredClients: FeaturedClient[]
  rseEvents: RseEventSummary[]
  maintenanceVisitsAfterPhotos: (typeof cloudinaryAssets.$inferSelect)[]
}
