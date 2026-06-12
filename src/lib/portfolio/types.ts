import type { InferSelectModel } from 'drizzle-orm'
import type {
  portfolioExports,
  portfolioSettings,
  projects,
  cloudinaryAssets,
  users,
  clients,
} from '@/db/schema'

export type ProjectType =
  | 'ingenierie_territoriale'
  | 'espace_public'
  | 'siege_social'
  | 'hotelier_touristique'
  | 'residentiel'
  | 'interieur'

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

export type PortfolioSettings = InferSelectModel<typeof portfolioSettings>
export type PortfolioExport = InferSelectModel<typeof portfolioExports>

export type ProjectWithAssets = InferSelectModel<typeof projects> & {
  renders3d: InferSelectModel<typeof cloudinaryAssets>[]
  sitePlans: InferSelectModel<typeof cloudinaryAssets>[]
  sitePhotos: InferSelectModel<typeof cloudinaryAssets>[]
  plants: { botanicalName: string; commonName: string | null; quantity: string }[]
}

export type TeamGroup = {
  roleKey: 'direction' | 'etudes' | 'realisation' | 'entretien' | 'admin'
  labelFr: string
  members: InferSelectModel<typeof users>[]
}

export type AchievementsNumbers = {
  projectsCompleted: number
  hectaresLandscaped: number
  treesPlanted: number
  clientsServed: number
  countriesPresent: number
  yearsExperience: number
}

export type FeaturedClient = InferSelectModel<typeof clients>

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
  maintenanceVisitsAfterPhotos: InferSelectModel<typeof cloudinaryAssets>[]
}
