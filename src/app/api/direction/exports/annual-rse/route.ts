import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { auth } from '@/lib/auth'
import { getRseReportData } from '@/lib/db/achievements'
import { AnnualRsePdf } from '@/components/pdf/AnnualRsePdf'
import { cloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

function isDirection(role: string) {
  return role === 'admin' || role === 'direction'
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isDirection(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const url = new URL(req.url)
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? Math.max(2000, Math.min(2100, parseInt(yearParam, 10))) : new Date().getFullYear()

  const data = await getRseReportData(year)
  const pdfBuffer = await renderToBuffer(React.createElement(AnnualRsePdf, { data }) as any)

  const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'sopat/direction/exports',
        public_id:     `rapport-rse-${year}-${Date.now()}`,
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

  return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id, year })
}
