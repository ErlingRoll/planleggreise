import {
  TripDetailSchema,
  TripSchema,
  type CreateTripInput,
  type Trip,
  type TripDetail,
} from '@planleggreise/models'

export type {
  CreateTripInput,
  Trip,
  TripDetail,
} from '@planleggreise/models'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const errorBody = (await response.json()) as { message?: string }
    throw new Error(errorBody.message ?? `API request failed (${response.status})`)
  }

  return response.json() as Promise<unknown>
}

export async function getTrips(accessToken: string): Promise<Trip[]> {
  return TripSchema.array().parse(await request('/api/trips', accessToken))
}

export async function getTrip(
  accessToken: string,
  tripId: string,
): Promise<TripDetail> {
  return TripDetailSchema.parse(
    await request(`/api/trips/${tripId}`, accessToken),
  )
}

export async function createTrip(
  accessToken: string,
  input: CreateTripInput,
): Promise<Trip> {
  return TripSchema.parse(
    await request('/api/trips', accessToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  )
}
