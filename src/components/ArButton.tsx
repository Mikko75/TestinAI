import type { ArAvailability, ArStatus } from './ModelViewer'

type Props = {
  availability: ArAvailability
  status: ArStatus | null
  onActivate: () => void
}

const messages: Record<ArAvailability, string> = {
  checking: 'Tarkistetaan, tukeeko laitteesi AR-katselua…',
  available: 'Liikuta puhelinta ja sijoita huonekalu haluamaasi paikkaan.',
  unavailable:
    'Voit tarkastella huonekalua 3D-näkymässä. AR-katselu vaatii yhteensopivan puhelimen ja selaimen.',
  'model-error': 'AR-katselu on käytettävissä, kun 3D-malli on ladattu.',
}

export function ArButton({ availability, status, onActivate }: Props) {
  const failed = status === 'failed'

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onActivate}
        disabled={availability !== 'available'}
        aria-describedby="ar-help"
        className="min-h-14 w-full rounded-full bg-ink px-6 text-lg font-medium text-paper transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink active:bg-black disabled:cursor-not-allowed disabled:bg-line disabled:text-muted sm:w-auto sm:self-start sm:px-10"
      >
        Katso omassa tilassasi
      </button>

      <p id="ar-help" aria-live="polite" className="text-base leading-relaxed text-muted">
        {failed
          ? 'AR-näkymän avaaminen ei onnistunut. Voit jatkaa huonekalun tarkastelua 3D-näkymässä.'
          : messages[availability]}
      </p>
    </div>
  )
}
