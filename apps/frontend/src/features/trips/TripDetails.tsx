import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createActivity,
  deleteActivity,
  updateTripDay,
  updateActivity,
  type Activity,
  type TripDetail,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { formatDate, formatDateRange } from '../../lib/date-format'
import {
  formatActivityTime,
  sortActivities,
} from '../../lib/activity-format'
import { TripAuxiliaryDetails } from './TripAuxiliaryDetails'
import { TripSettings } from './TripSettings'

type TripDetailsProps = {
  accessToken: string
  trip: TripDetail | null
  isLoading: boolean
  error: string | null
  onTripUpdated: (trip: TripDetail) => void
  onTripDeleted: (trip: TripDetail) => Promise<void>
}

export function TripDetails({
  accessToken,
  trip,
  isLoading,
  error,
  onTripUpdated,
  onTripDeleted,
}: TripDetailsProps) {
  const { t } = useTranslation()
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [title, setTitle] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [activityMode, setActivityMode] = useState<'manual' | 'googleMaps'>('manual')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)
  const [editingDayDate, setEditingDayDate] = useState<string | null>(null)
  const [dayNotes, setDayNotes] = useState('')
  const [isSavingDayNote, setIsSavingDayNote] = useState(false)

  if (isLoading) {
    return <div className="mt-6 h-48 animate-pulse rounded-2xl bg-[#eee8dd]" />
  }

  if (error) {
    return <p className="mt-6 text-sm text-[#9b4e36]">{error}</p>
  }

  if (!trip) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-[#c9c1b5] p-6 text-sm text-[#69726c]">
        {t('tripDetails.selectTrip')}
      </p>
    )
  }

  const currentTrip = trip

  function resetActivityForm() {
    setTitle('')
    setGoogleMapsUrl('')
    setNotes('')
    setActivityMode('manual')
    setStartTime('')
    setEndTime('')
    setAllDay(false)
    setEditingActivityId(null)
    setActivityError(null)
  }

  function toggleActivityForm(date: string) {
    setOpenDay((currentDate) => {
      const nextDate = currentDate === date ? null : date
      if (nextDate === null) {
        resetActivityForm()
      } else {
        resetActivityForm()
      }
      return nextDate
    })
    setActivityError(null)
  }

  function editActivity(activity: Activity) {
    setOpenDay(activity.tripDate)
    setEditingActivityId(activity.id)
    setTitle(activity.title)
    setGoogleMapsUrl(activity.googleMapsUrl ?? '')
    setNotes(activity.notes ?? '')
    setActivityMode(activity.googleMapsUrl ? 'googleMaps' : 'manual')
    setStartTime(activity.startTime ?? '')
    setEndTime(activity.endTime ?? '')
    setAllDay(activity.allDay)
    setActivityError(null)
  }

  async function handleSaveActivity(event: FormEvent<HTMLFormElement>, date: string) {
    event.preventDefault()
    setIsSaving(true)
    setActivityError(null)

    try {
      const input = {
        tripDate: date,
        title: activityMode === 'googleMaps' ? 'Google Maps place' : title,
        startTime: allDay || !startTime ? null : startTime,
        endTime: allDay || !endTime ? null : endTime,
        allDay,
        notes,
        googleMapsUrl: activityMode === 'googleMaps' ? googleMapsUrl : null,
        placeName: null,
        placeAddress: null,
      }
      const activity = editingActivityId
        ? await updateActivity(
            accessToken,
            currentTrip.id,
            editingActivityId,
            input,
          )
        : await createActivity(accessToken, currentTrip.id, input)

      onTripUpdated({
        ...currentTrip,
        days: currentTrip.days.map((day) =>
          day.date === date
            ? {
                ...day,
                activities: sortActivities(
                  editingActivityId
                    ? day.activities.map((currentActivity) =>
                        currentActivity.id === editingActivityId
                          ? activity
                          : currentActivity,
                      )
                    : [...day.activities, activity],
                ),
              }
            : day,
        ),
      })
      resetActivityForm()
      setOpenDay(null)
    } catch (reason: unknown) {
      setActivityError(getErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteActivity(activity: Activity) {
    setDeletingActivityId(activity.id)
    setActivityError(null)

    try {
      await deleteActivity(accessToken, currentTrip.id, activity.id)
      onTripUpdated({
        ...currentTrip,
        days: currentTrip.days.map((day) => ({
          ...day,
          activities: day.activities.filter((current) => current.id !== activity.id),
        })),
      })
    } catch (reason: unknown) {
      setActivityError(getErrorMessage(reason))
    } finally {
      setDeletingActivityId(null)
    }
  }

  function editDayNote(date: string, note: string | null) {
    setEditingDayDate(date)
    setDayNotes(note ?? '')
  }

  async function handleSaveDayNote(date: string) {
    setIsSavingDayNote(true)
    setActivityError(null)

    try {
      const updatedDay = await updateTripDay(accessToken, currentTrip.id, date, {
        notes: dayNotes,
      })
      onTripUpdated({
        ...currentTrip,
        days: currentTrip.days.map((day) =>
          day.date === date ? { ...day, notes: updatedDay.notes } : day,
        ),
      })
      setEditingDayDate(null)
    } catch (reason: unknown) {
      setActivityError(getErrorMessage(reason))
    } finally {
      setIsSavingDayNote(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl bg-[#274b48] p-5 text-[#f9f5ed]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#b9d1be]">{formatDateRange(trip)}</p>
            <h3 className="mt-2 text-2xl font-medium">{trip.name}</h3>
            <p className="mt-2 text-sm text-[#b9d1be]">
              {t('tripDetails.daysToFill', { count: trip.days.length })}
            </p>
          </div>
          <button
            aria-expanded={showSettings}
            aria-label={t('tripDetails.settings')}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-xl text-[#f9f5ed] hover:bg-[#35605c]"
            onClick={() => setShowSettings((current) => !current)}
            type="button"
          >
            ⚙
          </button>
        </div>
      </div>
      {showSettings && (
        <TripSettings
          accessToken={accessToken}
          onClose={() => setShowSettings(false)}
          onDelete={onTripDeleted}
          onSaved={onTripUpdated}
          trip={trip}
        />
      )}
      {activityError && (
        <p className="mt-4 rounded-xl border border-[#e7b5a3] bg-[#fff6f1] p-3 text-sm text-[#9b4e36]">
          {activityError}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {trip.days.map((day) => (
          <div
            className="rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-4"
            key={day.date}
          >
            <div className="flex items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e5b76b]/50 text-sm font-semibold text-[#274b48]">
                {day.dayNumber}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#274b48]">{formatDate(day.date)}</p>
                <p className="mt-1 text-sm text-[#69726c]">
                  {day.activities.length === 0
                    ? t('tripDetails.noPlans')
                    : t('tripDetails.activitiesCount', { count: day.activities.length })}
                </p>
                {day.notes?.trim() && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#69726c]">
                    {day.notes}
                  </p>
                )}
              </div>
              <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                <button
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-[#274b48] hover:bg-[#e6eee3]"
                  onClick={() => toggleActivityForm(day.date)}
                  type="button"
                >
                  {openDay === day.date ? t('common.close') : t('tripDetails.add')}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#69726c] hover:bg-[#e6eee3]"
                  onClick={() => editDayNote(day.date, day.notes)}
                  type="button"
                >
                  {day.notes?.trim()
                    ? t('tripDetails.editDayNote')
                    : t('tripDetails.addDayNote')}
                </button>
              </div>
            </div>

            {editingDayDate === day.date && (
              <div className="mt-4 grid gap-3 border-t border-[#ded6ca] pt-4">
                <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                  {t('tripDetails.dayNote')}
                  <textarea
                    className="min-h-20 resize-y rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                    onChange={(event) => setDayNotes(event.target.value)}
                    placeholder={t('tripDetails.notesPlaceholder')}
                    value={dayNotes}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
                    onClick={() => setEditingDayDate(null)}
                    type="button"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className="rounded-xl bg-[#274b48] px-3 py-2 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:opacity-60"
                    disabled={isSavingDayNote}
                    onClick={() => void handleSaveDayNote(day.date)}
                    type="button"
                  >
                    {isSavingDayNote ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </div>
            )}

            {day.activities.length > 0 && (
              <div className="mt-4 grid gap-2 border-t border-[#ded6ca] pt-3">
                {sortActivities(day.activities).map((activity) => (
                  <div className="flex items-start gap-3 rounded-xl bg-[#faf8f3] p-3" key={activity.id}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#274b48]">
                        {activity.title}
                      </p>
                      {activity.placeAddress && (
                        <p className="mt-1 text-sm text-[#69726c]">
                          {activity.placeAddress}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-[#69726c]">
                        {formatActivityTime(activity, {
                          allDay: t('tripDetails.allDay'),
                          timeNotSet: t('tripDetails.timeNotSet'),
                        })}
                      </p>
                      {activity.googleMapsUrl && (
                        <a
                          className="mt-2 inline-block text-sm font-semibold text-[#274b48] underline"
                          href={activity.googleMapsUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t('tripDetails.openGoogleMaps')}
                        </a>
                      )}
                    </div>
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-[#274b48] hover:bg-[#e6eee3]"
                      onClick={() => editActivity(activity)}
                      type="button"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9b4e36] hover:bg-[#fff0e9] disabled:opacity-50"
                      disabled={deletingActivityId === activity.id}
                      onClick={() => void handleDeleteActivity(activity)}
                      type="button"
                    >
                      {deletingActivityId === activity.id ? '...' : t('common.delete')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {openDay === day.date && (
              <form
                className="mt-4 grid gap-3 border-t border-[#ded6ca] pt-4"
                onSubmit={(event) => void handleSaveActivity(event, day.date)}
              >
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#e6eee3] p-1">
                  <button
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      activityMode === 'manual'
                        ? 'bg-[#faf8f3] text-[#274b48] shadow-sm'
                        : 'text-[#69726c]'
                    }`}
                    onClick={() => setActivityMode('manual')}
                    type="button"
                  >
                    {t('tripDetails.manualActivity')}
                  </button>
                  <button
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      activityMode === 'googleMaps'
                        ? 'bg-[#faf8f3] text-[#274b48] shadow-sm'
                        : 'text-[#69726c]'
                    }`}
                    onClick={() => setActivityMode('googleMaps')}
                    type="button"
                  >
                    {t('tripDetails.googleMapsActivity')}
                  </button>
                </div>
                {activityMode === 'manual' ? (
                  <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                    {t('tripDetails.whatToDo')}
                    <input
                      className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={t('tripDetails.activityPlaceholder')}
                      required
                      value={title}
                    />
                  </label>
                ) : (
                  <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                    {t('tripDetails.googleMapsUrl')}
                    <input
                      className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                      onChange={(event) => setGoogleMapsUrl(event.target.value)}
                      placeholder={t('tripDetails.googleMapsPlaceholder')}
                      required
                      type="url"
                      value={googleMapsUrl}
                    />
                    <span className="font-normal">{t('tripDetails.googleMapsHelp')}</span>
                  </label>
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
                    <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                      {t('common.from')}
                      <input
                        className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                        onChange={(event) => setStartTime(event.target.value)}
                        type="time"
                        value={startTime}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                      {t('common.to')}
                      <input
                        className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                        onChange={(event) => setEndTime(event.target.value)}
                        type="time"
                        value={endTime}
                      />
                    </label>
                  </div>
                )}
                <button
                  className="w-full rounded-xl bg-[#274b48] px-4 py-2.5 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? t('tripDetails.savingActivity')
                    : editingActivityId
                      ? t('tripDetails.saveActivityChanges')
                      : t('tripDetails.saveActivity')}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
      <TripAuxiliaryDetails
        accessToken={accessToken}
        onTripUpdated={onTripUpdated}
        trip={currentTrip}
      />
    </div>
  )
}
