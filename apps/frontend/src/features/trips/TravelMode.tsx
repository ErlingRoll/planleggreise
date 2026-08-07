import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TripDetail } from '../../api'
import {
  formatActivityTime,
  getDayItemTitle,
  sortActivities,
} from '../../lib/activity-format'
import { formatDate } from '../../lib/date-format'

type TravelModeProps = {
  trip: TripDetail
}

function getTodayDate() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

function getRelevantDayIndex(days: TripDetail['days']) {
  const today = getTodayDate()
  const todayIndex = days.findIndex((day) => day.date === today)

  if (todayIndex >= 0) {
    return todayIndex
  }

  const nextDayIndex = days.findIndex((day) => day.date > today)
  return nextDayIndex >= 0 ? nextDayIndex : days.length - 1
}

export function TravelMode({ trip }: TravelModeProps) {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState(
    () => trip.days[getRelevantDayIndex(trip.days)]?.date ?? '',
  )

  useEffect(() => {
    setSelectedDate(trip.days[getRelevantDayIndex(trip.days)]?.date ?? '')
  }, [trip.id, trip.days])

  const selectedDayIndex = useMemo(() => {
    const selectedIndex = trip.days.findIndex((day) => day.date === selectedDate)
    return selectedIndex >= 0
      ? selectedIndex
      : getRelevantDayIndex(trip.days)
  }, [selectedDate, trip.days])
  const selectedDay = trip.days[selectedDayIndex]
  const today = getTodayDate()
  const isToday = selectedDay.date === today
  const isBeforeTrip = today < trip.startDate
  const isAfterTrip = today > trip.endDate
  const housingForDay = trip.housingStays.filter(
    (stay) =>
      stay.checkIn <= selectedDay.date && selectedDay.date < stay.checkOut,
  )
  const mealsForDay = trip.meals.filter(
    (meal) => meal.tripDate === selectedDay.date,
  )

  function moveDay(offset: number) {
    const nextDay = trip.days[selectedDayIndex + offset]

    if (nextDay) {
      setSelectedDate(nextDay.date)
    }
  }

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-[#b9d1be] bg-[#f0f5ed] p-5">
        <p className="text-sm text-[#69726c]">{t('travelMode.subtitle')}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            aria-label={t('travelMode.previousDay')}
            className="grid size-11 place-items-center rounded-xl text-2xl text-[#274b48] transition hover:bg-[#e6eee3] disabled:cursor-not-allowed disabled:opacity-30"
            disabled={selectedDayIndex === 0}
            onClick={() => moveDay(-1)}
            type="button"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d06f4c]">
              {isToday
                ? t('travelMode.today')
                : t('travelMode.day', { day: selectedDay.dayNumber })}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#274b48]">
              {formatDate(selectedDay.date)}
            </h2>
          </div>
          <button
            aria-label={t('travelMode.nextDay')}
            className="grid size-11 place-items-center rounded-xl text-2xl text-[#274b48] transition hover:bg-[#e6eee3] disabled:cursor-not-allowed disabled:opacity-30"
            disabled={selectedDayIndex === trip.days.length - 1}
            onClick={() => moveDay(1)}
            type="button"
          >
            ›
          </button>
        </div>
        {(isBeforeTrip || isAfterTrip) && (
          <p className="mt-4 text-center text-sm text-[#69726c]">
            {isBeforeTrip
              ? t('travelMode.starts', { date: formatDate(trip.startDate) })
              : t('travelMode.ended')}
          </p>
        )}
      </div>

      {(trip.notes?.trim() || selectedDay.notes?.trim()) && (
        <div className="mt-4 grid gap-3">
          {trip.notes?.trim() && (
            <div className="rounded-2xl border border-[#e5b76b] bg-[#fff7e6] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9b6b24]">
                {t('travelMode.tripNote')}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#5f5138]">
                {trip.notes}
              </p>
            </div>
          )}
          {selectedDay.notes?.trim() && (
            <div className="rounded-2xl border border-[#b9d1be] bg-[#f0f5ed] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52705b]">
                {t('travelMode.dayNote')}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#526057]">
                {selectedDay.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {(housingForDay.length > 0 || mealsForDay.length > 0) && (
        <div className="mt-4 grid gap-3">
          {housingForDay.map((stay) => (
            <article
              className="rounded-2xl border border-[#d9d4ca] bg-[#faf8f3] p-4"
              key={stay.id}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#69726c]">
                {t('travelMode.housing')}
              </p>
              <h3 className="mt-1 font-semibold text-[#274b48]">{stay.name}</h3>
              {stay.notes?.trim() && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#69726c]">
                  {stay.notes}
                </p>
              )}
            </article>
          ))}
          {mealsForDay.map((meal) => (
            <article
              className="rounded-2xl border border-[#d9d4ca] bg-[#faf8f3] p-4"
              key={meal.id}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-16 place-items-center rounded-xl bg-[#d06f4c] px-2 py-2 text-sm font-semibold text-[#fff8f3]">
                  {formatActivityTime(meal, {
                    allDay: t('tripDetails.allDay'),
                    timeNotSet: t('tripDetails.timeNotSet'),
                  })}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#69726c]">
                    {t('travelMode.meal')}
                  </p>
                  <h3 className="mt-1 font-semibold text-[#274b48]">
                    {getDayItemTitle(meal, t('tripDetails.untitledItem'))}
                  </h3>
                  {meal.notes?.trim() && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#69726c]">
                      {meal.notes}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {sortActivities(selectedDay.activities).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#c9c1b5] p-6 text-sm text-[#69726c]">
            {t('travelMode.noActivities')}
          </p>
        ) : (
          sortActivities(selectedDay.activities).map((activity) => (
            <article
              className="rounded-2xl border border-[#e1dbd0] bg-[#faf8f3] p-4"
              key={activity.id}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-16 place-items-center rounded-xl bg-[#274b48] px-2 py-2 text-sm font-semibold text-[#f9f5ed]">
                  {formatActivityTime(activity, {
                    allDay: t('tripDetails.allDay'),
                    timeNotSet: t('tripDetails.timeNotSet'),
                  })}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#274b48]">
                    {getDayItemTitle(activity, t('tripDetails.untitledItem'))}
                  </h3>
                  {activity.placeAddress && (
                    <p className="mt-1 text-sm text-[#69726c]">
                      {activity.placeAddress}
                    </p>
                  )}
                  {activity.notes?.trim() && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#69726c]">
                      {activity.notes}
                    </p>
                  )}
                  {activity.googleMapsUrl && (
                    <a
                      className="mt-3 inline-flex rounded-lg bg-[#e6eee3] px-3 py-2 text-sm font-semibold text-[#274b48] hover:bg-[#d9e8d9]"
                      href={activity.googleMapsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t('tripDetails.openGoogleMaps')}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
