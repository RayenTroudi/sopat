import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// child_process and path are required dynamically so Turbopack does not
// statically trace process.cwd() and bundle the whole project filesystem.
// They are never imported on Vercel because IS_VERCEL returns early above.
async function getSpawn() {
  const [{ spawn }, { join }] = await Promise.all([
    import('child_process'),
    import('path'),
  ])
  return {
    spawn,
    retrainPy: join(process.cwd(), 'scripts', 'retrain_model.py'),
    python: process.env.PYTHON_PATH ?? 'python',
  }
}

type RetrainEvent = {
  status:   'starting' | 'progress' | 'done' | 'error'
  message:  string
  metadata?: {
    model_version:    string
    training_date:    string
    training_samples: number
    rmse:             number
    r2:               number
  }
}

const IS_VERCEL = Boolean(process.env.VERCEL)

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  if (IS_VERCEL) {
    return NextResponse.json(
      { error: "L'entraînement du modèle n'est pas disponible sur Vercel. Exécutez scripts/retrain_model.py localement ou déployez un microservice FastAPI." },
      { status: 501 }
    )
  }

  // Stream progress lines back as NDJSON
  const encoder = new TextEncoder()

  const { spawn, retrainPy, python } = await getSpawn()

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn(python, [retrainPy], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      })

      let buffer = ''

      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as RetrainEvent
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ status: 'progress', message: line }) + '\n'))
          }
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        const msg = chunk.toString('utf8').trim()
        if (msg) {
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'progress', message: `stderr: ${msg}` }) + '\n'))
        }
      })

      child.on('close', (code) => {
        if (code !== 0) {
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'error', message: `Processus terminé avec code ${code}` }) + '\n'))
        }
        controller.close()
      })

      child.on('error', (err) => {
        controller.enqueue(encoder.encode(JSON.stringify({ status: 'error', message: `Impossible de démarrer Python : ${err.message}` }) + '\n'))
        controller.close()
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':  'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
