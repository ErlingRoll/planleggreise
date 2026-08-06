import { TripSchema, type Trip } from '@planleggreise/models'

export type { Trip } from '@planleggreise/models'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export async function getTrips(): Promise<Trip[]> {
  const response = await fetch(`${apiBaseUrl}/api/trips`)

  if (!response.ok) {
    throw new Error(`Unable to load trips (${response.status})`)
  }

  return TripSchema.array().parse(await response.json()) as Trip[]
}
