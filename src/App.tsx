import type { ModelViewerElement } from '@google/model-viewer'
import { useRef, useState } from 'react'
import { ArButton } from './components/ArButton'
import { ModelViewer, type ArAvailability, type ArStatus } from './components/ModelViewer'
import { sampleChair } from './furniture'

export default function App() {
  const viewerRef = useRef<ModelViewerElement>(null)
  const [arAvailability, setArAvailability] = useState<ArAvailability>('checking')
  const [arStatus, setArStatus] = useState<ArStatus | null>(null)

  const activateAr = () => {
    setArStatus(null)
    // Kutsutaan suoraan käyttäjän painalluksesta: Quick Look ja Scene Viewer vaativat sen.
    viewerRef.current?.activateAR().catch(() => setArStatus('failed'))
  }

  return (
    <div className="min-h-svh bg-paper font-sans text-ink antialiased">
      <header className="mx-auto flex max-w-5xl items-center px-5 pt-6 pb-4 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">Realitin AR</span>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 pb-16 sm:px-8">
        <ModelViewer
          model={sampleChair}
          viewerRef={viewerRef}
          onArAvailabilityChange={setArAvailability}
          onArStatusChange={setArStatus}
        />

        <section className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{sampleChair.name}</h1>
            <p className="text-lg text-muted">Pyöritä ja tarkastele huonekalua.</p>
          </div>

          <ArButton availability={arAvailability} status={arStatus} onActivate={activateAr} />
        </section>
      </main>
    </div>
  )
}
