import {
  getTripDurationInDays,
  isTripDurationWithinLimit,
  MAX_TRIP_DAYS,
} from '@planleggreise/models'

export { MAX_TRIP_DAYS }

export function isValidTripDuration(startDate: string, endDate: string) {
  return isTripDurationWithinLimit(startDate, endDate)
}

export function shiftDate(date: string, dayOffset: number) {
  const parsedDate = new Date(`${date}T12:00:00Z`)
  parsedDate.setUTCDate(parsedDate.getUTCDate() + dayOffset)
  return parsedDate.toISOString().slice(0, 10)
}

export function getTripDurationMessage(startDate: string, endDate: string) {
  const duration = getTripDurationInDays(startDate, endDate)
  return duration && duration > MAX_TRIP_DAYS
    ? `En reise kan ikke vare lenger enn ${MAX_TRIP_DAYS} dager.`
    : null
}
