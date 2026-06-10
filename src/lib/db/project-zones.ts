import { db } from '../../../db/index'
import { projectZones } from '../../../db/schema'
import { eq, asc } from 'drizzle-orm'

export type ZoneType =
  | 'entree' | 'piscine' | 'rooftop' | 'restaurant' | 'aquapark'
  | 'acces_plage' | 'etage' | 'cour_interieure' | 'parking' | 'jardin_chef' | 'autre'

export type ZoneStatus = 'etude' | 'realisation' | 'entretien' | 'termine'

export type CreateZoneInput = {
  projectId: string
  zoneName: string
  zoneType?: ZoneType
  floorNumber?: number
  surfaceM2?: string
  plantPaletteNotes?: string
  lightingNotes?: string
  status?: ZoneStatus
  createdBy: string
}

export async function getZonesByProject(projectId: string) {
  return db
    .select()
    .from(projectZones)
    .where(eq(projectZones.projectId, projectId))
    .orderBy(asc(projectZones.createdAt))
}

export async function saveProjectZones(
  projectId: string,
  zones: Omit<CreateZoneInput, 'projectId' | 'createdBy'>[],
  createdBy: string
) {
  return db.transaction(async (tx) => {
    await tx.delete(projectZones).where(eq(projectZones.projectId, projectId))
    if (zones.length === 0) return []
    return tx.insert(projectZones).values(
      zones.map((z) => ({ ...z, projectId, createdBy }))
    ).returning()
  })
}
