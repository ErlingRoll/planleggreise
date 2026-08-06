import type { Trip } from '@planleggreise/models'

const dateFormatter = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'medium',
})

export function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00`))
}

export function formatDateRange(trip: Pick<Trip, 'startDate' | 'endDate'>) {
  return `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
}
