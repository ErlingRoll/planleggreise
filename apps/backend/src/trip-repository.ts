import { randomUUID } from 'node:crypto'
import {
  CreateTripInputSchema,
  DateOnlySchema,
  TripDetailSchema,
  TripSchema,
  type CreateTripInput,
  type Trip,
  type TripDetail,
} from '@planleggreise/models'
import { z } from 'zod'
import { createUserSupabaseClient } from './supabase.js'

const tripRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_date: DateOnlySchema,
  end_date: DateOnlySchema,
})

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

export function buildTripDays(trip: Trip): TripDetail['days'] {
  const currentDate = dateToUtcDate(trip.startDate)
  const endDate = dateToUtcDate(trip.endDate)
  const days: TripDetail['days'] = []
  let dayNumber = 1

  while (currentDate <= endDate) {
    days.push({
      date: currentDate.toISOString().slice(0, 10),
      dayNumber,
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

export function createSupabaseTripRepository(): TripRepository {
  return {
    async listTrips(userId, accessToken) {
      const client = createUserSupabaseClient(accessToken)
      const { data, error } = await client
        .from('trips')
        .select('id, name, start_date, end_date')
        .eq('owner_id', userId)
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
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return null
      }

      const trip = mapTripRow(data)
      return TripDetailSchema.parse({
        ...trip,
        days: buildTripDays(trip),
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
  }
}
