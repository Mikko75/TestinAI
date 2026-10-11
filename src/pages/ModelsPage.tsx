import type { ModelViewerElement } from '@google/model-viewer'
import { useRef, useState } from 'react'
import { ArButton } from '../components/ArButton'
import { FurnitureDetails } from '../components/FurnitureDetails'
import { FurniturePicker } from '../components/FurniturePicker'
import { ModelViewer, type ArAvailability, type ArStatus } from '../components/ModelViewer'
import { furniture } from '../furniture'

export function ModelsPage() {
  const viewerRef = useRef<ModelViewerElement>(null)
  const [modelId, setModelId] = useState(furniture[0].id)
  const [arAvailability, setArAvailability] = useState<ArAvailability>('checking')
  const [arStatus, setArStatus] = useState<ArStatus | null>(null)
  const model = furniture.find((item) => item.id === modelId) ?? furniture[0]

  const selectModel = (id: string) => {
    setModelId(id)
    setArAvailability('checking')
    setArStatus(null)
  }

  const activateAr = () => {
    setArStatus(null)
    // Kutsutaan suoraan käyttäjän painalluksesta: Quick Look ja Scene Viewer vaativat sen.
    viewerRef.current?.activateAR().catch(() => setArStatus('failed'))
  }

  return (
    <>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 pb-12 sm:px-8">
        <FurniturePicker options={furniture} selectedId={model.id} onSelect={selectModel} />

        {/* Avain luo katselukomponentin uudelleen, jolloin lataus- ja virhetila alkavat alusta. */}
        <ModelViewer
          key={model.id}
          model={model}
          viewerRef={viewerRef}
          onArAvailabilityChange={setArAvailability}
          onArStatusChange={setArStatus}
        />

        <section className="mt-2 flex max-w-xl flex-col gap-6">
          <FurnitureDetails model={model} />
          <ArButton availability={arAvailability} status={arStatus} onActivate={activateAr} />
        </section>
      </main>

      <footer className="mx-auto max-w-5xl border-t border-line px-5 py-6 text-sm text-muted sm:px-8">
        3D-malli: {model.credit.text},{' '}
        <a href={model.credit.licenceUrl} className="underline underline-offset-2 hover:text-ink">
          {model.credit.licence}
        </a>{' '}
        (
        <a href={model.credit.sourceUrl} className="underline underline-offset-2 hover:text-ink">
          lähde
        </a>
        )
      </footer>
    </>
  )
}
