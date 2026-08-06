import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from './lib/errors'
import { getSupabaseClient } from './lib/supabase'
import { LoginScreen } from './features/auth/LoginScreen'
import { TripDashboard } from './features/trips/TripDashboard'

export default function App() {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    let unsubscribe = () => {}

    async function initializeAuth() {
      try {
        const client = getSupabaseClient()
        const { data, error } = await client.auth.getSession()

        if (error) {
          throw error
        }

        if (isMounted) {
          setSession(data.session)
          setIsAuthReady(true)
        }

        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((_event, nextSession) => {
          if (isMounted) {
            setSession(nextSession)
          }
        })
        unsubscribe = () => subscription.unsubscribe()
      } catch (reason: unknown) {
        if (isMounted) {
          setAuthError(getErrorMessage(reason))
          setIsAuthReady(true)
        }
      }
    }

    void initializeAuth()

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  if (!isAuthReady) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f1ea] text-[#69726c]">{t('common.loading')}</div>
  }

  if (authError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f1ea] px-5 text-center text-[#9b4e36]">
        <p className="max-w-md rounded-2xl border border-[#e7b5a3] bg-[#fff6f1] p-5">{authError}</p>
      </main>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return (
    <Routes>
      <Route element={<TripDashboard session={session} />} path="/" />
      <Route element={<TripDashboard session={session} />} path="/trips/:tripId" />
      <Route
        element={<TripDashboard session={session} />}
        path="/trips/:tripId/travel"
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}
