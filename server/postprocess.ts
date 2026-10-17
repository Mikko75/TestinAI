// Generoidun mallin jälkikäsittely ja automaattinen tarkistus ennen julkaisua.

import { NodeIO, type Document } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { center, dedup, getBounds, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'

export type Dimensions = { widthCm: number; heightCm: number; depthCm: number }

export type Warning =
  | { code: 'dimension_mismatch'; axis: 'width' | 'height' | 'depth'; modelCm: number; expectedCm: number }
  | { code: 'estimated_size' }

export type PostprocessResult = {
  glb: Uint8Array
  dimensions: Dimensions
  /** Kerroin, jolla malli skaalattiin annettuihin mittoihin; null, jos mittoja ei annettu. */
  scale: number | null
  warnings: Warning[]
}

export class QualityError extends Error {}

/** Suurin sallittu ero mittasuhteissa skaalauksen jälkeen. */
const PROPORTION_TOLERANCE = 0.15
const MAX_TRIANGLES = 500_000

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

function measure(document: Document): Dimensions {
  const { min, max } = getBounds(document.getRoot().getDefaultScene()!)
  const cm = (m: number) => Math.round(m * 1000) / 10
  return { widthCm: cm(max[0] - min[0]), heightCm: cm(max[1] - min[1]), depthCm: cm(max[2] - min[2]) }
}

function countTriangles(document: Document): number {
  let triangles = 0
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices()
      const count = indices ? indices.getCount() : (primitive.getAttribute('POSITION')?.getCount() ?? 0)
      triangles += count / 3
    }
  }
  return triangles
}

/** Kääri kohtauksen juurisolmut uuteen solmuun, jolla on annettu muunnos. */
function wrapScene(document: Document, transform: { rotationY?: number; scale?: number }) {
  const scene = document.getRoot().getDefaultScene()!
  const wrapper = document.createNode('realitin-transform')
  if (transform.rotationY) {
    const half = (transform.rotationY * Math.PI) / 360
    wrapper.setRotation([0, Math.sin(half), 0, Math.cos(half)])
  }
  if (transform.scale) wrapper.setScale([transform.scale, transform.scale, transform.scale])
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    wrapper.addChild(child)
  }
  scene.addChild(wrapper)
}

export async function postprocess(
  input: Uint8Array,
  options: { expected: Dimensions | null; frontRotationDeg: number },
): Promise<PostprocessResult> {
  let document: Document
  try {
    document = await io.readBinary(input)
  } catch (error) {
    throw new QualityError(`Malli ei ole kelvollinen GLB: ${String(error)}`)
  }
  const warnings: Warning[] = []

  const triangles = countTriangles(document)
  if (triangles === 0) throw new QualityError('Mallissa ei ole geometriaa')
  if (triangles > MAX_TRIANGLES) throw new QualityError(`Mallissa on liikaa kolmioita (${triangles})`)

  if (options.frontRotationDeg) wrapScene(document, { rotationY: options.frontRotationDeg })

  let scale: number | null = null
  const before = measure(document)
  if (Math.min(before.widthCm, before.heightCm, before.depthCm) <= 0) throw new QualityError('Mallin koko on nolla')

  if (options.expected) {
    // Yhtenäinen skaalaus: mediaani akselikohtaisista suhteista, jotta yksi poikkeava akseli ei ratkaise.
    const ratios = (['widthCm', 'heightCm', 'depthCm'] as const)
      .map((key) => options.expected![key] / before[key])
      .sort((a, b) => a - b)
    scale = ratios[1]
    wrapScene(document, { scale })
  }

  await document.transform(
    center({ pivot: 'below' }),
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 90, resize: [1024, 1024] }),
  )

  const dimensions = measure(document)
  if (options.expected) {
    for (const key of ['widthCm', 'heightCm', 'depthCm'] as const) {
      const deviation = Math.abs(dimensions[key] - options.expected[key]) / options.expected[key]
      if (deviation > PROPORTION_TOLERANCE) {
        const axis = key === 'widthCm' ? 'width' : key === 'heightCm' ? 'height' : 'depth'
        warnings.push({ code: 'dimension_mismatch', axis, modelCm: dimensions[key], expectedCm: options.expected[key] })
      }
    }
  } else {
    warnings.push({ code: 'estimated_size' })
  }

  return { glb: await io.writeBinary(document), dimensions, scale, warnings }
}
