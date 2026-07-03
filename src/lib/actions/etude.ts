'use server'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createPlantSpecies, updatePlantSpecies, type PlantSpeciesInput } from '@/lib/db/plant-species'
import { createDecorativeMaterial, updateDecorativeMaterial, type DecorativeMaterialInput } from '@/lib/db/decorative-materials'
import { createPhytosanitary, updatePhytosanitary, type PhytosanitaryInput } from '@/lib/db/phytosanitary'
import { upsertProjectStudyRecord, type ProjectStudyInput } from '@/lib/db/project-study-record'

// ─── Plant Species ────────────────────────────────────────────────────────────

export async function createPlantSpeciesAction(data: PlantSpeciesInput) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    const row = await createPlantSpecies(data, session.user.userId)
    return { success: true, id: row.id }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}

export async function updatePlantSpeciesAction(id: string, data: Partial<PlantSpeciesInput>) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    await updatePlantSpecies(id, data)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}

// ─── Decorative Materials ─────────────────────────────────────────────────────

export async function createDecorativeMaterialAction(data: DecorativeMaterialInput) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    const row = await createDecorativeMaterial(data, session.user.userId)
    return { success: true, id: row.id }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}

export async function updateDecorativeMaterialAction(id: string, data: Partial<DecorativeMaterialInput>) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    await updateDecorativeMaterial(id, data)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}

// ─── Phytosanitary Products ───────────────────────────────────────────────────

export async function createPhytosanitaryAction(data: PhytosanitaryInput) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    const row = await createPhytosanitary(data, session.user.userId)
    return { success: true, id: row.id }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}

export async function updatePhytosanitaryAction(id: string, data: Partial<PhytosanitaryInput>) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    await updatePhytosanitary(id, data)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}

// ─── Project Study Record ─────────────────────────────────────────────────────

export async function upsertProjectStudyAction(projectId: string, data: ProjectStudyInput) {
  const session = await auth()
  if (!session) redirect('/login')

  try {
    await upsertProjectStudyRecord(projectId, data, session.user.userId)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Erreur inconnue' }
  }
}
