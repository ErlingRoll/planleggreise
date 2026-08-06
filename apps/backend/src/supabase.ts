import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SupabaseEnvironment = NodeJS.ProcessEnv

function getRequiredEnvironmentValue(
  environment: SupabaseEnvironment,
  name: string,
): string {
  const value = environment[name]

  if (!value) {
    throw new Error(`${name} is required to connect to Supabase`)
  }

  return value
}

export function createUserSupabaseClient(
  accessToken: string,
  environment: SupabaseEnvironment = process.env,
): SupabaseClient {
  const url = getRequiredEnvironmentValue(environment, 'SUPABASE_URL')
  const publishableKey = getRequiredEnvironmentValue(
    environment,
    'SUPABASE_PUBLISHABLE_KEY',
  )

  return createClient(url, publishableKey, {
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

export function createSupabaseAuthClient(
  accessToken: string,
  environment: SupabaseEnvironment = process.env,
): SupabaseClient {
  const url = getRequiredEnvironmentValue(environment, 'SUPABASE_URL')
  const publishableKey = getRequiredEnvironmentValue(
    environment,
    'SUPABASE_PUBLISHABLE_KEY',
  )

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
