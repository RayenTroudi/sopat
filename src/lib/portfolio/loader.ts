import { db } from '../../../db/index'
import {
  projects,
  cloudinaryAssets,
  users,
  clients,
  plantListItems,
  rseEvents,
  maintenanceVisits,
} from '../../../db/schema'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getPortfolioSettings } from '@/lib/db/portfolio'
import type {
  PortfolioBundle,
  ProjectWithAssets,
  TeamGroup,
  AchievementsNumbers,
  ProjectType,
  RseEventSummary,
  FeaturedClient,
} from './types'
import { transformUrl, PORTFOLIO_IMG } from './cloudinary'

const ROLE_GROUP: Record<string, TeamGroup['roleKey']> = {
  direction: 'direction',
  etudes_chef: 'etudes',
  etudes_team: 'etudes',
  realisation_chef: 'realisation',
  realisation_team: 'realisation',
  entretien_chef: 'entretien',
  entretien_team: 'entretien',
  admin: 'admin',
}

const GROUP_LABEL: Record<TeamGroup['roleKey'], string> = {
  direction: 'Direction',
  etudes: 'Études',
  realisation: 'Réalisation',
  entretien: 'Entretien',
  admin: 'Administration',
}

const GROUP_ORDER: TeamGroup['roleKey'][] = [
  'direction',
  'etudes',
  'realisation',
  'entretien',
  'admin',
]

const SOPAT_FOUNDED_YEAR = 2005

type CloudinaryAsset = typeof cloudinaryAssets.$inferSelect

function rewriteAssetUrls<T extends { secureUrl: string }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, secureUrl: transformUrl(r.secureUrl, PORTFOLIO_IMG) }))
}

export async function loadPortfolioBundle(projectIds: string[]): Promise<PortfolioBundle> {
  const [
    settings,
    projectRows,
    assetRows,
    userRows,
    plantRows,
    typeCountRows,
    featuredClientRows,
    rseEventRows,
    afterPhotoRows,
    completedCountRow,
    treesRow,
    clientsCountRow,
    countriesRow,
    hectaresRow,
  ] = await Promise.all([
    getPortfolioSettings(),
    projectIds.length
      ? db.select().from(projects).where(inArray(projects.id, projectIds))
      : Promise.resolve([] as (typeof projects.$inferSelect)[]),
    projectIds.length
      ? db
          .select()
          .from(cloudinaryAssets)
          .where(inArray(cloudinaryAssets.projectId, projectIds))
          .orderBy(desc(cloudinaryAssets.createdAt))
      : Promise.resolve([] as CloudinaryAsset[]),
    db
      .select()
      .from(users)
      .where(and(eq(users.isActive, true), isNull(users.deletedAt))),
    projectIds.length
      ? db.select().from(plantListItems).where(inArray(plantListItems.projectId, projectIds))
      : Promise.resolve([] as (typeof plantListItems.$inferSelect)[]),
    db
      .select({
        projectType: projects.projectType,
        count: sql<number>`count(*)::int`,
      })
      .from(projects)
      .where(eq(projects.status, 'completed'))
      .groupBy(projects.projectType),
    db.select().from(clients).where(eq(clients.isFeatured, true)),
    db
      .select({
        id: rseEvents.id,
        title: rseEvents.title,
        date: rseEvents.date,
        location: rseEvents.location,
        eventType: rseEvents.eventType,
      })
      .from(rseEvents)
      .where(eq(rseEvents.status, 'termine'))
      .orderBy(desc(rseEvents.date))
      .limit(6),
    projectIds.length
      ? db
          .select({ asset: cloudinaryAssets })
          .from(maintenanceVisits)
          .innerJoin(
            cloudinaryAssets,
            eq(cloudinaryAssets.id, maintenanceVisits.afterPhotoAssetId),
          )
          .where(inArray(maintenanceVisits.projectId, projectIds))
          .orderBy(desc(maintenanceVisits.visitDate))
          .limit(12)
      : Promise.resolve([] as { asset: CloudinaryAsset }[]),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.status, 'completed')),
    db
      .select({
        n: sql<number>`coalesce(sum(coalesce(participant_count_actual, participant_count_planned, 0)),0)::int`,
      })
      .from(rseEvents)
      .where(eq(rseEvents.status, 'termine')),
    db.select({ n: sql<number>`count(*)::int` }).from(clients),
    db
      .select({ n: sql<number>`count(distinct country)::int` })
      .from(projects)
      .where(eq(projects.status, 'completed')),
    db
      .select({
        sumM2: sql<number>`coalesce(sum(site_area_m2),0)::float`,
      })
      .from(projects)
      .where(eq(projects.status, 'completed')),
  ])

  const renders3dBy = new Map<string, CloudinaryAsset[]>()
  const sitePlansBy = new Map<string, CloudinaryAsset[]>()
  const sitePhotosBy = new Map<string, CloudinaryAsset[]>()
  for (const a of assetRows) {
    const pid = a.projectId
    if (!pid) continue
    let target: Map<string, CloudinaryAsset[]> | null = null
    if (a.assetType === 'render_3d') target = renders3dBy
    else if (a.assetType === 'plan_autocad') target = sitePlansBy
    else if (a.assetType === 'site_photo') target = sitePhotosBy
    if (!target) continue
    const arr = target.get(pid) ?? []
    arr.push(a)
    target.set(pid, arr)
  }

  const plantsBy = new Map<
    string,
    { botanicalName: string; commonName: string | null; quantity: string }[]
  >()
  for (const p of plantRows) {
    const arr = plantsBy.get(p.projectId) ?? []
    arr.push({ botanicalName: p.botanicalName, commonName: p.commonName, quantity: p.quantity })
    plantsBy.set(p.projectId, arr)
  }

  const projectsBundle: ProjectWithAssets[] = projectRows.map((p) => ({
    ...p,
    renders3d: rewriteAssetUrls((renders3dBy.get(p.id) ?? []).slice(0, 3)),
    sitePlans: rewriteAssetUrls((sitePlansBy.get(p.id) ?? []).slice(0, 1)),
    sitePhotos: rewriteAssetUrls((sitePhotosBy.get(p.id) ?? []).slice(0, 6)),
    plants: (plantsBy.get(p.id) ?? []).slice(0, 10),
  }))

  const buckets: Record<TeamGroup['roleKey'], (typeof users.$inferSelect)[]> = {
    direction: [],
    etudes: [],
    realisation: [],
    entretien: [],
    admin: [],
  }
  for (const u of userRows) {
    const key = ROLE_GROUP[u.role] ?? 'admin'
    buckets[key].push(u)
  }
  const team: TeamGroup[] = GROUP_ORDER.map((k) => ({
    roleKey: k,
    labelFr: GROUP_LABEL[k],
    members: buckets[k],
  })).filter((g) => g.members.length > 0)

  const projectTypeCounts: Record<ProjectType, number> = {
    ingenierie_territoriale: 0,
    espace_public: 0,
    siege_social: 0,
    hotelier_touristique: 0,
    residentiel: 0,
    interieur: 0,
  }
  for (const row of typeCountRows) {
    projectTypeCounts[row.projectType as ProjectType] = row.count
  }

  const achievements: AchievementsNumbers = {
    projectsCompleted: completedCountRow[0]?.n ?? 0,
    hectaresLandscaped: Math.round((hectaresRow[0]?.sumM2 ?? 0) / 10000),
    treesPlanted: treesRow[0]?.n ?? 0,
    clientsServed: clientsCountRow[0]?.n ?? 0,
    countriesPresent: countriesRow[0]?.n ?? 0,
    yearsExperience: new Date().getFullYear() - SOPAT_FOUNDED_YEAR,
  }

  return {
    settings,
    projects: projectsBundle,
    team,
    projectTypeCounts,
    achievements,
    featuredClients: featuredClientRows as FeaturedClient[],
    rseEvents: rseEventRows as RseEventSummary[],
    maintenanceVisitsAfterPhotos: rewriteAssetUrls(afterPhotoRows.map((r) => r.asset)),
  }
}
