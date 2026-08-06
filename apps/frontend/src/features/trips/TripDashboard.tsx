import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getTrip,
  getTrips,
  type Trip,
  type TripDetail,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { formatDateRange } from '../../lib/date-format'
import { getSupabaseClient } from '../../lib/supabase'
import { TripDetails } from './TripDetails'
import { TripForm } from './TripForm'

type TripDashboardProps = {
  session: Session
}

export function TripDashboard({ session }: TripDashboardProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getTrips(session.access_token)
      .then((loadedTrips) => {
        if (!isMounted) {
          return
        }
        setTrips(loadedTrips)
        setSelectedTripId(loadedTrips[0]?.id ?? null)
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(reason))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [session.access_token])

  useEffect(() => {
    if (!selectedTripId) {
      setSelectedTrip(null)
      return
    }

    let isMounted = true
    setIsDetailsLoading(true)
    setDetailsError(null)

    getTrip(session.access_token, selectedTripId)
      .then((trip) => {
        if (isMounted) {
          setSelectedTrip(trip)
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setDetailsError(getErrorMessage(reason))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsDetailsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedTripId, session.access_token])

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return trips.filter((trip) => trip.name.toLowerCase().includes(query))
  }, [search, trips])

  async function signOut() {
    await getSupabaseClient().auth.signOut()
  }

  function handleCreated(trip: Trip) {
    setTrips((currentTrips) => [trip, ...currentTrips])
    setSelectedTripId(trip.id)
    setIsCreating(false)
  }

  return (
    <main className="min-h-screen bg-[#f5f1ea] text-[#27302f]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a className="flex items-center gap-3 font-semibold tracking-tight text-[#274b48]" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-[#274b48] text-lg text-[#f9f5ed]">✦</span>
          <span>planleggreise</span>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-48 truncate text-sm text-[#69726c] sm:block">
            {session.user.email}
          </span>
          <button
            className="rounded-full border border-[#d9d4ca] bg-[#faf8f3] px-4 py-2 text-sm font-semibold transition hover:border-[#274b48]"
            onClick={() => void signOut()}
            type="button"
          >
            Logg ut
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d06f4c]">Mine reiser</p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-medium tracking-[-0.05em] text-[#274b48] sm:text-5xl">
              Hva skal vi planlegge?
            </h1>
            <p className="mt-4 max-w-lg leading-7 text-[#69726c]">
              Start med datoene. Fyll resten inn når du vet mer.
            </p>
          </div>
          <button
            className="rounded-xl bg-[#274b48] px-5 py-3 font-semibold text-[#f9f5ed] transition hover:bg-[#1c3b38]"
            onClick={() => setIsCreating((current) => !current)}
            type="button"
          >
            {isCreating ? 'Lukk' : '+ Ny reise'}
          </button>
        </div>

        {isCreating && (
          <TripForm
            accessToken={session.access_token}
            onCancel={() => setIsCreating(false)}
            onCreated={handleCreated}
          />
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-[#e7b5a3] bg-[#fff6f1] p-5 text-sm text-[#9b4e36]">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[#274b48]">Reiseoversikt</h2>
              <label className="sr-only" htmlFor="trip-search">Søk i reiser</label>
              <input
                className="w-40 rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2 text-sm outline-none focus:border-[#274b48]"
                id="trip-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Søk"
                value={search}
              />
            </div>
            {isLoading ? (
              <div className="mt-5 grid gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div className="h-24 animate-pulse rounded-2xl bg-[#eee8dd]" key={index} />
                ))}
              </div>
            ) : filteredTrips.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {filteredTrips.map((trip) => (
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedTripId === trip.id
                        ? 'border-[#274b48] bg-[#f0f5ed]'
                        : 'border-[#e1dbd0] bg-[#faf8f3] hover:border-[#b9d1be]'
                    }`}
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    type="button"
                  >
                    <p className="font-semibold text-[#274b48]">{trip.name}</p>
                    <p className="mt-2 text-sm text-[#69726c]">{formatDateRange(trip)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-[#c9c1b5] p-6 text-sm text-[#69726c]">
                Du har ingen reiser ennå.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#274b48]">Planen din</h2>
            <TripDetails
              error={detailsError}
              isLoading={isDetailsLoading}
              trip={selectedTrip}
            />
          </section>
        </div>
      </section>
    </main>
  )
}
