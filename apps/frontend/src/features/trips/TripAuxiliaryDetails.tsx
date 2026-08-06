import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createHousingStay,
  createMeal,
  deleteHousingStay,
  deleteMeal,
  updateHousingStay,
  updateMeal,
  type HousingStay,
  type Meal,
  type TripDetail,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { formatActivityTime } from '../../lib/activity-format'
import { shiftDate } from '../../lib/trip-dates'

type TripAuxiliaryDetailsProps = {
  accessToken: string
  trip: TripDetail
  onTripUpdated: (trip: TripDetail) => void
}

type FormMode = 'housing' | 'meal' | null

export function TripAuxiliaryDetails({
  accessToken,
  trip,
  onTripUpdated,
}: TripAuxiliaryDetailsProps) {
  const { t } = useTranslation()
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [checkIn, setCheckIn] = useState(trip.startDate)
  const [checkOut, setCheckOut] = useState(shiftDate(trip.endDate, 1))
  const [title, setTitle] = useState('')
  const [tripDate, setTripDate] = useState(trip.startDate)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function resetForm() {
    setFormMode(null)
    setEditingId(null)
    setName('')
    setCheckIn(trip.startDate)
    setCheckOut(shiftDate(trip.endDate, 1))
    setTitle('')
    setTripDate(trip.startDate)
    setStartTime('')
    setEndTime('')
    setAllDay(false)
    setNotes('')
    setError(null)
  }

  function startNewForm(mode: Exclude<FormMode, null>) {
    resetForm()
    setFormMode(mode)
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

  function editMeal(meal: Meal) {
    setFormMode('meal')
    setEditingId(meal.id)
    setTitle(meal.title)
    setTripDate(meal.tripDate)
    setStartTime(meal.startTime ?? '')
    setEndTime(meal.endTime ?? '')
    setAllDay(meal.allDay)
    setNotes(meal.notes ?? '')
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
      } else if (formMode === 'meal') {
        const mealInput = {
          tripDate,
          title,
          startTime: allDay || !startTime ? null : startTime,
          endTime: allDay || !endTime ? null : endTime,
          allDay,
          notes,
        }
        const meal = editingId
          ? await updateMeal(accessToken, trip.id, editingId, mealInput)
          : await createMeal(accessToken, trip.id, mealInput)
        onTripUpdated({
          ...trip,
          meals: editingId
            ? trip.meals.map((current) =>
                current.id === meal.id ? meal : current,
              )
            : [...trip.meals, meal],
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

  async function handleDeleteMeal(meal: Meal) {
    if (!window.confirm(t('tripDetails.deleteMealConfirmation', { name: meal.title }))) {
      return
    }

    try {
      await deleteMeal(accessToken, trip.id, meal.id)
      onTripUpdated({
        ...trip,
        meals: trip.meals.filter((current) => current.id !== meal.id),
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
            onClick={() => startNewForm('housing')}
            type="button"
          >
            {t('tripDetails.add')}
          </button>
        </div>
        {trip.housingStays.length === 0 ? (
          <p className="mt-3 text-sm text-[#69726c]">{t('tripDetails.noHousing')}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {trip.housingStays.map((stay) => (
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

      <div className="rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[#274b48]">{t('tripDetails.meals')}</h3>
          <button
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[#274b48] hover:bg-[#e6eee3]"
            onClick={() => startNewForm('meal')}
            type="button"
          >
            {t('tripDetails.add')}
          </button>
        </div>
        {trip.meals.length === 0 ? (
          <p className="mt-3 text-sm text-[#69726c]">{t('tripDetails.noMeals')}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {trip.meals.map((meal) => (
              <div className="rounded-xl bg-[#faf8f3] p-3" key={meal.id}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#274b48]">{meal.title}</p>
                    <p className="mt-1 text-sm text-[#69726c]">
                      {meal.tripDate} ·{' '}
                      {formatActivityTime(meal, {
                        allDay: t('tripDetails.allDay'),
                        timeNotSet: t('tripDetails.timeNotSet'),
                      })}
                    </p>
                    {meal.notes?.trim() && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#69726c]">
                        {meal.notes}
                      </p>
                    )}
                  </div>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#274b48] hover:bg-[#e6eee3]"
                    onClick={() => editMeal(meal)}
                    type="button"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9b4e36] hover:bg-[#fff0e9]"
                    onClick={() => void handleDeleteMeal(meal)}
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
            {formMode === 'housing'
              ? t('tripDetails.housingFormTitle')
              : t('tripDetails.mealFormTitle')}
          </h3>
          <div className="mt-4 grid gap-3">
            {formMode === 'housing' ? (
              <>
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
                  <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                    {t('tripDetails.checkIn')}
                    <input
                      className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                      onChange={(event) => setCheckIn(event.target.value)}
                      required
                      type="date"
                      value={checkIn}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                    {t('tripDetails.checkOut')}
                    <input
                      className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                      onChange={(event) => setCheckOut(event.target.value)}
                      required
                      type="date"
                      value={checkOut}
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                  {t('tripDetails.mealName')}
                  <input
                    className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    value={title}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                  {t('tripDetails.date')}
                  <input
                    className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                    max={trip.endDate}
                    min={trip.startDate}
                    onChange={(event) => setTripDate(event.target.value)}
                    required
                    type="date"
                    value={tripDate}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-[#69726c]">
                  <input
                    checked={allDay}
                    className="size-4 accent-[#274b48]"
                    onChange={(event) => setAllDay(event.target.checked)}
                    type="checkbox"
                  />
                  {t('tripDetails.allDay')}
                </label>
                {!allDay && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      aria-label={t('common.from')}
                      className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                      onChange={(event) => setStartTime(event.target.value)}
                      type="time"
                      value={startTime}
                    />
                    <input
                      aria-label={t('common.to')}
                      className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                      onChange={(event) => setEndTime(event.target.value)}
                      type="time"
                      value={endTime}
                    />
                  </div>
                )}
              </>
            )}
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
