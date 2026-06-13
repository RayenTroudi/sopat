import { NextRequest } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { db } from '../../../../../db/index'
import { projects, cloudinaryAssets } from '../../../../../db/schema'
import { resolveProjectIds } from '@/lib/portfolio/filter'
import { loadPortfolioBundle } from '@/lib/portfolio/loader'
import { insertPortfolioExport } from '@/lib/db/portfolio'
import { uploadBufferToCloudinary } from '@/lib/cloudinary'
import { PortfolioDocument } from '@/components/pdf/PortfolioDocument'
import type { ExportConfig } from '@/lib/portfolio/types'

export const runtime = 'nodejs'
export const maxDuration = 300

function sse(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  controller.enqueue(
    new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!hasFullAccess(session.user.role)) return new Response('Forbidden', { status: 403 })
  const userId = session.user.userId

  const config = (await req.json()) as ExportConfig
  if (!config?.name || !config?.exportType) {
    return new Response('Bad config', { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sse(controller, 'auth_ok', {})

        const all = await db
          .select({
            id: projects.id,
            projectType: projects.projectType,
            country: projects.country,
            status: projects.status,
          })
          .from(projects)

        const ids = resolveProjectIds(config, all)
        if (ids.length === 0 && config.exportType !== 'full') {
          sse(controller, 'error', { stage: 'projects_resolved', message: 'no_projects_match' })
          controller.close()
          return
        }
        sse(controller, 'projects_resolved', { count: ids.length })

        const bundle = await loadPortfolioBundle(ids)
        sse(controller, 'data_loaded', {})

        let ceoPhotoUrl: string | undefined
        if (bundle.settings.ceoPhotoCloudinaryId) {
          const [asset] = await db
            .select()
            .from(cloudinaryAssets)
            .where(eq(cloudinaryAssets.id, bundle.settings.ceoPhotoCloudinaryId))
            .limit(1)
          if (asset) ceoPhotoUrl = asset.secureUrl
        }

        const doc = React.createElement(PortfolioDocument, {
          bundle,
          config,
          ceoPhotoUrl,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buffer = await renderToBuffer(doc as any)
        sse(controller, 'pdf_rendered', { bytes: buffer.byteLength })

        const upload = await uploadBufferToCloudinary(buffer, { folder: 'portfolio-exports' })
        sse(controller, 'uploaded', {})

        const [assetRow] = await db
          .insert(cloudinaryAssets)
          .values({
            publicId: upload.publicId,
            url: upload.url,
            secureUrl: upload.secureUrl,
            assetType: 'portfolio_pdf',
            format: upload.format,
            bytes: upload.bytes,
            uploadedBy: userId,
            createdBy: userId,
          })
          .returning()

        const exportRow = await insertPortfolioExport({
          name: config.name,
          exportType: config.exportType,
          projectIdsIncluded: ids,
          sectionsConfig: config.sections,
          filterConfig: {
            projectTypes: config.projectTypes,
            countries: config.countries,
            projectIds: config.projectIds,
          },
          language: config.language,
          outputCloudinaryId: assetRow.id,
          fileSizeBytes: upload.bytes,
          pageCount: 0,
          generatedBy: userId,
          notes: config.notes,
        })

        sse(controller, 'done', { exportId: exportRow.id, secureUrl: upload.secureUrl })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sse(controller, 'error', { stage: 'unknown', message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
