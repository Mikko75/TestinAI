import type { RemovalErrorCode, WorkerRequest, WorkerResponse } from './protocol'

/** Taustaton kuva, joka annetaan myöhemmin 3D-generoinnille. */
export type PreparedImage = {
  /** PNG, läpinäkyvä tausta, tyhjät reunat rajattu. */
  image: Blob
  width: number
  height: number
  sourceName: string
}

export type RemovalProgress = { stage: 'download'; loaded: number; total: number } | { stage: 'processing' }

export class RemovalError extends Error {
  readonly code: RemovalErrorCode
  constructor(code: RemovalErrorCode, detail: string) {
    super(detail)
    this.code = code
  }
}

let worker: Worker | null = null

/** Poistaa kuvasta taustan laitteella. Malli ladataan ensimmäisellä kutsulla. */
export function removeBackground(file: File, onProgress: (progress: RemovalProgress) => void): Promise<PreparedImage> {
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  const current = worker

  return new Promise((resolve, reject) => {
    current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      switch (message.type) {
        case 'download':
          onProgress({ stage: 'download', loaded: message.loaded, total: message.total })
          break
        case 'processing':
          onProgress({ stage: 'processing' })
          break
        case 'done':
          resolve({ image: message.image, width: message.width, height: message.height, sourceName: file.name })
          break
        case 'error':
          reject(new RemovalError(message.code, message.detail))
          break
      }
    }
    current.onerror = (event) => {
      // Workerin oma virhe (esim. moduulin lataus epäonnistui): luodaan seuraavalla kerralla uusi.
      worker?.terminate()
      worker = null
      reject(new RemovalError('download', event.message))
    }
    current.postMessage({ type: 'remove', image: file } satisfies WorkerRequest)
  })
}
