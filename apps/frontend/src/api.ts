import {
  ActivitySchema,
  CreateActivityInputSchema,
  TripDetailSchema,
  TripSchema,
  UpdateTripInputSchema,
  UpdateActivityInputSchema,
  type Activity,
  type CreateActivityInput,
  type CreateTripInput,
  type Trip,
  type TripDetail,
  type UpdateTripInput,
  type UpdateActivityInput,
} from '@planleggreise/models'

export type {
  Activity,
  CreateActivityInput,
  CreateTripInput,
  Trip,
  TripDetail,
  UpdateTripInput,
  UpdateActivityInput,
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

  return response.status === 204 ? null : response.json() as Promise<unknown>
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

export async function deleteTrip(
  accessToken: string,
  tripId: string,
): Promise<void> {
  await request(`/api/trips/${tripId}`, accessToken, {
    method: 'DELETE',
  })
}

export async function updateTrip(
  accessToken: string,
  tripId: string,
  input: UpdateTripInput,
): Promise<TripDetail> {
  return TripDetailSchema.parse(
    await request(`/api/trips/${tripId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(UpdateTripInputSchema.parse(input)),
    }),
  )
}

export async function createActivity(
  accessToken: string,
  tripId: string,
  input: CreateActivityInput,
): Promise<Activity> {
  return ActivitySchema.parse(
    await request(`/api/trips/${tripId}/activities`, accessToken, {
      method: 'POST',
      body: JSON.stringify(CreateActivityInputSchema.parse(input)),
    }),
  )
}

export async function updateActivity(
  accessToken: string,
  tripId: string,
  activityId: string,
  input: UpdateActivityInput,
): Promise<Activity> {
  return ActivitySchema.parse(
    await request(
      `/api/trips/${tripId}/activities/${activityId}`,
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify(UpdateActivityInputSchema.parse(input)),
      },
    ),
  )
}

export async function deleteActivity(
  accessToken: string,
  tripId: string,
  activityId: string,
): Promise<void> {
  await request(`/api/trips/${tripId}/activities/${activityId}`, accessToken, {
    method: 'DELETE',
  })
}
