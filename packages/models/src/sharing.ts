import { z } from "zod"

export const TripMemberRoleSchema = z.enum(["owner", "member"])
export const SharingInvitationStatusSchema = z.enum(["pending", "accepted", "declined", "revoked"])
export const SharingRequestSourceSchema = z.enum(["email", "link"])
export const SharingRequestStatusSchema = z.enum(["pending", "approved", "denied"])
export const TripAccessStatusSchema = z.object({
  status: z.enum(["none", "pending", "approved", "denied"]),
  isNew: z.boolean(),
})

export const TripMemberSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: TripMemberRoleSchema,
  joinedAt: z.string().datetime(),
})

export const TripInvitationSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  email: z.string().email(),
  status: SharingInvitationStatusSchema,
  createdAt: z.string().datetime(),
})

export const TripAccessRequestSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  email: z.string().email(),
  source: SharingRequestSourceSchema,
  status: SharingRequestStatusSchema,
  createdAt: z.string().datetime(),
})

export const TripAccessLinkSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  token: z.string().min(1),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export const TripSharingSchema = z.object({
  ownerId: z.string(),
  canManage: z.boolean(),
  members: TripMemberSchema.array(),
  invitations: TripInvitationSchema.array(),
  requests: TripAccessRequestSchema.array(),
  accessLinks: TripAccessLinkSchema.array(),
})

export const InviteTripMemberInputSchema = z.object({
  email: z.string().trim().email(),
})

export const RequestTripAccessInputSchema = z
  .object({
    invitationId: z.string().uuid().optional(),
    accessLinkToken: z.string().trim().min(1).optional(),
  })
  .refine(
    (input) => Boolean(input.invitationId) !== Boolean(input.accessLinkToken),
    "Exactly one invitation or access-link token is required",
  )

export type TripMemberRole = z.infer<typeof TripMemberRoleSchema>
export type SharingInvitationStatus = z.infer<typeof SharingInvitationStatusSchema>
export type SharingRequestSource = z.infer<typeof SharingRequestSourceSchema>
export type SharingRequestStatus = z.infer<typeof SharingRequestStatusSchema>
export type TripAccessStatus = z.infer<typeof TripAccessStatusSchema>
export type TripMember = z.infer<typeof TripMemberSchema>
export type TripInvitation = z.infer<typeof TripInvitationSchema>
export type TripAccessRequest = z.infer<typeof TripAccessRequestSchema>
export type TripAccessLink = z.infer<typeof TripAccessLinkSchema>
export type TripSharing = z.infer<typeof TripSharingSchema>
export type InviteTripMemberInput = z.infer<typeof InviteTripMemberInputSchema>
export type RequestTripAccessInput = z.infer<typeof RequestTripAccessInputSchema>
