// Taustanpoisto omassa säikeessään, jotta sivu ei jäädy laskennan ajaksi.
// Malli ja ONNX Runtime ladataan ensimmäisellä kerralla verkosta ja tallentuvat selaimen välimuistiin.
// Kuva ei lähde laitteelta.

import { pipeline, RawImage, type BackgroundRemovalPipeline, type ProgressInfo } from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './protocol'

// BiRefNet_lite 512×512, MIT. 1024 px -versiot eivät mahdu selaimen muistiin (ks. README).
const MODEL = 'studioludens/birefnet-lite-512'
const REVISION = '4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7'

/** Pidempi sivu pienennetään tähän; riittää myöhemmälle 3D-generoinnille. */
const MAX_SIDE = 2048
/** Läpinäkymättömän alueen alaraja, jonka alittava tulos tulkitaan epäonnistuneeksi. */
const MIN_FOREGROUND_SHARE = 0.005
const CROP_PADDING_SHARE = 0.02

type Device = 'webgpu' | 'wasm'

// Projektin tyypit ovat DOM-ympäristön; workerissa postMessage toimii kuten Worker-oliolla.
const post = (message: WorkerResponse) => (self as unknown as Worker).postMessage(message)

let loaded: { remover: BackgroundRemovalPipeline; device: Device } | null = null

async function preferredDevice(): Promise<Device> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu) return 'wasm'
  try {
    return (await gpu.requestAdapter()) ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

async function loadRemover(device: Device) {
  const remover = await pipeline('background-removal', MODEL, {
    revision: REVISION,
    dtype: 'fp16',
    device,
    progress_callback: (info: ProgressInfo) => {
      if (info.status === 'progress_total') post({ type: 'download', loaded: info.loaded, total: info.total })
    },
  })
  return { remover, device }
}

async function loadWithFallback() {
  const device = await preferredDevice()
  try {
    return await loadRemover(device)
  } catch (error) {
    if (device === 'wasm') throw error
    return loadRemover('wasm')
  }
}

async function decode(blob: Blob): Promise<RawImage> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')!
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new RawImage(context.getImageData(0, 0, width, height).data, width, height, 4)
}

/** Rajaa tyhjät reunat pois ja jättää pienen marginaalin. Palauttaa null, jos huonekalua ei löytynyt. */
function cropToForeground(image: RawImage): ImageData | null {
  const { width, height } = image
  const data = image.data as Uint8ClampedArray
  let minX = width, minY = height, maxX = -1, maxY = -1, opaque = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
      if (alpha > 128) opaque++
    }
  }
  if (opaque < width * height * MIN_FOREGROUND_SHARE) return null

  const pad = Math.round(Math.max(width, height) * CROP_PADDING_SHARE)
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1
  const cropped = new Uint8ClampedArray(cropWidth * cropHeight * 4)
  for (let y = 0; y < cropHeight; y++) {
    const start = ((minY + y) * width + minX) * 4
    cropped.set(data.subarray(start, start + cropWidth * 4), y * cropWidth * 4)
  }
  return new ImageData(cropped, cropWidth, cropHeight)
}

async function removeBackground(blob: Blob) {
  let image: RawImage
  try {
    image = await decode(blob)
  } catch (error) {
    return post({ type: 'error', code: 'decode', detail: String(error) })
  }

  try {
    loaded ??= await loadWithFallback()
  } catch (error) {
    return post({ type: 'error', code: 'download', detail: String(error) })
  }

  post({ type: 'processing' })
  let result: RawImage
  try {
    result = await loaded.remover(image)
  } catch (error) {
    if (loaded.device !== 'webgpu') return post({ type: 'error', code: 'processing', detail: String(error) })
    // Kaikki GPU:t eivät pysty ajamaan mallia WebGPU:lla; yritetään uudelleen WebAssemblyllä.
    // Mallitiedostot ovat jo välimuistissa, joten uutta latausta ei tarvita.
    try {
      await loaded.remover.dispose()
      loaded = await loadRemover('wasm')
      result = await loaded.remover(image)
    } catch (fallbackError) {
      return post({ type: 'error', code: 'processing', detail: String(fallbackError) })
    }
  }

  const cropped = cropToForeground(result)
  if (!cropped) return post({ type: 'error', code: 'empty', detail: 'foreground below threshold' })

  const canvas = new OffscreenCanvas(cropped.width, cropped.height)
  canvas.getContext('2d')!.putImageData(cropped, 0, 0)
  const png = await canvas.convertToBlob({ type: 'image/png' })
  post({ type: 'done', image: png, width: cropped.width, height: cropped.height, device: loaded.device })
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === 'remove') void removeBackground(event.data.image)
}
