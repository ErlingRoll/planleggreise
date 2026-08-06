import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { updateTrip, type TripDetail } from '../../api'
import { DatePicker } from '../../components/DatePicker'
import { getErrorMessage } from '../../lib/errors'
import { getTripDurationMessage, shiftDate } from '../../lib/trip-dates'

type TripSettingsProps = {
  accessToken: string
  trip: TripDetail
  onSaved: (trip: TripDetail) => void
  onClose: () => void
  onDelete: (trip: TripDetail) => Promise<void>
}

export function TripSettings({
  accessToken,
  trip,
  onSaved,
  onClose,
  onDelete,
}: TripSettingsProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(trip.name)
  const [notes, setNotes] = useState(trip.notes ?? '')
  const [startDate, setStartDate] = useState(trip.startDate)
  const [endDate, setEndDate] = useState(trip.endDate)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setName(trip.name)
    setNotes(trip.notes ?? '')
    setStartDate(trip.startDate)
    setEndDate(trip.endDate)
    setError(null)
  }, [trip])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!startDate || !endDate) {
      setError(t('tripSettings.datesRequired'))
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
      const updatedTrip = await updateTrip(accessToken, trip.id, {
        name,
        startDate,
        endDate,
        notes,
      })
      onSaved(updatedTrip)
      onClose()
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      t('tripSettings.deleteConfirmation', { name: trip.name }),
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    await onDelete(trip)
    setIsDeleting(false)
  }

  return (
    <section className="mt-4 rounded-2xl border border-[#d9d4ca] bg-[#faf8f3] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-[#274b48]">{t('tripSettings.title')}</h4>
          <p className="mt-1 text-sm text-[#69726c]">
            {t('tripSettings.description')}
          </p>
        </div>
        <button
          aria-label={t('tripSettings.close')}
          className="grid size-9 place-items-center rounded-lg text-xl text-[#69726c] hover:bg-[#e6eee3]"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="grid gap-2 text-sm font-medium text-[#69726c]">
          {t('tripSettings.name')}
          <input
            className="rounded-xl border border-[#d9d4ca] bg-white px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#69726c]">
          {t('tripSettings.notes')}
          <textarea
            className="min-h-24 resize-y rounded-xl border border-[#d9d4ca] bg-white px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('tripSettings.notesPlaceholder')}
            value={notes}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            label={t('tripSettings.startDate')}
            onChange={(date) => {
              setStartDate(date)
              const maximumEndDate = shiftDate(date, 59)
              if (endDate < date) {
                setEndDate(date)
              } else if (endDate > maximumEndDate) {
                setEndDate(maximumEndDate)
              }
            }}
            maxDate={endDate ? shiftDate(endDate, -59) : undefined}
            value={startDate}
          />
          <DatePicker
            label={t('tripSettings.endDate')}
            maxDate={shiftDate(startDate, 59)}
            minDate={startDate}
            onChange={setEndDate}
            value={endDate}
          />
        </div>

        {error && <p className="text-sm text-[#9b4e36]">{error}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-[#e1dbd0] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="rounded-xl border border-[#e7b5a3] px-4 py-2.5 text-sm font-semibold text-[#9b4e36] hover:bg-[#fff0e9] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDeleting || isSaving}
            onClick={() => void handleDelete()}
            type="button"
          >
            {isDeleting ? t('tripSettings.deleting') : t('tripSettings.delete')}
          </button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
              onClick={onClose}
              type="button"
            >
              {t('tripSettings.cancel')}
            </button>
            <button
              className="rounded-xl bg-[#274b48] px-4 py-2.5 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:opacity-60"
              disabled={isSaving || isDeleting}
              type="submit"
            >
              {isSaving ? t('tripSettings.saving') : t('tripSettings.save')}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
