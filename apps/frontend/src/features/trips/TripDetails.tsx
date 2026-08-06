import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createActivity,
  deleteActivity,
  type Activity,
  type TripDetail,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { formatDate, formatDateRange } from '../../lib/date-format'
import { TripSettings } from './TripSettings'

type TripDetailsProps = {
  accessToken: string
  trip: TripDetail | null
  isLoading: boolean
  error: string | null
  onTripUpdated: (trip: TripDetail) => void
  onTripDeleted: (trip: TripDetail) => Promise<void>
}

function sortActivities(activities: Activity[]) {
  return [...activities].sort((left, right) => {
    if (!left.startTime && !right.startTime) {
      return left.sortOrder - right.sortOrder
    }
    if (!left.startTime) {
      return 1
    }
    if (!right.startTime) {
      return -1
    }
    return left.startTime.localeCompare(right.startTime)
  })
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
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)

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

  function formatActivityTime(activity: Activity) {
    if (activity.allDay) {
      return t('tripDetails.allDay')
    }
    if (activity.startTime && activity.endTime) {
      return `${activity.startTime}–${activity.endTime}`
    }
    return activity.startTime ?? activity.endTime ?? t('tripDetails.timeNotSet')
  }

  function resetActivityForm() {
    setTitle('')
    setStartTime('')
    setEndTime('')
    setAllDay(false)
    setActivityError(null)
  }

  function toggleActivityForm(date: string) {
    setOpenDay((currentDate) => {
      const nextDate = currentDate === date ? null : date
      if (nextDate === null) {
        resetActivityForm()
      }
      return nextDate
    })
    setActivityError(null)
  }

  async function handleCreateActivity(event: FormEvent<HTMLFormElement>, date: string) {
    event.preventDefault()
    setIsSaving(true)
    setActivityError(null)

    try {
      const activity = await createActivity(accessToken, currentTrip.id, {
        tripDate: date,
        title,
        startTime: allDay || !startTime ? null : startTime,
        endTime: allDay || !endTime ? null : endTime,
        allDay,
        notes: null,
      })

      onTripUpdated({
        ...currentTrip,
        days: currentTrip.days.map((day) =>
          day.date === date
            ? { ...day, activities: sortActivities([...day.activities, activity]) }
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
              </div>
              <button
                className="ml-auto shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-[#274b48] hover:bg-[#e6eee3]"
                onClick={() => toggleActivityForm(day.date)}
                type="button"
              >
                {openDay === day.date ? t('common.close') : t('tripDetails.add')}
              </button>
            </div>

            {day.activities.length > 0 && (
              <div className="mt-4 grid gap-2 border-t border-[#ded6ca] pt-3">
                {sortActivities(day.activities).map((activity) => (
                  <div className="flex items-start gap-3 rounded-xl bg-[#faf8f3] p-3" key={activity.id}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#274b48]">{activity.title}</p>
                      <p className="mt-1 text-sm text-[#69726c]">{formatActivityTime(activity)}</p>
                    </div>
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
                onSubmit={(event) => void handleCreateActivity(event, day.date)}
              >
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
                  {isSaving ? t('tripDetails.savingActivity') : t('tripDetails.saveActivity')}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
