import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  deleteTrip,
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
import { TravelMode } from './TravelMode'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

type TripDashboardProps = {
  session: Session
}

export function TripDashboard({ session }: TripDashboardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { tripId } = useParams<{ tripId: string }>()
  const isTravelMode = location.pathname.endsWith('/travel')
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null)
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
    if (!tripId) {
      setSelectedTrip(null)
      setDetailsError(null)
      return
    }

    let isMounted = true
    setIsDetailsLoading(true)
    setDetailsError(null)

    getTrip(session.access_token, tripId)
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
  }, [tripId, session.access_token])

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return trips.filter((trip) => trip.name.toLowerCase().includes(query))
  }, [search, trips])

  async function signOut() {
    await getSupabaseClient().auth.signOut()
  }

  function handleCreated(trip: Trip) {
    setTrips((currentTrips) => [trip, ...currentTrips])
    navigate(`/trips/${trip.id}`)
    setIsCreating(false)
  }

  function handleTripUpdated(updatedTrip: TripDetail) {
    setSelectedTrip(updatedTrip)
    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === updatedTrip.id
          ? {
              id: updatedTrip.id,
              name: updatedTrip.name,
              startDate: updatedTrip.startDate,
              endDate: updatedTrip.endDate,
              notes: updatedTrip.notes,
            }
          : trip,
      ),
    )
  }

  function goBackToOverview() {
    navigate('/', { replace: true })
  }

  async function handleDeleteTrip(trip: TripDetail) {
    setError(null)

    try {
      await deleteTrip(session.access_token, trip.id)
      const remainingTrips = trips.filter(
        (currentTrip) => currentTrip.id !== trip.id,
      )
      setTrips(remainingTrips)

      if (tripId === trip.id) {
        setSelectedTrip(null)
        navigate('/', { replace: true })
      }
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f1ea] text-[#27302f]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link className="flex items-center gap-3 font-semibold tracking-tight text-[#274b48]" to="/">
          <span className="grid size-9 place-items-center rounded-xl bg-[#274b48] text-lg text-[#f9f5ed]">✦</span>
          <span>Planleggreise</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="hidden max-w-48 truncate text-sm text-[#69726c] sm:block">{session.user.email}</span>
          <button
            className="rounded-full border border-[#d9d4ca] bg-[#faf8f3] px-4 py-2 text-sm font-semibold transition hover:border-[#274b48]"
            onClick={() => void signOut()}
            type="button"
          >
            {t('dashboard.logOut')}
          </button>
        </div>
      </nav>

      {tripId ? (
        <section
          className={`mx-auto ${
            isTravelMode ? 'max-w-2xl' : 'max-w-7xl'
          } px-5 pb-12 pt-6 sm:px-8 sm:pt-10`}
        >
          <button
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-[#69726c] transition hover:bg-[#e6eee3] hover:text-[#274b48]"
            onClick={goBackToOverview}
            type="button"
          >
            <span aria-hidden="true">←</span>
            {t('dashboard.backToTrips')}
          </button>
          <h1 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-[#274b48]">
            {isTravelMode ? t('travelMode.title') : t('dashboard.plan')}
          </h1>
          <nav
            aria-label={t('tripModes.plan')}
            className="mt-5 grid grid-cols-2 rounded-xl bg-[#e6eee3] p-1"
          >
            <Link
              className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                !isTravelMode
                  ? 'bg-[#faf8f3] text-[#274b48] shadow-sm'
                  : 'text-[#69726c]'
              }`}
              to={`/trips/${tripId}`}
            >
              {t('tripModes.plan')}
            </Link>
            <Link
              className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                isTravelMode
                  ? 'bg-[#faf8f3] text-[#274b48] shadow-sm'
                  : 'text-[#69726c]'
              }`}
              to={`/trips/${tripId}/travel`}
            >
              {t('tripModes.travel')}
            </Link>
          </nav>
          {isTravelMode && selectedTrip ? (
            <TravelMode trip={selectedTrip} />
          ) : (
            <TripDetails
              accessToken={session.access_token}
              error={detailsError}
              isLoading={isDetailsLoading}
              onTripDeleted={handleDeleteTrip}
              onTripUpdated={handleTripUpdated}
              trip={selectedTrip}
            />
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-2xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d06f4c]">{t('dashboard.myTrips')}</p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-4xl font-medium tracking-[-0.05em] text-[#274b48] sm:text-5xl">
                {t('dashboard.heading')}
              </h1>
              <p className="mt-4 max-w-lg leading-7 text-[#69726c]">
                {t('dashboard.intro')}
              </p>
            </div>
            <button
              className="rounded-xl bg-[#274b48] px-5 py-3 font-semibold text-[#f9f5ed] transition hover:bg-[#1c3b38]"
              onClick={() => setIsCreating((current) => !current)}
              type="button"
            >
              {isCreating ? t('dashboard.closeNewTrip') : t('dashboard.newTrip')}
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

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[#274b48]">{t('dashboard.tripOverview')}</h2>
              <label className="sr-only" htmlFor="trip-search">{t('dashboard.searchTrips')}</label>
              <input
                className="w-40 rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2 text-sm outline-none focus:border-[#274b48]"
                id="trip-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('dashboard.search')}
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
                    className="w-full rounded-2xl border border-[#e1dbd0] bg-[#faf8f3] p-4 text-left transition hover:border-[#274b48] hover:bg-[#f0f5ed]"
                    key={trip.id}
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    type="button"
                  >
                    <p className="font-semibold text-[#274b48]">{trip.name}</p>
                    <p className="mt-2 text-sm text-[#69726c]">{formatDateRange(trip)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-[#c9c1b5] p-6 text-sm text-[#69726c]">
                {t('dashboard.noTrips')}
              </p>
            )}
          </section>
        </section>
      )}
    </main>
  )
}
