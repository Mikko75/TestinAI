import { useEffect, useId, useState, type DragEvent } from 'react'
import {
  removeBackground,
  RemovalError,
  type PreparedImage,
  type RemovalProgress,
} from '../background-removal/removeBackground'
import { clearStage, markStage, takeInterruption } from '../background-removal/interruption'
import { ACCEPTED_TYPES, loadImage, type ImageValidation } from '../background-removal/validateImage'
import type { RemovalErrorCode } from '../background-removal/protocol'

type Selected = { file: File; image: Blob; url: string }
type Status =
  | { step: 'ready' }
  | { step: 'working'; progress: RemovalProgress | null }
  | { step: 'done'; result: PreparedImage; url: string }
  | { step: 'failed'; code: RemovalErrorCode }

const validationMessages: Record<Exclude<ImageValidation, { ok: true }>['reason'], string> = {
  type: 'Valitse PNG- tai JPEG-kuva.',
  size: 'Kuva on liian suuri. Suurin sallittu koko on 15 Mt.',
  decode: 'Kuvaa ei voitu avata. Kokeile toista kuvaa.',
  dimensions: 'Kuva on liian pieni. Lyhyemmän sivun on oltava vähintään 256 pikseliä.',
}

const removalMessages: Record<RemovalErrorCode, string> = {
  download: 'Taustanpoistomallin lataus epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.',
  decode: 'Kuvaa ei voitu avata. Kokeile toista kuvaa.',
  processing: 'Taustan poistaminen ei onnistunut tällä laitteella. Yritä uudelleen tai kokeile toista selainta.',
  empty:
    'Kuvasta ei löytynyt selvää huonekalua. Kokeile kuvaa, jossa huonekalu näkyy kokonaan ja tausta on selkeä.',
}

const megabytes = (bytes: number) => (bytes / 1e6).toFixed(0)

// Luetaan kerran sivun latautuessa (ei komponentissa, koska StrictMode ajaa alustuksen kahdesti).
const interruption = takeInterruption()
// Aika käsittelyn alusta sivun uudelleenlataukseen eli suunnilleen kaatumishetkeen.
const interruptedAfterSeconds = interruption ? Math.round((Date.now() - interruption.startedAt) / 1000) : 0
const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator

const primaryButton =
  'min-h-12 rounded-full bg-ink px-6 text-base font-medium text-paper transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-muted'
const secondaryButton =
  'inline-flex min-h-12 cursor-pointer items-center rounded-full border border-ink px-6 text-base font-medium text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export function RemoveBackgroundPage() {
  const inputId = useId()
  const [selected, setSelected] = useState<Selected | null>(null)
  const [status, setStatus] = useState<Status>({ step: 'ready' })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  // Vapautetaan esikatselujen object URL:t, kun kuva vaihtuu tai sivulta poistutaan.
  useEffect(() => {
    if (selected) return () => URL.revokeObjectURL(selected.url)
  }, [selected])
  const resultUrl = status.step === 'done' ? status.url : null
  useEffect(() => {
    if (resultUrl) return () => URL.revokeObjectURL(resultUrl)
  }, [resultUrl])

  const working = status.step === 'working'

  const chooseFile = async (file: File | undefined) => {
    if (!file || working) return
    const loaded = await loadImage(file)
    if (!loaded.ok) {
      setValidationError(validationMessages[loaded.reason])
      return
    }
    setValidationError(null)
    setStatus({ step: 'ready' })
    setSelected({ file, image: loaded.image, url: URL.createObjectURL(loaded.image) })
  }

  const start = async () => {
    if (!selected) return
    setStatus({ step: 'working', progress: null })
    const startedAt = Date.now()
    let lastStage = 'valmistelu'
    markStage(lastStage, startedAt)
    const onProgress = (progress: RemovalProgress) => {
      setStatus({ step: 'working', progress })
      const stage =
        progress.stage === 'processing'
          ? 'taustan poisto'
          : `mallin lataus ${Math.floor((progress.loaded / Math.max(progress.total, 1)) * 10) * 10} %`
      if (stage !== lastStage) markStage((lastStage = stage), startedAt)
    }
    try {
      const result = await removeBackground(selected.image, selected.file.name, onProgress)
      setStatus({ step: 'done', result, url: URL.createObjectURL(result.image) })
    } catch (error) {
      setStatus({ step: 'failed', code: error instanceof RemovalError ? error.code : 'processing' })
    } finally {
      clearStage()
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    void chooseFile(event.dataTransfer.files[0])
  }

  const downloadName = selected ? `${selected.file.name.replace(/\.[^.]+$/, '')}-tausta-poistettu.png` : ''

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 pb-16 sm:px-8">
      <section className="flex max-w-2xl flex-col gap-3 pt-2">
        <h1 className="text-3xl font-semibold tracking-tight">Poista kuvasta tausta</h1>
        <p className="text-lg text-muted">
          Valitse kuva huonekalusta. Parhaan tuloksen saat kuvalla, jossa on yksi huonekalu kokonaan näkyvissä ja tausta
          on selkeä.
        </p>
        <p className="text-sm text-muted">
          Tausta poistetaan laitteellasi, eikä kuvaa lähetetä minnekään. Ensimmäisellä kerralla ladataan noin 100 Mt:n
          taustanpoistomalli, joten wifi-yhteys on suositeltava.
        </p>
      </section>

      {interruption && (
        <div role="alert" className="flex max-w-2xl flex-col gap-2 rounded-2xl bg-stage px-5 py-4">
          <p className="text-base font-medium text-ink">
            Edellinen taustan poisto keskeytyi vaiheessa: {interruption.stage}.
          </p>
          <p className="text-base text-ink">
            Selain sulki sivun todennäköisesti siksi, että laitteen muisti loppui. Sulje muut välilehdet ja sovellukset ja
            yritä uudelleen.
          </p>
          <p className="text-sm text-muted">
            Tekninen tieto: keskeytyi {interruptedAfterSeconds} s aloituksen jälkeen, WebGPU{' '}
            {hasWebGpu ? 'käytettävissä' : 'ei käytettävissä'}.
          </p>
        </div>
      )}

      {/* Tiedostovalinta */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? 'border-ink bg-stage' : 'border-line'
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES}
          disabled={working}
          onChange={(event) => {
            void chooseFile(event.target.files?.[0])
            event.target.value = ''
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`${secondaryButton} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-50`}
        >
          {selected ? 'Valitse toinen kuva' : 'Valitse kuva'}
        </label>
        <p className="text-sm text-muted">PNG tai JPEG, enintään 15 Mt. Voit myös pudottaa kuvan tähän.</p>
        {validationError && (
          <p role="alert" className="text-base font-medium text-ink">
            {validationError}
          </p>
        )}
      </div>

      {selected && (
        <section className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <figure className="flex flex-col gap-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-stage">
                <img src={selected.url} alt="Valitsemasi kuva" className="max-h-full max-w-full object-contain" />
              </div>
              <figcaption className="text-sm text-muted">Alkuperäinen</figcaption>
            </figure>

            <figure className="flex flex-col gap-2">
              <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-2xl">
                {status.step === 'done' ? (
                  <img
                    src={status.url}
                    alt="Huonekalu ilman taustaa"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="px-6 text-center text-base text-muted">
                    {status.step === 'working' ? (
                      <ProgressText progress={status.progress} />
                    ) : status.step === 'failed' ? (
                      'Ei tulosta.'
                    ) : (
                      'Tulos näkyy tässä.'
                    )}
                  </span>
                )}
              </div>
              <figcaption className="text-sm text-muted">Tausta poistettu</figcaption>
            </figure>
          </div>

          <div role="status" className="sr-only">
            {status.step === 'working' && <ProgressText progress={status.progress} />}
            {status.step === 'done' && 'Tausta poistettu.'}
          </div>

          {status.step === 'failed' && (
            <p role="alert" className="max-w-2xl text-base font-medium text-ink">
              {removalMessages[status.code]}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {status.step === 'done' ? (
              <a href={status.url} download={downloadName} className={primaryButton + ' inline-flex items-center'}>
                Lataa PNG-kuva
              </a>
            ) : status.step === 'failed' && (status.code === 'empty' || status.code === 'decode') ? null : (
              <button type="button" onClick={start} disabled={working} className={primaryButton}>
                {status.step === 'failed' ? 'Yritä uudelleen' : 'Poista tausta'}
              </button>
            )}
            {status.step === 'done' && (
              <span className="text-sm text-muted">
                {status.result.width} × {status.result.height} px, läpinäkyvä tausta
              </span>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

function ProgressText({ progress }: { progress: RemovalProgress | null }) {
  if (progress?.stage === 'download' && progress.total > 0) {
    const percent = Math.round((progress.loaded / progress.total) * 100)
    return (
      <>
        Ladataan taustanpoistomallia… {percent} % ({megabytes(progress.loaded)} / {megabytes(progress.total)} Mt)
      </>
    )
  }
  if (progress?.stage === 'processing') return <>Poistetaan taustaa…</>
  return <>Valmistellaan…</>
}
