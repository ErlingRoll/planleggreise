import { z } from 'zod'

export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const MAX_TRIP_DAYS = 60

function parseCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  if (
    !DateOnlySchema.safeParse(date).success ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return null
  }

  return parsedDate
}

export function getTripDurationInDays(
  startDate: string,
  endDate: string,
): number | null {
  const start = parseCalendarDate(startDate)
  const end = parseCalendarDate(endDate)

  if (!start || !end || end < start) {
    return null
  }

  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function isTripDurationWithinLimit(
  startDate: string,
  endDate: string,
): boolean {
  const duration = getTripDurationInDays(startDate, endDate)
  return duration !== null && duration <= MAX_TRIP_DAYS
}

export const TimeOnlySchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)

export const TripSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
})

export const CreateTripInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
})

export const UpdateTripInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  startDate: DateOnlySchema.optional(),
  endDate: DateOnlySchema.optional(),
})

const ActivityFieldsSchema = z.object({
  tripDate: DateOnlySchema,
  title: z.string().trim().min(1).max(200),
  startTime: TimeOnlySchema.nullable(),
  endTime: TimeOnlySchema.nullable(),
  allDay: z.boolean(),
  notes: z.string().trim().max(2000).nullable(),
})

function hasValidTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
) {
  return !startTime || !endTime || endTime >= startTime
}

export const ActivitySchema = ActivityFieldsSchema.extend({
  id: z.string(),
  tripId: z.string(),
  sortOrder: z.number().int(),
})

export const CreateActivityInputSchema = ActivityFieldsSchema.refine(
  (activity) => hasValidTimeRange(activity.startTime, activity.endTime),
  'End time must be on or after start time',
)

export const UpdateActivityInputSchema = z
  .object({
    tripDate: DateOnlySchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    startTime: TimeOnlySchema.nullable().optional(),
    endTime: TimeOnlySchema.nullable().optional(),
    allDay: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (activity) => hasValidTimeRange(activity.startTime, activity.endTime),
    'End time must be on or after start time',
  )

export const TripDaySchema = z.object({
  date: DateOnlySchema,
  dayNumber: z.number().int().positive(),
  activities: ActivitySchema.array().default([]),
})

export const TripDetailSchema = TripSchema.extend({
  days: TripDaySchema.array(),
})

export type Trip = z.infer<typeof TripSchema>
export type CreateTripInput = z.infer<typeof CreateTripInputSchema>
export type UpdateTripInput = z.infer<typeof UpdateTripInputSchema>
export type Activity = z.infer<typeof ActivitySchema>
export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>
export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>
export type TripDay = z.infer<typeof TripDaySchema>
export type TripDetail = z.infer<typeof TripDetailSchema>
