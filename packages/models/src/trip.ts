import { z } from 'zod'

export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

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

export const TripDaySchema = z.object({
  date: DateOnlySchema,
  dayNumber: z.number().int().positive(),
})

export const TripDetailSchema = TripSchema.extend({
  days: TripDaySchema.array(),
})

export type Trip = z.infer<typeof TripSchema>
export type CreateTripInput = z.infer<typeof CreateTripInputSchema>
export type TripDay = z.infer<typeof TripDaySchema>
export type TripDetail = z.infer<typeof TripDetailSchema>
