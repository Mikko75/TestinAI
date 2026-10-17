// Rakentaa parametrisen mallin GLB-tiedostoksi ja tulostaa sen mitat.
// Ajo: node scripts/build-parametric.ts <tiedosto.glb>

import { NodeIO } from '@gltf-transform/core'
import { center, dedup, getBounds, prune, textureCompress, weld } from '@gltf-transform/functions'
import sharp from 'sharp'
import { buildReclinerSofa, defaultReclinerSofa } from '../server/parametric/recliner-sofa.ts'

const out = process.argv[2] ?? 'recliner-sofa.glb'
const document = await buildReclinerSofa(defaultReclinerSofa)
await document.transform(
  center({ pivot: 'below' }),
  weld(),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 90 }),
)
await new NodeIO().write(out, document)

const { min, max } = getBounds(document.getRoot().getDefaultScene()!)
const cm = (m: number) => Math.round(m * 1000) / 10
console.log(`${out}: ${cm(max[0] - min[0])} × ${cm(max[1] - min[1])} × ${cm(max[2] - min[2])} cm (L × K × S)`)
