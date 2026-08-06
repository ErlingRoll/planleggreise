import { useEffect, useMemo, useState } from 'react'
import { getTrips, type Trip } from './api'

function App() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTrips = () => {
    setIsLoading(true)
    setError(null)

    getTrips()
      .then(setTrips)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Unable to load trips')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return trips
    }

    return trips.filter((trip) =>
      `${trip.name} ${trip.destination}`.toLowerCase().includes(query),
    )
  }, [search, trips])

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1ea] text-[#27302f]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <a className="flex items-center gap-3 font-semibold tracking-tight" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-[#274b48] text-lg text-[#f9f5ed]">✦</span>
          <span>roamly</span>
        </a>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#69726c] md:flex">
          <a className="text-[#27302f]" href="#trips">My trips</a>
          <a href="#inspiration">Inspiration</a>
          <a href="#about">How it works</a>
        </div>
        <button className="rounded-full border border-[#d9d4ca] bg-[#faf8f3] px-4 py-2 text-sm font-semibold transition hover:border-[#274b48]">
          Your profile
        </button>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pt-20">
        <div>
          <p className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#d06f4c]">
            <span className="h-px w-8 bg-[#d06f4c]" /> Your next chapter
          </p>
          <h1 className="max-w-2xl text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-[#274b48] sm:text-7xl">
            Make room for <span className="font-serif italic text-[#d06f4c]">wonder.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#69726c]">
            One calm place to collect ideas, shape an itinerary, and remember the little details that make a trip yours.
          </p>
          <div className="mt-9 flex flex-col gap-3 rounded-2xl border border-[#e1dbd0] bg-[#faf8f3] p-2 shadow-[0_14px_40px_rgba(39,75,72,0.08)] sm:flex-row">
            <label className="flex flex-1 items-center gap-3 px-4">
              <span className="text-xl text-[#d06f4c]" aria-hidden="true">⌕</span>
              <span className="sr-only">Search trips</span>
              <input
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#9da39b]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your trips or destinations"
                value={search}
              />
            </label>
            <button className="rounded-xl bg-[#274b48] px-6 py-3 text-sm font-semibold text-[#f9f5ed] transition hover:bg-[#1c3b38]">
              Plan a new trip <span className="ml-2">↗</span>
            </button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:justify-self-end">
          <div className="absolute -right-5 -top-5 size-28 rounded-full bg-[#e5b76b]/40 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-[#274b48] p-7 text-[#f9f5ed] shadow-[0_28px_70px_rgba(39,75,72,0.22)]">
            <div className="absolute -right-12 -top-14 size-48 rounded-full border border-[#b9d1be]/20" />
            <div className="absolute -bottom-24 -left-20 size-64 rounded-full border border-[#b9d1be]/20" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-[#b9d1be]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#d5e6d0]">2026</span>
                <span className="text-2xl" aria-hidden="true">✈</span>
              </div>
              <div className="mt-28">
                <p className="text-sm text-[#b9d1be]">Currently dreaming of</p>
                <h2 className="mt-2 text-4xl font-medium tracking-tight">Anywhere<br /><span className="font-serif italic text-[#e5b76b]">beautiful.</span></h2>
              </div>
              <div className="mt-10 flex items-end justify-between border-t border-[#b9d1be]/20 pt-4 text-xs text-[#b9d1be]">
                <span>Take the scenic route</span>
                <span>✦ ✦ ✦</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e1dbd0] bg-[#faf8f3]" id="trips">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d06f4c]">Your collection</p>
              <h2 className="mt-2 text-3xl font-medium tracking-tight text-[#274b48]">Trips worth looking forward to</h2>
            </div>
            <span className="text-sm text-[#69726c]">{trips.length} saved journeys</span>
          </div>

          {error ? (
            <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[#e7b5a3] bg-[#fff6f1] p-5 text-sm text-[#9b4e36]">
              <span>{error}</span>
              <button className="font-semibold underline" onClick={loadTrips}>Try again</button>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div className="h-56 animate-pulse rounded-2xl bg-[#eee8dd]" key={index} />
                  ))
                : filteredTrips.map((trip) => (
                    <article className="group rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-5 transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(39,75,72,0.08)]" key={trip.id}>
                      <div className={`flex h-32 items-end rounded-xl p-4 ${trip.accent === 'aurora' ? 'bg-[#8ca99d]' : trip.accent === 'saffron' ? 'bg-[#e5b76b]' : 'bg-[#d78267]'}`}>
                        <span className="rounded-full bg-[#27302f]/15 px-3 py-1 text-xs font-semibold text-[#27302f]">{trip.destination}</span>
                      </div>
                      <div className="mt-5 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#274b48]">{trip.name}</h3>
                          <p className="mt-2 text-sm text-[#69726c]">{trip.dateRange} · {trip.duration}</p>
                        </div>
                        <span className="text-xl text-[#d06f4c] transition group-hover:translate-x-1" aria-hidden="true">↗</span>
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#69726c]">{trip.status}</p>
                    </article>
                  ))}
            </div>
          )}
          {!isLoading && !error && filteredTrips.length === 0 && (
            <p className="mt-8 rounded-2xl border border-dashed border-[#c9c1b5] p-8 text-center text-sm text-[#69726c]">No trips match that search yet.</p>
          )}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-[#69726c] sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span className="font-semibold text-[#274b48]">roamly</span>
        <span>Built for the journeys between the places.</span>
      </footer>
    </main>
  )
}

export default App
