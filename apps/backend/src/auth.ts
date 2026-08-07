import { createSupabaseAuthClient } from "./supabase.js"

export type AuthenticatedUser = {
  id: string
  email: string | null
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
        email: data.user.email ?? null,
      }
    },
  }
}
