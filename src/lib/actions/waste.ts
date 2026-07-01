'use server'

import { db } from '@/db'
import { wasteRecords } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createWasteRecord(data: {
  month: number
  year: number
  wasteType: string
  quantityKg?: number
  disposal: string
  contractor?: string
  cost?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(wasteRecords).values({
    month: data.month,
    year: data.year,
    wasteType: data.wasteType as 'papier_carton' | 'plastique' | 'verre' | 'metal' | 'dechets_verts' | 'dechets_chimiques' | 'electronique' | 'autre',
    quantityKg: data.quantityKg,
    disposal: data.disposal as 'tri_selectif' | 'collecte_municipale' | 'prestataire_agree' | 'incineration' | 'autre',
    contractor: data.contractor,
    cost: data.cost,
    notes: data.notes,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/environment/waste')
  return { success: true }
}
