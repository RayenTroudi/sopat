import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import fs from 'fs'
import path from 'path'

const CSV_PATH = path.join(process.cwd(), 'data', 'training', 'sopat_projects_2021_2026.csv')

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  if (!fs.existsSync(CSV_PATH)) {
    return NextResponse.json({ error: 'Fichier de données introuvable. Lancez d\'abord le script d\'entraînement.' }, { status: 404 })
  }

  const csv = fs.readFileSync(CSV_PATH)
  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sopat_training_data.csv"',
    },
  })
}
