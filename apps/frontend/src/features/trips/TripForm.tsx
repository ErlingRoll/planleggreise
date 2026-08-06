import { useState, type FormEvent } from 'react'
import { createTrip, type Trip } from '../../api'
import { DatePicker } from '../../components/DatePicker'
import { getErrorMessage } from '../../lib/errors'
import { getTripDurationMessage, shiftDate } from '../../lib/trip-dates'

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

    if (!startDate || !endDate) {
      setError('Velg både startdato og sluttdato.')
      return
    }

    if (endDate < startDate) {
      setError('Sluttdatoen må være på eller etter startdatoen.')
      return
    }

    const durationError = getTripDurationMessage(startDate, endDate)

    if (durationError) {
      setError(durationError)
      return
    }

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
          <DatePicker
            label="Fra"
            onChange={(date) => {
              setStartDate(date)
              const maximumEndDate = shiftDate(date, 59)
              if (!endDate || endDate < date) {
                setEndDate(date)
              } else if (endDate > maximumEndDate) {
                setEndDate(maximumEndDate)
              }
            }}
            maxDate={endDate ? shiftDate(endDate, -59) : undefined}
            value={startDate}
          />
          <DatePicker
            label="Til"
            maxDate={startDate ? shiftDate(startDate, 59) : undefined}
            minDate={startDate}
            onChange={setEndDate}
            value={endDate}
          />
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
