import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getSupabaseClient,
  setSessionPersistencePreference,
} from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

export function LoginScreen() {
  const { t } = useTranslation()
  const [rememberSession, setRememberSession] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle() {
    setIsLoading(true)
    setError(null)
    setSessionPersistencePreference(rememberSession)

    try {
      const client = getSupabaseClient(rememberSession)
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (signInError) {
        throw signInError
      }
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-5 py-10 text-[#27302f]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#e1dbd0] bg-[#faf8f3] p-7 shadow-[0_20px_60px_rgba(39,75,72,0.1)] sm:p-10">
        <div className="mb-12 flex items-center justify-between gap-3 font-semibold tracking-tight text-[#274b48]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#274b48] text-lg text-[#f9f5ed]">✦</span>
            <span>planleggreise</span>
          </div>
          <LanguageSwitcher />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d06f4c]">{t('auth.tagline')}</p>
        <h1 className="mt-4 text-4xl font-medium leading-tight tracking-[-0.04em] text-[#274b48]">
          {t('auth.heading')}
        </h1>
        <p className="mt-5 leading-7 text-[#69726c]">
          {t('auth.description')}
        </p>

        {error && (
          <p className="mt-6 rounded-xl border border-[#e7b5a3] bg-[#fff6f1] p-4 text-sm text-[#9b4e36]">
            {error}
          </p>
        )}

        <button
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#274b48] px-5 py-3.5 font-semibold text-[#f9f5ed] transition hover:bg-[#1c3b38] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void signInWithGoogle()}
          type="button"
        >
          <span className="grid size-6 place-items-center rounded-full bg-white text-sm font-bold text-[#4285f4]">G</span>
          {isLoading ? t('auth.openingGoogle') : t('auth.continueWithGoogle')}
        </button>

        <label className="mt-5 flex items-center gap-3 text-sm text-[#69726c]">
          <input
            checked={rememberSession}
            className="size-4 accent-[#274b48]"
            onChange={(event) => setRememberSession(event.target.checked)}
            type="checkbox"
          />
          <span>{t('auth.rememberMe')}</span>
        </label>
      </section>
    </main>
  )
}
