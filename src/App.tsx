import { useEffect, useState } from 'react'
import { ModelsPage } from './pages/ModelsPage'
import { RemoveBackgroundPage } from './pages/RemoveBackgroundPage'

const pages = [
  { hash: '#/', label: '3D-mallit' },
  { hash: '#/oma-kuva', label: 'Oma kuva' },
] as const

const currentHash = () => (window.location.hash === '#/oma-kuva' ? '#/oma-kuva' : '#/')

export default function App() {
  const [hash, setHash] = useState(currentHash)

  useEffect(() => {
    const onHashChange = () => setHash(currentHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="min-h-svh bg-paper font-sans text-ink antialiased">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 pt-6 pb-4 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">Realitin AR</span>
        <nav aria-label="Päävalikko" className="flex gap-1">
          {pages.map((page) => (
            <a
              key={page.hash}
              href={page.hash}
              aria-current={hash === page.hash ? 'page' : undefined}
              className="rounded-full px-4 py-2 text-base text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-[current=page]:bg-stage aria-[current=page]:text-ink"
            >
              {page.label}
            </a>
          ))}
        </nav>
      </header>

      {hash === '#/oma-kuva' ? <RemoveBackgroundPage /> : <ModelsPage />}
    </div>
  )
}
