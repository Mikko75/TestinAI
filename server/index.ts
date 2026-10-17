// Realitin-palvelu (PoC): tuotekuvasta 3D-malli. Ajo: npm run server
//
// POST /v1/jobs            { image: base64 (PNG/JPEG/WebP), name, dimensions?: { widthCm, heightCm, depthCm } }
// GET  /v1/jobs/:id        työn tila
// GET  /v1/models/:id.glb  valmis malli
// Kaikki pyynnöt: Authorization: Bearer <REALITIN_API_KEY>

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { timingSafeEqual } from 'node:crypto'
import { config } from './config.ts'
import { createJob, getJob, loadJobs, modelPath, type Job } from './jobs.ts'
import type { Dimensions } from './postprocess.ts'

const MAX_BODY_BYTES = 30 * 1024 * 1024

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const fail = (res: ServerResponse, status: number, code: string, message: string) =>
  send(res, status, { error: { code, message } })

function authorized(req: IncomingMessage): boolean {
  const header = req.headers.authorization ?? ''
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''))
  const expected = Buffer.from(config.apiKey)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('too_large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function parseDimensions(value: unknown): Dimensions | null | 'invalid' {
  if (value == null) return null
  if (typeof value !== 'object') return 'invalid'
  const { widthCm, heightCm, depthCm } = value as Record<string, unknown>
  const valid = [widthCm, heightCm, depthCm].every((n) => typeof n === 'number' && n > 1 && n < 1000)
  return valid ? { widthCm: widthCm as number, heightCm: heightCm as number, depthCm: depthCm as number } : 'invalid'
}

function publicJob(job: Job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    name: job.name,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
    expectedDimensions: job.expected,
    dimensions: job.dimensions,
    warnings: job.warnings,
    error: job.error,
    creditsConsumed: job.creditsConsumed,
    modelUrl: job.status === 'done' ? `${config.publicUrl}/v1/models/${job.id}.glb` : null,
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true, provider: config.provider })
    if (!authorized(req)) return fail(res, 401, 'unauthorized', 'Virheellinen tai puuttuva API-avain')

    if (req.method === 'POST' && url.pathname === '/v1/jobs') {
      let body: { image?: unknown; name?: unknown; dimensions?: unknown }
      try {
        body = (await readJson(req)) as typeof body
      } catch (error) {
        const tooLarge = error instanceof Error && error.message === 'too_large'
        return fail(res, tooLarge ? 413 : 400, 'invalid_request', tooLarge ? 'Pyyntö on liian suuri' : 'Virheellinen JSON')
      }
      if (typeof body.image !== 'string' || body.image.length === 0) {
        return fail(res, 400, 'invalid_request', 'Kenttä image (base64) puuttuu')
      }
      const expected = parseDimensions(body.dimensions)
      if (expected === 'invalid') {
        return fail(res, 400, 'invalid_request', 'Mitat: widthCm, heightCm ja depthCm, numeroina 1–1000 cm')
      }
      try {
        const job = await createJob({
          image: new Uint8Array(Buffer.from(body.image, 'base64')),
          name: typeof body.name === 'string' ? body.name.slice(0, 200) : '',
          expected,
        })
        return send(res, 202, publicJob(job))
      } catch (error) {
        return fail(res, 422, 'invalid_image', error instanceof Error ? error.message : 'Kuvaa ei voitu lukea')
      }
    }

    const jobMatch = url.pathname.match(/^\/v1\/jobs\/([0-9a-f-]{36})$/)
    if (req.method === 'GET' && jobMatch) {
      const job = getJob(jobMatch[1])
      return job ? send(res, 200, publicJob(job)) : fail(res, 404, 'not_found', 'Työtä ei löydy')
    }

    const modelMatch = url.pathname.match(/^\/v1\/models\/([0-9a-f-]{36})\.glb$/)
    if (req.method === 'GET' && modelMatch) {
      const job = getJob(modelMatch[1])
      if (!job || job.status !== 'done') return fail(res, 404, 'not_found', 'Mallia ei löydy')
      const glb = await readFile(modelPath(job.id))
      res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': glb.length })
      return res.end(glb)
    }

    return fail(res, 404, 'not_found', 'Tuntematon osoite')
  } catch (error) {
    console.error(error)
    return fail(res, 500, 'internal', 'Palvelinvirhe')
  }
})

await loadJobs()
server.listen(config.port, '127.0.0.1', () => {
  console.log(`Realitin-palvelu: http://127.0.0.1:${config.port} (generointi: ${config.provider})`)
})
