import type { FurnitureModel } from '../furniture'

const formatCm = (value: number) => Math.round(value).toString()

const scaleNotes: Record<FurnitureModel['scale'], string> = {
  'width-verified': 'Leveys vastaa valmistajan ilmoittamaa. Korkeutta ja syvyyttä ei ole vahvistettu.',
  unverified: 'Mitat ovat 3D-mallin mukaiset. Todellista kokoa ei ole vahvistettu.',
}

export function FurnitureDetails({ model }: { model: FurnitureModel }) {
  const { widthCm, heightCm, depthCm } = model.dimensions

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold tracking-tight">{model.name}</h1>
      <p className="text-lg text-ink">
        <span className="sr-only">Mitat: </span>
        L {formatCm(widthCm)} × K {formatCm(heightCm)} × S {formatCm(depthCm)} cm
      </p>
      <p className="text-sm text-muted">{scaleNotes[model.scale]}</p>
      <p className="mt-2 text-lg text-muted">Pyöritä ja tarkastele huonekalua.</p>
    </div>
  )
}
