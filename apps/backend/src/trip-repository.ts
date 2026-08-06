import { randomUUID } from 'node:crypto'
import {
  ActivitySchema,
  CreateActivityInputSchema,
  CreateTripInputSchema,
  DateOnlySchema,
  TripDetailSchema,
  TripSchema,
  UpdateTripInputSchema,
  type Activity,
  type CreateActivityInput,
  type CreateTripInput,
  type Trip,
  type TripDetail,
  type UpdateTripInput,
  type UpdateActivityInput,
} from '@planleggreise/models'
import { z } from 'zod'
import { createUserSupabaseClient } from './supabase.js'

const tripRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_date: DateOnlySchema,
  end_date: DateOnlySchema,
})

const activityRowSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  trip_date: DateOnlySchema,
  title: z.string(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  all_day: z.boolean(),
  notes: z.string().nullable(),
  sort_order: z.number().int(),
})

const activityColumns =
  'id, trip_id, trip_date, title, start_time, end_time, all_day, notes, sort_order'

export interface TripRepository {
  listTrips(userId: string, accessToken: string): Promise<Trip[]>
  getTrip(
    userId: string,
    accessToken: string,
    tripId: string,
  ): Promise<TripDetail | null>
  createTrip(
    userId: string,
    accessToken: string,
    input: CreateTripInput,
  ): Promise<Trip>
  updateTrip(
    userId: string,
    accessToken: string,
    tripId: string,
    input: UpdateTripInput,
  ): Promise<TripDetail | null>
  deleteTrip(
    userId: string,
    accessToken: string,
    tripId: string,
  ): Promise<boolean>
  getActivity(
    userId: string,
    accessToken: string,
    tripId: string,
    activityId: string,
  ): Promise<Activity | null>
  createActivity(
    userId: string,
    accessToken: string,
    tripId: string,
    input: CreateActivityInput,
  ): Promise<Activity | null>
  updateActivity(
    userId: string,
    accessToken: string,
    tripId: string,
    activityId: string,
    input: UpdateActivityInput,
  ): Promise<Activity | null>
  deleteActivity(
    userId: string,
    accessToken: string,
    tripId: string,
    activityId: string,
  ): Promise<boolean>
}

function dateToUtcDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day))

  if (utcDate.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid calendar date: ${date}`)
  }

  return utcDate
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  try {
    return dateToUtcDate(startDate) <= dateToUtcDate(endDate)
  } catch {
    return false
  }
}

export function isDateWithinTrip(trip: Trip, date: string): boolean {
  return (
    isValidDateRange(date, date) &&
    date >= trip.startDate &&
    date <= trip.endDate
  )
}

export function buildTripDays(trip: Trip): TripDetail['days'] {
  const currentDate = dateToUtcDate(trip.startDate)
  const endDate = dateToUtcDate(trip.endDate)
  const days: TripDetail['days'] = []
  let dayNumber = 1

  while (currentDate <= endDate) {
    days.push({
      date: currentDate.toISOString().slice(0, 10),
      dayNumber,
      activities: [],
    })
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    dayNumber += 1
  }

  return days
}

function mapTripRow(row: unknown): Trip {
  const parsedRow = tripRowSchema.parse(row)

  return TripSchema.parse({
    id: parsedRow.id,
    name: parsedRow.name,
    startDate: parsedRow.start_date,
    endDate: parsedRow.end_date,
  })
}

function mapActivityRow(row: unknown): Activity {
  const parsedRow = activityRowSchema.parse(row)

  return ActivitySchema.parse({
    id: parsedRow.id,
    tripId: parsedRow.trip_id,
    tripDate: parsedRow.trip_date,
    title: parsedRow.title,
    startTime: parsedRow.start_time?.slice(0, 5) ?? null,
    endTime: parsedRow.end_time?.slice(0, 5) ?? null,
    allDay: parsedRow.all_day,
    notes: parsedRow.notes,
    sortOrder: parsedRow.sort_order,
  })
}

async function selectActivity(
  client: ReturnType<typeof createUserSupabaseClient>,
  tripId: string,
  activityId: string,
): Promise<Activity | null> {
  const { data, error } = await client
    .from('activities')
    .select(activityColumns)
    .eq('trip_id', tripId)
    .eq('id', activityId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapActivityRow(data) : null
}

async function listActivities(
  client: ReturnType<typeof createUserSupabaseClient>,
  tripId: string,
): Promise<Activity[]> {
  const { data, error } = await client
    .from('activities')
    .select(activityColumns)
    .eq('trip_id', tripId)
    .order('trip_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  return z.array(activityRowSchema).parse(data).map(mapActivityRow)
}

function addActivitiesToDays(
  days: TripDetail['days'],
  activities: Activity[],
): TripDetail['days'] {
  const activitiesByDate = new Map<string, Activity[]>()

  for (const activity of activities) {
    const dateActivities = activitiesByDate.get(activity.tripDate) ?? []
    dateActivities.push(activity)
    activitiesByDate.set(activity.tripDate, dateActivities)
  }

  return days.map((day) => ({
    ...day,
    activities: activitiesByDate.get(day.date) ?? [],
  }))
}

export function createSupabaseTripRepository(): TripRepository {
  return {
    async listTrips(userId, accessToken) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('trips')
        .select('id, name, start_date, end_date')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('start_date', { ascending: true })

      if (error) {
        throw error
      }

      return z.array(tripRowSchema).parse(data).map(mapTripRow)
    },

    async getTrip(userId, accessToken, tripId) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('trips')
        .select('id, name, start_date, end_date')
        .eq('id', tripId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return null
      }

      const trip = mapTripRow(data)
      const activities = await listActivities(client, tripId)
      return TripDetailSchema.parse({
        ...trip,
        days: addActivitiesToDays(buildTripDays(trip), activities),
      })
    },

    async createTrip(userId, accessToken, input) {
      const parsedInput = CreateTripInputSchema.parse(input)
      const client = createUserSupabaseClient(accessToken)
      const tripId = randomUUID()
      const { error } = await client
        .from('trips')
        .insert({
          id: tripId,
          owner_id: userId,
          name: parsedInput.name,
          start_date: parsedInput.startDate,
          end_date: parsedInput.endDate,
        })

      if (error) {
        throw error
      }

      const { data, error: readError } = await client
        .from('trips')
        .select('id, name, start_date, end_date')
        .eq('id', tripId)
        .eq('owner_id', userId)
        .single()

      if (readError) {
        throw readError
      }

      return mapTripRow(data)
    },

    async updateTrip(userId, accessToken, tripId, input) {
      const currentTrip = await this.getTrip(userId, accessToken, tripId)

      if (!currentTrip) {
        return null
      }

      const parsedInput = UpdateTripInputSchema.parse(input)
      const updatedTrip = CreateTripInputSchema.parse({
        name: currentTrip.name,
        startDate: currentTrip.startDate,
        endDate: currentTrip.endDate,
        ...parsedInput,
      })
      const client = createUserSupabaseClient(accessToken)
      const { error } = await client
        .from('trips')
        .update({
          name: updatedTrip.name,
          start_date: updatedTrip.startDate,
          end_date: updatedTrip.endDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId)
        .eq('owner_id', userId)

      if (error) {
        throw error
      }

      return this.getTrip(userId, accessToken, tripId)
    },

    async deleteTrip(userId, accessToken, tripId) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error: readError } = await client
        .from('trips')
        .select('id')
        .eq('id', tripId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle()

      if (readError) {
        throw readError
      }

      if (!data) {
        return false
      }

      const { error } = await client
        .from('trips')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tripId)
        .eq('owner_id', userId)

      if (error) {
        throw error
      }

      return true
    },

    async getActivity(_userId, accessToken, tripId, activityId) {
      return selectActivity(
        createUserSupabaseClient(accessToken),
        tripId,
        activityId,
      )
    },

    async createActivity(_userId, accessToken, tripId, input) {
      const parsedInput = CreateActivityInputSchema.parse(input)
      const client = createUserSupabaseClient(accessToken)
      const activityId = randomUUID()
      const { error } = await client.from('activities').insert({
        id: activityId,
        trip_id: tripId,
        trip_date: parsedInput.tripDate,
        title: parsedInput.title,
        start_time: parsedInput.startTime,
        end_time: parsedInput.endTime,
        all_day: parsedInput.allDay,
        notes: parsedInput.notes,
      })

      if (error) {
        throw error
      }

      return selectActivity(client, tripId, activityId)
    },

    async updateActivity(
      _userId,
      accessToken,
      tripId,
      activityId,
      input,
    ) {
      const client = createUserSupabaseClient(accessToken)
      const currentActivity = await selectActivity(client, tripId, activityId)

      if (!currentActivity) {
        return null
      }

      const parsedInput = CreateActivityInputSchema.parse({
        tripDate: currentActivity.tripDate,
        title: currentActivity.title,
        startTime: currentActivity.startTime,
        endTime: currentActivity.endTime,
        allDay: currentActivity.allDay,
        notes: currentActivity.notes,
        ...input,
      })
      const { error } = await client
        .from('activities')
        .update({
          trip_date: parsedInput.tripDate,
          title: parsedInput.title,
          start_time: parsedInput.startTime,
          end_time: parsedInput.endTime,
          all_day: parsedInput.allDay,
          notes: parsedInput.notes,
        })
        .eq('trip_id', tripId)
        .eq('id', activityId)

      if (error) {
        throw error
      }

      return selectActivity(client, tripId, activityId)
    },

    async deleteActivity(_userId, accessToken, tripId, activityId) {
      const client = createUserSupabaseClient(accessToken)
      const currentActivity = await selectActivity(client, tripId, activityId)

      if (!currentActivity) {
        return false
      }

      const { error } = await client
        .from('activities')
        .delete()
        .eq('trip_id', tripId)
        .eq('id', activityId)

      if (error) {
        throw error
      }

      return true
    },
  }
}
