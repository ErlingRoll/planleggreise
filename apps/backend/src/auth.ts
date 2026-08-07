import { createSupabaseAuthClient } from "./supabase.js"

export type AuthenticatedUser = {
  id: string
  name: string | null
  email: string | null
}

function getUserName(userMetadata: Record<string, unknown>) {
  const name = [userMetadata.full_name, userMetadata.name].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  )

  return name?.trim() ?? null
}

export interface AuthService {
  authenticate(accessToken: string): Promise<AuthenticatedUser | null>
}

export function createSupabaseAuthService(): AuthService {
  return {
    async authenticate(accessToken) {
      const client = createSupabaseAuthClient(accessToken)
      const { data, error } = await client.auth.getUser(accessToken)

      if (error || !data.user) {
        return null
      }

      return {
        id: data.user.id,
        name: getUserName(data.user.user_metadata),
        email: data.user.email ?? null,
      }
    },
  }
}
