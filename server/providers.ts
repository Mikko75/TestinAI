// 3D-generoinnin palveluntarjoajat. "mock" palauttaa valmiin mallin, jotta ketjun voi testata ilman kuluja.

import { readFile } from 'node:fs/promises'
import { config } from './config.ts'

export type GenerationProgress = (stage: 'uploading' | 'generating', progress: number) => void

export type GenerationResult = { glb: Uint8Array; creditsConsumed: number | null }

export class ProviderError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function mockGenerate(_image: Uint8Array, onProgress: GenerationProgress): Promise<GenerationResult> {
  onProgress('uploading', 0)
  await sleep(300)
  for (let progress = 0; progress <= 100; progress += 25) {
    onProgress('generating', progress)
    await sleep(300)
  }
  return { glb: new Uint8Array(await readFile('public/models/SheenChair.glb')), creditsConsumed: 0 }
}

type TripoResponse<T> = { code: number; message?: string; data: T }

async function tripo<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.tripo.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.tripo.apiKey}`, ...init.headers },
  })
  const text = await response.text()
  let body: TripoResponse<T>
  try {
    body = JSON.parse(text)
  } catch {
    throw new ProviderError(`Tripo ${path}: HTTP ${response.status} ${text.slice(0, 200)}`)
  }
  if (!response.ok || body.code !== 0) {
    throw new ProviderError(`Tripo ${path}: HTTP ${response.status}, code ${body.code}: ${body.message ?? text.slice(0, 200)}`)
  }
  return body.data
}

const TERMINAL_FAILURES = new Set(['failed', 'cancelled', 'banned', 'expired', 'unknown'])
const POLL_INTERVAL_MS = 3000
const TIMEOUT_MS = 15 * 60 * 1000

async function tripoGenerate(image: Uint8Array, onProgress: GenerationProgress): Promise<GenerationResult> {
  onProgress('uploading', 0)
  const form = new FormData()
  form.append('file', new Blob([image as Uint8Array<ArrayBuffer>], { type: 'image/png' }), 'product.png')
  const { file_token: fileToken } = await tripo<{ file_token: string }>('/files', { method: 'POST', body: form })

  const { task_id: taskId } = await tripo<{ task_id: string }>('/generation/image-to-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: fileToken, model: config.tripo.model, texture: true, pbr: true }),
  })

  const started = Date.now()
  while (Date.now() - started < TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS)
    const task = await tripo<{
      status: string
      progress?: number
      output?: { model_url?: string }
      credits_consumed?: number
    }>(`/tasks/${encodeURIComponent(taskId)}`)
    onProgress('generating', task.progress ?? 0)

    if (task.status === 'success') {
      const url = task.output?.model_url
      if (!url) throw new ProviderError(`Tripo-tehtävä ${taskId} valmis, mutta mallin osoite puuttuu`)
      // Osoite vanhenee viidessä minuutissa, joten malli ladataan heti.
      const download = await fetch(url)
      if (!download.ok) throw new ProviderError(`Mallin lataus epäonnistui: HTTP ${download.status}`)
      return { glb: new Uint8Array(await download.arrayBuffer()), creditsConsumed: task.credits_consumed ?? null }
    }
    if (TERMINAL_FAILURES.has(task.status)) throw new ProviderError(`Tripo-tehtävä ${taskId}: ${task.status}`)
  }
  throw new ProviderError(`Tripo-tehtävä ${taskId} ei valmistunut ${TIMEOUT_MS / 60000} minuutissa`)
}

export const generate = config.provider === 'tripo' ? tripoGenerate : mockGenerate
