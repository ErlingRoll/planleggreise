import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createHousingStay,
  deleteHousingStay,
  updateHousingStay,
  type HousingStay,
  type TripDetail,
} from '../../api'
import { DatePicker } from '../../components/DatePicker'
import { getErrorMessage } from '../../lib/errors'
import { shiftDate } from '../../lib/trip-dates'

type TripAuxiliaryDetailsProps = {
  accessToken: string
  trip: TripDetail
  onTripUpdated: (trip: TripDetail) => void
  selectedDayDate?: string
  selectedDayDates?: string[]
}

type FormMode = 'housing' | null

export function TripAuxiliaryDetails({
  accessToken,
  trip,
  onTripUpdated,
  selectedDayDate,
  selectedDayDates,
}: TripAuxiliaryDetailsProps) {
  const { t } = useTranslation()
  const visibleHousingStays = selectedDayDates
    ? trip.housingStays.filter(
        (stay) =>
          selectedDayDates.some(
            (dayDate) =>
              stay.checkIn <= dayDate && dayDate < stay.checkOut,
          ),
      )
    : trip.housingStays
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [checkIn, setCheckIn] = useState(trip.startDate)
  const [checkOut, setCheckOut] = useState(shiftDate(trip.endDate, 1))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function resetForm() {
    setFormMode(null)
    setEditingId(null)
    setName('')
    setCheckIn(trip.startDate)
    setCheckOut(shiftDate(trip.endDate, 1))
    setNotes('')
    setError(null)
  }

  function startNewForm() {
    resetForm()
    if (selectedDayDate) {
      setCheckIn(selectedDayDate)
      setCheckOut(shiftDate(selectedDayDate, 1))
    }
    setFormMode('housing')
  }

  function editHousing(stay: HousingStay) {
    setFormMode('housing')
    setEditingId(stay.id)
    setName(stay.name)
    setCheckIn(stay.checkIn)
    setCheckOut(stay.checkOut)
    setNotes(stay.notes ?? '')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      if (formMode === 'housing') {
        const stay = editingId
          ? await updateHousingStay(accessToken, trip.id, editingId, {
              name,
              checkIn,
              checkOut,
              notes,
            })
          : await createHousingStay(accessToken, trip.id, {
              name,
              checkIn,
              checkOut,
              notes,
            })
        onTripUpdated({
          ...trip,
          housingStays: editingId
            ? trip.housingStays.map((current) =>
                current.id === stay.id ? stay : current,
              )
            : [...trip.housingStays, stay],
        })
      }
      resetForm()
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteHousing(stay: HousingStay) {
    if (!window.confirm(t('tripDetails.deleteHousingConfirmation', { name: stay.name }))) {
      return
    }

    try {
      await deleteHousingStay(accessToken, trip.id, stay.id)
      onTripUpdated({
        ...trip,
        housingStays: trip.housingStays.filter((current) => current.id !== stay.id),
      })
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    }
  }

  return (
    <section className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[#274b48]">{t('tripDetails.housing')}</h3>
          <button
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[#274b48] hover:bg-[#e6eee3]"
            onClick={startNewForm}
            type="button"
          >
            {t('tripDetails.add')}
          </button>
        </div>
        {visibleHousingStays.length === 0 ? (
          <p className="mt-3 text-sm text-[#69726c]">{t('tripDetails.noHousing')}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {visibleHousingStays.map((stay) => (
              <div className="rounded-xl bg-[#faf8f3] p-3" key={stay.id}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#274b48]">{stay.name}</p>
                    <p className="mt-1 text-sm text-[#69726c]">
                      {stay.checkIn} – {stay.checkOut}
                    </p>
                    {stay.notes?.trim() && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#69726c]">
                        {stay.notes}
                      </p>
                    )}
                  </div>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#274b48] hover:bg-[#e6eee3]"
                    onClick={() => editHousing(stay)}
                    type="button"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9b4e36] hover:bg-[#fff0e9]"
                    onClick={() => void handleDeleteHousing(stay)}
                    type="button"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formMode && (
        <form
          className="rounded-2xl border border-[#b9d1be] bg-[#f0f5ed] p-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <h3 className="font-semibold text-[#274b48]">
            {t('tripDetails.housingFormTitle')}
          </h3>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                  {t('tripDetails.housingName')}
                  <input
                    className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <DatePicker
                label={t('tripDetails.checkIn')}
                onChange={setCheckIn}
                value={checkIn}
              />
              <DatePicker
                label={t('tripDetails.checkOut')}
                onChange={setCheckOut}
                value={checkOut}
              />
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
              {t('tripDetails.notes')}
              <textarea
                className="min-h-20 resize-y rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('tripDetails.notesPlaceholder')}
                value={notes}
              />
            </label>
            {error && <p className="text-sm text-[#9b4e36]">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
                onClick={resetForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="rounded-xl bg-[#274b48] px-3 py-2 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  )
}
