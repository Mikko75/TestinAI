// Viestit pääsäikeen ja taustanpoistotyöntekijän (worker.ts) välillä.

export type RemovalErrorCode = 'download' | 'decode' | 'processing' | 'empty'

export type WorkerRequest = { type: 'remove'; image: Blob }

export type WorkerResponse =
  | { type: 'download'; loaded: number; total: number }
  | { type: 'processing' }
  | { type: 'done'; image: Blob; width: number; height: number; device: 'webgpu' | 'wasm' }
  | { type: 'error'; code: RemovalErrorCode; detail: string }
