import { useState, type FormEvent } from 'react'
import { createTrip, type Trip } from '../../api'
import { getErrorMessage } from '../../lib/errors'

type TripFormProps = {
  accessToken: string
  onCreated: (trip: Trip) => void
  onCancel: () => void
}

export function TripForm({ accessToken, onCreated, onCancel }: TripFormProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const trip = await createTrip(accessToken, { name, startDate, endDate })
      onCreated(trip)
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="mt-6 rounded-2xl border border-[#b9d1be] bg-[#f0f5ed] p-5"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h3 className="font-semibold text-[#274b48]">Lag en ny reise</h3>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-[#69726c]">
          Navn på reisen
          <input
            className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
            onChange={(event) => setName(event.target.value)}
            placeholder="For eksempel Sommer i Italia"
            required
            value={name}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-[#69726c]">
            Fra
            <input
              className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
              onChange={(event) => setStartDate(event.target.value)}
              required
              type="date"
              value={startDate}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[#69726c]">
            Til
            <input
              className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
              onChange={(event) => setEndDate(event.target.value)}
              required
              type="date"
              value={endDate}
            />
          </label>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-[#9b4e36]">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
          onClick={onCancel}
          type="button"
        >
          Avbryt
        </button>
        <button
          className="rounded-xl bg-[#274b48] px-4 py-2.5 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Lagrer ...' : 'Opprett reise'}
        </button>
      </div>
    </form>
  )
}
