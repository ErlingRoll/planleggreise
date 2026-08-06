import { z } from 'zod'

export const TripSchema = z.object({
  id: z.string(),
  name: z.string(),
  destination: z.string(),
  dateRange: z.string(),
  duration: z.string(),
  status: z.enum(['planning', 'booked']),
  accent: z.string(),
})

export type Trip = z.infer<typeof TripSchema>
