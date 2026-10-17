// Generointityöt: jono, tila ja tallennus levylle (server/data). PoC: yksi prosessi, ei tietokantaa.

import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { config } from './config.ts'
import { postprocess, QualityError, type Dimensions, type Warning } from './postprocess.ts'
import { generate, ProviderError } from './providers.ts'

export type JobStatus = 'queued' | 'uploading' | 'generating' | 'processing' | 'done' | 'failed'

export type Job = {
  id: string
  status: JobStatus
  progress: number
  name: string
  expected: Dimensions | null
  createdAt: string
  finishedAt: string | null
  attempts: number
  dimensions: Dimensions | null
  scale: number | null
  warnings: Warning[]
  error: { code: 'invalid_image' | 'generation' | 'quality'; message: string } | null
  creditsConsumed: number | null
}

const MAX_ATTEMPTS = 2
const CONCURRENCY = 2
/** Tripo hyväksyy enintään 20 Mt; pidempi sivu rajataan, jotta lataus pysyy nopeana. */
const MAX_IMAGE_SIDE = 2048

const jobs = new Map<string, Job>()
const images = new Map<string, Uint8Array>()
const queue: string[] = []
let running = 0

const jobsDir = () => `${config.dataDir}/jobs`
const modelsDir = () => `${config.dataDir}/models`
export const modelPath = (id: string) => `${modelsDir()}/${id}.glb`

async function save(job: Job) {
  await writeFile(`${jobsDir()}/${job.id}.json`, JSON.stringify(job, null, 2))
}

export async function loadJobs() {
  await mkdir(jobsDir(), { recursive: true })
  await mkdir(modelsDir(), { recursive: true })
  for (const file of await readdir(jobsDir())) {
    if (!file.endsWith('.json')) continue
    const job = JSON.parse(await readFile(`${jobsDir()}/${file}`, 'utf8')) as Job
    // Kesken jääneet työt eivät jatku uudelleenkäynnistyksen jälkeen (kuva ei ole tallessa).
    if (job.status !== 'done' && job.status !== 'failed') {
      job.status = 'failed'
      job.error = { code: 'generation', message: 'Palvelu käynnistyi uudelleen kesken generoinnin' }
      await save(job)
    }
    jobs.set(job.id, job)
  }
}

export const getJob = (id: string) => jobs.get(id) ?? null

/** Tarkistaa ja normalisoi kuvan PNG:ksi. Heittää virheen, jos kuva ei kelpaa. */
async function normalizeImage(input: Uint8Array): Promise<Uint8Array> {
  const image = sharp(input, { failOn: 'error' }).rotate()
  const { width = 0, height = 0 } = await image.metadata()
  if (Math.min(width, height) < 256) throw new Error(`Kuva on liian pieni (${width} × ${height} px, vähintään 256 px)`)
  return new Uint8Array(
    await image.resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: 'inside', withoutEnlargement: true }).png().toBuffer(),
  )
}

export async function createJob(input: { image: Uint8Array; name: string; expected: Dimensions | null }): Promise<Job> {
  const image = await normalizeImage(input.image)
  const job: Job = {
    id: randomUUID(),
    status: 'queued',
    progress: 0,
    name: input.name,
    expected: input.expected,
    createdAt: new Date().toISOString(),
    finishedAt: null,
    attempts: 0,
    dimensions: null,
    scale: null,
    warnings: [],
    error: null,
    creditsConsumed: null,
  }
  jobs.set(job.id, job)
  images.set(job.id, image)
  await save(job)
  queue.push(job.id)
  void pump()
  return job
}

async function pump() {
  while (running < CONCURRENCY && queue.length > 0) {
    const id = queue.shift()!
    running++
    run(jobs.get(id)!)
      .catch((error) => console.error(`Työ ${id}:`, error))
      .finally(() => {
        running--
        images.delete(id)
        void pump()
      })
  }
}

async function update(job: Job, changes: Partial<Job>) {
  Object.assign(job, changes)
  await save(job)
}

async function run(job: Job) {
  const image = images.get(job.id)!
  while (job.attempts < MAX_ATTEMPTS) {
    job.attempts++
    try {
      const generated = await generate(image, (stage, progress) => {
        job.status = stage
        job.progress = progress
      })
      await update(job, { status: 'processing', progress: 100, creditsConsumed: generated.creditsConsumed })
      const result = await postprocess(generated.glb, {
        expected: job.expected,
        frontRotationDeg: config.provider === 'tripo' ? config.tripo.frontRotationDeg : 0,
      })
      await writeFile(modelPath(job.id), result.glb)
      await update(job, {
        status: 'done',
        dimensions: result.dimensions,
        scale: result.scale,
        warnings: result.warnings,
        finishedAt: new Date().toISOString(),
      })
      return
    } catch (error) {
      const code = error instanceof QualityError ? 'quality' : 'generation'
      console.error(`Työ ${job.id}, yritys ${job.attempts}:`, error)
      // Uusi yritys vain generointivirheissä; laatuvirhe toistuisi samalla mallilla todennäköisesti.
      if (code === 'generation' && error instanceof ProviderError && job.attempts < MAX_ATTEMPTS) continue
      await update(job, {
        status: 'failed',
        error: { code, message: error instanceof Error ? error.message : String(error) },
        finishedAt: new Date().toISOString(),
      })
      return
    }
  }
}
