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

export const NoteSchema = z.string().trim().max(2000).nullable()
export const DayTitleSchema = z.string().trim().min(1).max(200).nullable()

export const TripSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
  notes: NoteSchema,
})

export const CreateTripInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
  notes: NoteSchema.optional().default(null),
})

export const UpdateTripInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  startDate: DateOnlySchema.optional(),
  endDate: DateOnlySchema.optional(),
  notes: NoteSchema.optional(),
})

const ActivityFieldsSchema = z.object({
  tripDate: DateOnlySchema,
  title: z.string().trim().max(200).nullable(),
  startTime: TimeOnlySchema.nullable(),
  endTime: TimeOnlySchema.nullable(),
  allDay: z.boolean(),
  notes: z.string().trim().max(2000).nullable(),
})

const ActivityPlaceSchema = z.object({
  googleMapsUrl: z.string().url().nullable(),
  placeName: z.string().trim().max(200).nullable(),
  placeAddress: z.string().trim().max(500).nullable(),
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
}).merge(ActivityPlaceSchema)

export const CreateActivityInputSchema = ActivityFieldsSchema.extend({
  googleMapsUrl: z.string().url().nullable().optional().default(null),
  placeName: z.string().trim().max(200).nullable().optional().default(null),
  placeAddress: z.string().trim().max(500).nullable().optional().default(null),
}).refine(
  (activity) =>
    Boolean(activity.title?.trim()) || Boolean(activity.googleMapsUrl),
  'An activity title or Google Maps link is required',
).refine(
  (activity) => hasValidTimeRange(activity.startTime, activity.endTime),
  'End time must be on or after start time',
)

export const UpdateActivityInputSchema = z
  .object({
    tripDate: DateOnlySchema.optional(),
    title: z.string().trim().max(200).nullable().optional(),
    startTime: TimeOnlySchema.nullable().optional(),
    endTime: TimeOnlySchema.nullable().optional(),
    allDay: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    googleMapsUrl: z.string().url().nullable().optional(),
    placeName: z.string().trim().max(200).nullable().optional(),
    placeAddress: z.string().trim().max(500).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (activity) => hasValidTimeRange(activity.startTime, activity.endTime),
    'End time must be on or after start time',
  )

export const ReorderActivityInputSchema = z.object({
  activityId: z.string().min(1),
  tripDate: DateOnlySchema,
  sortOrder: z.number().int().nonnegative(),
})

export const ReorderActivitiesInputSchema = z.object({
  activities: ReorderActivityInputSchema.array().min(1),
})

const HousingStayFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  checkIn: DateOnlySchema,
  checkOut: DateOnlySchema,
  notes: NoteSchema,
})

export const HousingStaySchema = HousingStayFieldsSchema.extend({
  id: z.string(),
  tripId: z.string(),
})

export const CreateHousingStayInputSchema = HousingStayFieldsSchema.refine(
  (stay) => stay.checkOut > stay.checkIn,
  'Check-out must be after check-in',
)

export const UpdateHousingStayInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    checkIn: DateOnlySchema.optional(),
    checkOut: DateOnlySchema.optional(),
    notes: NoteSchema.optional(),
  })
  .refine(
    (stay) =>
      !stay.checkIn ||
      !stay.checkOut ||
      stay.checkOut > stay.checkIn,
    'Check-out must be after check-in',
  )

const MealFieldsSchema = z.object({
  tripDate: DateOnlySchema,
  title: z.string().trim().max(200).nullable(),
  startTime: TimeOnlySchema.nullable(),
  endTime: TimeOnlySchema.nullable(),
  allDay: z.boolean(),
  notes: NoteSchema,
})

export const MealSchema = MealFieldsSchema.extend({
  id: z.string(),
  tripId: z.string(),
  sortOrder: z.number().int(),
}).merge(ActivityPlaceSchema)

export const CreateMealInputSchema = MealFieldsSchema.extend({
  googleMapsUrl: z.string().url().nullable().optional().default(null),
  placeName: z.string().trim().max(200).nullable().optional().default(null),
  placeAddress: z.string().trim().max(500).nullable().optional().default(null),
}).refine(
  (meal) =>
    Boolean(meal.title?.trim()) || Boolean(meal.googleMapsUrl),
  'A meal title or Google Maps link is required',
).refine(
  (meal) => hasValidTimeRange(meal.startTime, meal.endTime),
  'End time must be on or after start time',
)

export const UpdateMealInputSchema = z
  .object({
    tripDate: DateOnlySchema.optional(),
    title: z.string().trim().max(200).nullable().optional(),
    startTime: TimeOnlySchema.nullable().optional(),
    endTime: TimeOnlySchema.nullable().optional(),
    allDay: z.boolean().optional(),
    notes: NoteSchema.optional(),
    googleMapsUrl: z.string().url().nullable().optional(),
    placeName: z.string().trim().max(200).nullable().optional(),
    placeAddress: z.string().trim().max(500).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (meal) => hasValidTimeRange(meal.startTime, meal.endTime),
    'End time must be on or after start time',
  )

export const TripDaySchema = z.object({
  date: DateOnlySchema,
  dayNumber: z.number().int().positive(),
  title: DayTitleSchema,
  notes: NoteSchema,
  activities: ActivitySchema.array().default([]),
})

export const UpdateTripDayInputSchema = z.object({
  title: DayTitleSchema.optional(),
  notes: NoteSchema.optional(),
})

export const TripDetailSchema = TripSchema.extend({
  days: TripDaySchema.array(),
  housingStays: HousingStaySchema.array().default([]),
  meals: MealSchema.array().default([]),
})

export const DayItemTypeSchema = z.enum(['activity', 'meal'])

export const ReorderDayItemInputSchema = z.object({
  itemType: DayItemTypeSchema,
  itemId: z.string().min(1),
  tripDate: DateOnlySchema,
  sortOrder: z.number().int().nonnegative(),
})

export const ReorderDayItemsInputSchema = z.object({
  items: ReorderDayItemInputSchema.array().min(1),
})

export const ReorderedDayItemsSchema = z.object({
  activities: ActivitySchema.array(),
  meals: MealSchema.array(),
})

export type Trip = z.infer<typeof TripSchema>
export type CreateTripInput = z.infer<typeof CreateTripInputSchema>
export type UpdateTripInput = z.infer<typeof UpdateTripInputSchema>
export type Activity = z.infer<typeof ActivitySchema>
export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>
export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>
export type ReorderActivityInput = z.infer<typeof ReorderActivityInputSchema>
export type ReorderActivitiesInput = z.infer<
  typeof ReorderActivitiesInputSchema
>
export type HousingStay = z.infer<typeof HousingStaySchema>
export type CreateHousingStayInput = z.infer<
  typeof CreateHousingStayInputSchema
>
export type UpdateHousingStayInput = z.infer<
  typeof UpdateHousingStayInputSchema
>
export type Meal = z.infer<typeof MealSchema>
export type CreateMealInput = z.infer<typeof CreateMealInputSchema>
export type UpdateMealInput = z.infer<typeof UpdateMealInputSchema>
export type DayItemType = z.infer<typeof DayItemTypeSchema>
export type ReorderDayItemInput = z.infer<typeof ReorderDayItemInputSchema>
export type ReorderDayItemsInput = z.infer<typeof ReorderDayItemsInputSchema>
export type TripDay = z.infer<typeof TripDaySchema>
export type UpdateTripDayInput = z.infer<typeof UpdateTripDayInputSchema>
export type TripDetail = z.infer<typeof TripDetailSchema>
