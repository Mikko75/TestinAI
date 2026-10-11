// Tarkistaa, että src/furniture.ts:n mitat vastaavat GLB-tiedostoja ja että mallit on kohdistettu
// AR-sijoitusta varten: pohja tasolla y = 0 ja origo keskellä vaakasuunnassa.
// Ajo: npm run models:check

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { getBounds } from '@gltf-transform/functions'
import { furniture } from '../src/furniture.ts'

const TOLERANCE_CM = 0.5
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
let failures = 0

const check = (ok: boolean, message: string) => {
  console.log(`  ${ok ? 'OK  ' : 'VIKA'} ${message}`)
  if (!ok) failures++
}
const cm = (m: number) => Math.round(m * 1000) / 10

for (const model of furniture) {
  const document = await io.read(`public/models/${model.file}`)
  const { min, max } = getBounds(document.getRoot().getDefaultScene()!)
  const measured = { widthCm: cm(max[0] - min[0]), heightCm: cm(max[1] - min[1]), depthCm: cm(max[2] - min[2]) }

  console.log(`${model.name} (${model.file})`)
  for (const key of ['widthCm', 'heightCm', 'depthCm'] as const) {
    check(
      Math.abs(measured[key] - model.dimensions[key]) <= TOLERANCE_CM,
      `${key}: tiedosto ${measured[key]} cm, furniture.ts ${model.dimensions[key]} cm`,
    )
  }
  check(Math.abs(cm(min[1])) <= TOLERANCE_CM, `pohja lattiatasolla: y = ${cm(min[1])} cm`)
  check(
    Math.abs(cm(min[0] + max[0])) <= TOLERANCE_CM && Math.abs(cm(min[2] + max[2])) <= TOLERANCE_CM,
    `origo keskellä: x ${cm((min[0] + max[0]) / 2)} cm, z ${cm((min[2] + max[2]) / 2)} cm`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} tarkistusta epäonnistui.`)
  process.exit(1)
}
console.log('\nKaikki mallit kunnossa.')
