import { z } from "zod"

export const TripItemTypeSchema = z.enum(["activity", "meal", "housing"])
export const TripItemPreferenceValueSchema = z.enum(["green", "yellow", "red"])

export const TripItemPreferenceSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  userId: z.string(),
  itemType: TripItemTypeSchema,
  itemId: z.string(),
  value: TripItemPreferenceValueSchema,
  updatedAt: z.string().datetime(),
})

export const SetTripItemPreferenceInputSchema = z.object({
  itemType: TripItemTypeSchema,
  itemId: z.string().min(1),
  value: TripItemPreferenceValueSchema.nullable(),
})

export type TripItemType = z.infer<typeof TripItemTypeSchema>
export type TripItemPreferenceValue = z.infer<typeof TripItemPreferenceValueSchema>
export type TripItemPreference = z.infer<typeof TripItemPreferenceSchema>
export type SetTripItemPreferenceInput = z.infer<typeof SetTripItemPreferenceInputSchema>
