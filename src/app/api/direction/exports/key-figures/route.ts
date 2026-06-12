import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { auth } from '@/lib/auth'
import { getAchievements } from '@/lib/db/achievements'
import { KeyFiguresPdf } from '@/components/pdf/KeyFiguresPdf'
import { cloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

function isDirection(role: string) {
  return role === 'admin' || role === 'direction'
}

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isDirection(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const data = await getAchievements()
  const pdfBuffer = await renderToBuffer(React.createElement(KeyFiguresPdf, { data }) as any)

  const today = new Date().toISOString().slice(0, 10)
  const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'sopat/direction/exports',
        public_id:     `key-figures-${today}-${Date.now()}`,
        resource_type: 'raw',
        format:        'pdf',
        type:          'upload',
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload Cloudinary échoué'))
        resolve(result as unknown as { secure_url: string; public_id: string })
      },
    )
    stream.end(pdfBuffer)
  })

  return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id })
}
