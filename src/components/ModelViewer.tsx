import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { useEffect, useState, type RefObject } from 'react'
import type { FurnitureModel } from '../furniture'

export type ArAvailability = 'checking' | 'available' | 'unavailable' | 'model-error'
export type ArStatus = 'not-presenting' | 'session-started' | 'object-placed' | 'failed'
type LoadState = 'loading' | 'loaded' | 'error'

type Props = {
  model: FurnitureModel
  viewerRef: RefObject<ModelViewerElement | null>
  onArAvailabilityChange: (availability: ArAvailability) => void
  onArStatusChange: (status: ArStatus) => void
}

export function ModelViewer({ model, viewerRef, onArAvailabilityChange, onArStatusChange }: Props) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [progress, setProgress] = useState(0)
  const [attempt, setAttempt] = useState(0)
  // model-viewer pitää myös epäonnistuneen latauksen välimuistissa URL:n perusteella,
  // joten uusi yritys tarvitsee eri URL:n.
  const src = attempt === 0 ? model.src : `${model.src}?yritys=${attempt}`

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    // model-viewer valitsee AR-tilan (webxr / scene-viewer / quick-look) laitteen tuen mukaan.
    // canActivateAR kertoo, löytyikö jokin tuettu tila.
    const reportArAvailability = () =>
      onArAvailabilityChange(viewer.canActivateAR ? 'available' : 'unavailable')

    const handleProgress = (event: Event) => {
      setProgress((event as CustomEvent<{ totalProgress: number }>).detail.totalProgress)
    }
    const handleLoad = () => {
      setLoadState('loaded')
      reportArAvailability()
    }
    const handleError = (event: Event) => {
      if ((event as CustomEvent<{ type: string }>).detail?.type !== 'loadfailure') return
      setLoadState('error')
      onArAvailabilityChange('model-error')
    }
    const handleArStatus = (event: Event) => {
      const { status } = (event as CustomEvent<{ status: ArStatus }>).detail
      onArStatusChange(status)
      if (status === 'failed') reportArAvailability()
    }

    viewer.addEventListener('progress', handleProgress)
    viewer.addEventListener('load', handleLoad)
    viewer.addEventListener('error', handleError)
    viewer.addEventListener('ar-status', handleArStatus)
    return () => {
      viewer.removeEventListener('progress', handleProgress)
      viewer.removeEventListener('load', handleLoad)
      viewer.removeEventListener('error', handleError)
      viewer.removeEventListener('ar-status', handleArStatus)
    }
  }, [viewerRef, onArAvailabilityChange, onArStatusChange])

  const retry = () => {
    setLoadState('loading')
    setProgress(0)
    onArAvailabilityChange('checking')
    setAttempt((n) => n + 1)
  }

  return (
    <div className="relative">
      <model-viewer
        ref={viewerRef}
        src={src}
        alt={model.alt}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-placement="floor"
        ar-scale="fixed"
        camera-controls
        touch-action="pan-y"
        interaction-prompt="none"
        shadow-intensity="1"
        loading="eager"
        className="block h-[62svh] min-h-80 max-h-[44rem] w-full rounded-2xl bg-stage focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      />

      {loadState === 'loading' && (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted"
        >
          <span className="text-base">Ladataan 3D-mallia…</span>
          <span className="h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span
              className="block h-full bg-ink transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
        </div>
      )}

      {loadState === 'error' && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-stage px-6 text-center"
        >
          <p className="max-w-xs text-base text-ink">
            3D-mallia ei voitu ladata. Tarkista verkkoyhteys ja yritä uudelleen.
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-12 rounded-full border border-ink px-6 text-base font-medium text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Yritä uudelleen
          </button>
        </div>
      )}
    </div>
  )
}
