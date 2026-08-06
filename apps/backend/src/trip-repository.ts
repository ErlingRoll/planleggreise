import { randomUUID } from 'node:crypto'
import {
  ActivitySchema,
  CreateActivityInputSchema,
  CreateHousingStayInputSchema,
  CreateMealInputSchema,
  CreateTripInputSchema,
  DateOnlySchema,
  HousingStaySchema,
  MealSchema,
  TripDetailSchema,
  TripSchema,
  UpdateHousingStayInputSchema,
  UpdateMealInputSchema,
  UpdateTripDayInputSchema,
  UpdateTripInputSchema,
  type Activity,
  type CreateActivityInput,
  type CreateHousingStayInput,
  type CreateMealInput,
  type CreateTripInput,
  type HousingStay,
  type Meal,
  type Trip,
  type TripDay,
  type TripDetail,
  type UpdateHousingStayInput,
  type UpdateMealInput,
  type UpdateTripDayInput,
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
  notes: z.string().nullable(),
})

const tripDayRowSchema = z.object({
  trip_id: z.string(),
  trip_date: DateOnlySchema,
  notes: z.string().nullable(),
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
  google_maps_url: z.string().nullable(),
  place_name: z.string().nullable(),
  place_address: z.string().nullable(),
  sort_order: z.number().int(),
})

const housingStayRowSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  name: z.string(),
  check_in: DateOnlySchema,
  check_out: DateOnlySchema,
  notes: z.string().nullable(),
})

const mealRowSchema = z.object({
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
  'id, trip_id, trip_date, title, start_time, end_time, all_day, notes, google_maps_url, place_name, place_address, sort_order'
const housingStayColumns = 'id, trip_id, name, check_in, check_out, notes'
const mealColumns =
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
  updateDay(
    userId: string,
    accessToken: string,
    tripId: string,
    tripDate: string,
    input: UpdateTripDayInput,
  ): Promise<TripDay | null>
  getHousingStay(
    userId: string,
    accessToken: string,
    tripId: string,
    housingStayId: string,
  ): Promise<HousingStay | null>
  createHousingStay(
    userId: string,
    accessToken: string,
    tripId: string,
    input: CreateHousingStayInput,
  ): Promise<HousingStay | null>
  updateHousingStay(
    userId: string,
    accessToken: string,
    tripId: string,
    housingStayId: string,
    input: UpdateHousingStayInput,
  ): Promise<HousingStay | null>
  deleteHousingStay(
    userId: string,
    accessToken: string,
    tripId: string,
    housingStayId: string,
  ): Promise<boolean>
  getMeal(
    userId: string,
    accessToken: string,
    tripId: string,
    mealId: string,
  ): Promise<Meal | null>
  createMeal(
    userId: string,
    accessToken: string,
    tripId: string,
    input: CreateMealInput,
  ): Promise<Meal | null>
  updateMeal(
    userId: string,
    accessToken: string,
    tripId: string,
    mealId: string,
    input: UpdateMealInput,
  ): Promise<Meal | null>
  deleteMeal(
    userId: string,
    accessToken: string,
    tripId: string,
    mealId: string,
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
      notes: null,
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
    notes: parsedRow.notes,
  })
}

function mapTripDayRow(row: unknown): Pick<TripDay, 'date' | 'notes'> {
  const parsedRow = tripDayRowSchema.parse(row)

  return {
    date: parsedRow.trip_date,
    notes: parsedRow.notes,
  }
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
    googleMapsUrl: parsedRow.google_maps_url,
    placeName: parsedRow.place_name,
    placeAddress: parsedRow.place_address,
    sortOrder: parsedRow.sort_order,
  })
}

function mapHousingStayRow(row: unknown): HousingStay {
  const parsedRow = housingStayRowSchema.parse(row)

  return HousingStaySchema.parse({
    id: parsedRow.id,
    tripId: parsedRow.trip_id,
    name: parsedRow.name,
    checkIn: parsedRow.check_in,
    checkOut: parsedRow.check_out,
    notes: parsedRow.notes,
  })
}

function mapMealRow(row: unknown): Meal {
  const parsedRow = mealRowSchema.parse(row)

  return MealSchema.parse({
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

async function listTripDays(
  client: ReturnType<typeof createUserSupabaseClient>,
  tripId: string,
): Promise<Array<Pick<TripDay, 'date' | 'notes'>>> {
  const { data, error } = await client
    .from('trip_days')
    .select('trip_id, trip_date, notes')
    .eq('trip_id', tripId)

  if (error) {
    throw error
  }

  return z.array(tripDayRowSchema).parse(data).map(mapTripDayRow)
}

async function listHousingStays(
  client: ReturnType<typeof createUserSupabaseClient>,
  tripId: string,
): Promise<HousingStay[]> {
  const { data, error } = await client
    .from('housing_stays')
    .select(housingStayColumns)
    .eq('trip_id', tripId)
    .order('check_in', { ascending: true })

  if (error) {
    throw error
  }

  return z.array(housingStayRowSchema).parse(data).map(mapHousingStayRow)
}

async function listMeals(
  client: ReturnType<typeof createUserSupabaseClient>,
  tripId: string,
): Promise<Meal[]> {
  const { data, error } = await client
    .from('meals')
    .select(mealColumns)
    .eq('trip_id', tripId)
    .order('trip_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  return z.array(mealRowSchema).parse(data).map(mapMealRow)
}

function addActivitiesToDays(
  days: TripDetail['days'],
  activities: Activity[],
  tripDays: Array<Pick<TripDay, 'date' | 'notes'>>,
): TripDetail['days'] {
  const activitiesByDate = new Map<string, Activity[]>()
  const notesByDate = new Map(tripDays.map((day) => [day.date, day.notes]))

  for (const activity of activities) {
    const dateActivities = activitiesByDate.get(activity.tripDate) ?? []
    dateActivities.push(activity)
    activitiesByDate.set(activity.tripDate, dateActivities)
  }

  return days.map((day) => ({
    ...day,
    notes: notesByDate.get(day.date) ?? null,
    activities: activitiesByDate.get(day.date) ?? [],
  }))
}

export function createSupabaseTripRepository(): TripRepository {
  return {
    async listTrips(userId, accessToken) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('trips')
        .select('id, name, start_date, end_date, notes')
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
        .select('id, name, start_date, end_date, notes')
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
      const [activities, tripDays, housingStays, meals] = await Promise.all([
        listActivities(client, tripId),
        listTripDays(client, tripId),
        listHousingStays(client, tripId),
        listMeals(client, tripId),
      ])
      return TripDetailSchema.parse({
        ...trip,
        days: addActivitiesToDays(buildTripDays(trip), activities, tripDays),
        housingStays,
        meals,
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
          notes: parsedInput.notes,
        })

      if (error) {
        throw error
      }

      const { data, error: readError } = await client
        .from('trips')
        .select('id, name, start_date, end_date, notes')
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
        notes: currentTrip.notes,
        ...parsedInput,
      })
      const client = createUserSupabaseClient(accessToken)
      const { error } = await client
        .from('trips')
        .update({
          name: updatedTrip.name,
          start_date: updatedTrip.startDate,
          end_date: updatedTrip.endDate,
          notes: updatedTrip.notes,
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

    async updateDay(userId, accessToken, tripId, tripDate, input) {
      const trip = await this.getTrip(userId, accessToken, tripId)

      if (!trip) {
        return null
      }

      const day = trip.days.find((currentDay) => currentDay.date === tripDate)

      if (!day) {
        return null
      }

      const parsedInput = UpdateTripDayInputSchema.parse(input)
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('trip_days')
        .upsert(
          {
            trip_id: tripId,
            trip_date: tripDate,
            notes: parsedInput.notes ?? day.notes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'trip_id,trip_date' },
        )
        .select('trip_id, trip_date, notes')
        .single()

      if (error) {
        throw error
      }

      const parsedDay = mapTripDayRow(data)
      return {
        ...day,
        notes: parsedDay.notes,
      }
    },

    async getHousingStay(_userId, accessToken, tripId, housingStayId) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('housing_stays')
        .select(housingStayColumns)
        .eq('trip_id', tripId)
        .eq('id', housingStayId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data ? mapHousingStayRow(data) : null
    },

    async createHousingStay(_userId, accessToken, tripId, input) {
      const parsedInput = CreateHousingStayInputSchema.parse(input)
      const client = createUserSupabaseClient(accessToken)
      const housingStayId = randomUUID()
      const { error } = await client.from('housing_stays').insert({
        id: housingStayId,
        trip_id: tripId,
        name: parsedInput.name,
        check_in: parsedInput.checkIn,
        check_out: parsedInput.checkOut,
        notes: parsedInput.notes,
      })

      if (error) {
        throw error
      }

      const { data, error: readError } = await client
        .from('housing_stays')
        .select(housingStayColumns)
        .eq('trip_id', tripId)
        .eq('id', housingStayId)
        .single()

      if (readError) {
        throw readError
      }

      return mapHousingStayRow(data)
    },

    async updateHousingStay(
      _userId,
      accessToken,
      tripId,
      housingStayId,
      input,
    ) {
      const client = createUserSupabaseClient(accessToken)
      const currentStay = await this.getHousingStay(
        _userId,
        accessToken,
        tripId,
        housingStayId,
      )

      if (!currentStay) {
        return null
      }

      const parsedInput = CreateHousingStayInputSchema.parse({
        name: currentStay.name,
        checkIn: currentStay.checkIn,
        checkOut: currentStay.checkOut,
        notes: currentStay.notes,
        ...input,
      })
      const { error } = await client
        .from('housing_stays')
        .update({
          name: parsedInput.name,
          check_in: parsedInput.checkIn,
          check_out: parsedInput.checkOut,
          notes: parsedInput.notes,
        })
        .eq('trip_id', tripId)
        .eq('id', housingStayId)

      if (error) {
        throw error
      }

      return this.getHousingStay(_userId, accessToken, tripId, housingStayId)
    },

    async deleteHousingStay(_userId, accessToken, tripId, housingStayId) {
      const client = createUserSupabaseClient(accessToken)
      const currentStay = await this.getHousingStay(
        _userId,
        accessToken,
        tripId,
        housingStayId,
      )

      if (!currentStay) {
        return false
      }

      const { error } = await client
        .from('housing_stays')
        .delete()
        .eq('trip_id', tripId)
        .eq('id', housingStayId)

      if (error) {
        throw error
      }

      return true
    },

    async getMeal(_userId, accessToken, tripId, mealId) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('meals')
        .select(mealColumns)
        .eq('trip_id', tripId)
        .eq('id', mealId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data ? mapMealRow(data) : null
    },

    async createMeal(_userId, accessToken, tripId, input) {
      const parsedInput = CreateMealInputSchema.parse(input)
      const client = createUserSupabaseClient(accessToken)
      const mealId = randomUUID()
      const { error } = await client.from('meals').insert({
        id: mealId,
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

      const { data, error: readError } = await client
        .from('meals')
        .select(mealColumns)
        .eq('trip_id', tripId)
        .eq('id', mealId)
        .single()

      if (readError) {
        throw readError
      }

      return mapMealRow(data)
    },

    async updateMeal(_userId, accessToken, tripId, mealId, input) {
      const client = createUserSupabaseClient(accessToken)
      const currentMeal = await this.getMeal(
        _userId,
        accessToken,
        tripId,
        mealId,
      )

      if (!currentMeal) {
        return null
      }

      const parsedInput = CreateMealInputSchema.parse({
        tripDate: currentMeal.tripDate,
        title: currentMeal.title,
        startTime: currentMeal.startTime,
        endTime: currentMeal.endTime,
        allDay: currentMeal.allDay,
        notes: currentMeal.notes,
        ...input,
      })
      const { error } = await client
        .from('meals')
        .update({
          trip_date: parsedInput.tripDate,
          title: parsedInput.title,
          start_time: parsedInput.startTime,
          end_time: parsedInput.endTime,
          all_day: parsedInput.allDay,
          notes: parsedInput.notes,
        })
        .eq('trip_id', tripId)
        .eq('id', mealId)

      if (error) {
        throw error
      }

      return this.getMeal(_userId, accessToken, tripId, mealId)
    },

    async deleteMeal(_userId, accessToken, tripId, mealId) {
      const client = createUserSupabaseClient(accessToken)
      const currentMeal = await this.getMeal(_userId, accessToken, tripId, mealId)

      if (!currentMeal) {
        return false
      }

      const { error } = await client
        .from('meals')
        .delete()
        .eq('trip_id', tripId)
        .eq('id', mealId)

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
        google_maps_url: parsedInput.googleMapsUrl,
        place_name: parsedInput.placeName,
        place_address: parsedInput.placeAddress,
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
          google_maps_url: parsedInput.googleMapsUrl,
          place_name: parsedInput.placeName,
          place_address: parsedInput.placeAddress,
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
