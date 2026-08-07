import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!startDate || !endDate) {
      setError(t('tripForm.datesRequired'))
      return
    }

    if (endDate < startDate) {
      setError(t('errors.tripDatesInvalid'))
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
      const trip = await createTrip(accessToken, {
        name,
        startDate,
        endDate,
        notes,
      })
      onCreated(trip)
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="mt-6 rounded-2xl border border-border-soft bg-surface-soft p-5"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h3 className="font-semibold text-brand">{t('tripForm.title')}</h3>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-muted">
          {t('tripForm.name')}
          <input
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
            onChange={(event) => setName(event.target.value)}
            placeholder={t('tripForm.namePlaceholder')}
            required
            value={name}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-muted">
          {t('tripForm.notes')}
          <textarea
            className="min-h-24 resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('tripForm.notesPlaceholder')}
            value={notes}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            label={t('tripForm.startDate')}
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
            label={t('tripForm.endDate')}
            maxDate={startDate ? shiftDate(startDate, 59) : undefined}
            minDate={startDate}
            onChange={setEndDate}
            value={endDate}
          />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface-muted"
          onClick={onCancel}
          type="button"
        >
          {t('tripForm.cancel')}
        </button>
        <button
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? t('tripForm.creating') : t('tripForm.create')}
        </button>
      </div>
    </form>
  )
}
