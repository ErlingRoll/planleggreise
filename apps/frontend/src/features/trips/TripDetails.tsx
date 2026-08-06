import type { TripDetail } from '../../api'
import { formatDate, formatDateRange } from '../../lib/date-format'

type TripDetailsProps = {
  trip: TripDetail | null
  isLoading: boolean
  error: string | null
}

export function TripDetails({ trip, isLoading, error }: TripDetailsProps) {
  if (isLoading) {
    return <div className="mt-6 h-48 animate-pulse rounded-2xl bg-[#eee8dd]" />
  }

  if (error) {
    return <p className="mt-6 text-sm text-[#9b4e36]">{error}</p>
  }

  if (!trip) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-[#c9c1b5] p-6 text-sm text-[#69726c]">
        Velg en reise for å se dagene.
      </p>
    )
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl bg-[#274b48] p-5 text-[#f9f5ed]">
        <p className="text-sm text-[#b9d1be]">{formatDateRange(trip)}</p>
        <h3 className="mt-2 text-2xl font-medium">{trip.name}</h3>
        <p className="mt-2 text-sm text-[#b9d1be]">
          {trip.days.length} {trip.days.length === 1 ? 'dag' : 'dager'} å fylle
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        {trip.days.map((day) => (
          <div
            className="flex items-center gap-4 rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-4"
            key={day.date}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e5b76b]/50 text-sm font-semibold text-[#274b48]">
              {day.dayNumber}
            </span>
            <div>
              <p className="font-semibold text-[#274b48]">{formatDate(day.date)}</p>
              <p className="mt-1 text-sm text-[#69726c]">Ingen planer ennå</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
