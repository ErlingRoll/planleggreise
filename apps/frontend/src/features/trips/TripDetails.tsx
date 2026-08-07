import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  createActivity,
  createMeal,
  deleteActivity,
  deleteMeal,
  getTrip,
  reorderDayItems,
  updateTripDay,
  updateActivity,
  updateMeal,
  type Activity,
  type Meal,
  type ReorderDayItemInput,
  type TripDetail,
} from '../../api'
import { getErrorMessage, isGoogleMapsError } from '../../lib/errors'
import { formatDate, formatDateRange } from '../../lib/date-format'
import { DatePicker } from '../../components/DatePicker'
import {
  formatActivityTime,
  getDayItemTitle,
  getDayItemTime,
  sortDayItems,
  sortActivities,
  type DayItem,
} from '../../lib/activity-format'
import { LoadingCover } from '../../components/LoadingCover'
import { TimePicker } from '../../components/TimePicker'
import { TripAuxiliaryDetails } from './TripAuxiliaryDetails'
import { TripSettings } from './TripSettings'
import { isAllowedGoogleMapsUrl } from '@planleggreise/models'

const daySelectionCookiePrefix = 'planleggreise-selected-days-'
const daySelectionCookieMaxAge = 60 * 60 * 24 * 365

function getDaySelectionCookieName(tripId: string) {
  return `${daySelectionCookiePrefix}${tripId}`
}

function readSelectedDayDates(tripId: string, validDates: string[]) {
  const cookieName = getDaySelectionCookieName(tripId)
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${cookieName}=`))

  if (!cookie) {
    return null
  }

  try {
    const storedDates: unknown = JSON.parse(
      decodeURIComponent(cookie.slice(cookieName.length + 1)),
    )

    if (
      !Array.isArray(storedDates) ||
      !storedDates.every((date): date is string => typeof date === 'string')
    ) {
      return null
    }

    return storedDates.filter((date) => validDates.includes(date))
  } catch {
    return null
  }
}

function writeSelectedDayDates(tripId: string, selectedDates: string[]) {
  const cookieName = getDaySelectionCookieName(tripId)
  document.cookie = [
    `${cookieName}=${encodeURIComponent(JSON.stringify(selectedDates))}`,
    `max-age=${daySelectionCookieMaxAge}`,
    'path=/',
    'samesite=lax',
  ].join('; ')
}

type TripDetailsProps = {
  accessToken: string
  trip: TripDetail | null
  isLoading: boolean
  error: string | null
  onTripUpdated: (trip: TripDetail) => void
  onTripDeleted: (trip: TripDetail) => Promise<void>
}

type DropTarget = {
  dayDate: string
  index: number
}

type MovingItem = DayItemRecord

type PlannerTab = 'all' | 'activities' | 'meals'

type DayItemRecord =
  | { itemType: 'activity'; item: Activity }
  | { itemType: 'meal'; item: Meal }

function shiftTime(value: string, hours: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)

  if (!match) {
    return ''
  }

  const totalMinutes =
    (Number(match[1]) * 60 + Number(match[2]) + hours * 60 + 24 * 60) %
    (24 * 60)

  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(
    totalMinutes % 60,
  ).padStart(2, '0')}`
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
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [editingItemType, setEditingItemType] = useState<
    DayItemRecord['itemType'] | null
  >(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)
  const [editingDayDate, setEditingDayDate] = useState<string | null>(null)
  const [dayTitle, setDayTitle] = useState('')
  const [dayNotes, setDayNotes] = useState('')
  const [isSavingDayDetails, setIsSavingDayDetails] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState('')
  const [selectedDayDates, setSelectedDayDates] = useState<string[]>([])
  const [lastClickedDayDate, setLastClickedDayDate] = useState('')
  const [plannerTab, setPlannerTab] = useState<PlannerTab>('all')
  const [draggedItem, setDraggedItem] = useState<DayItemRecord | null>(null)
  const [movingItem, setMovingItem] = useState<MovingItem | null>(null)
  const [moveTargetDate, setMoveTargetDate] = useState('')
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const reorderQueueRef = useRef(Promise.resolve())
  const pendingReorderCountRef = useRef(0)

  useEffect(() => {
    if (trip) {
      const validDates = trip.days.map((day) => day.date)
      const persistedDates = readSelectedDayDates(trip.id, validDates)

      setSelectedDayDates(persistedDates ?? validDates)
      setSelectedDayDate((currentDate) =>
        validDates.includes(currentDate)
          ? currentDate
          : validDates[0] ?? '',
      )
      setLastClickedDayDate((currentDate) =>
        validDates.includes(currentDate)
          ? currentDate
          : validDates[0] ?? '',
      )
    }
  }, [trip])

  if (isLoading) {
    return <LoadingCover message={t('common.loadingTrip')} />
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
  const normalizedGoogleMapsUrl = googleMapsUrl.trim()
  const googleMapsUrlIsInvalid =
    normalizedGoogleMapsUrl.length > 0 &&
    !isAllowedGoogleMapsUrl(normalizedGoogleMapsUrl)
  const selectedDay =
    currentTrip.days.find((day) => day.date === selectedDayDate) ??
    currentTrip.days[0]

  function resetActivityForm() {
    setTitle('')
    setGoogleMapsUrl('')
    setNotes('')
    setStartTime('')
    setEndTime('')
    setAllDay(true)
    setEditingItemType(null)
    setEditingItemId(null)
    setActivityError(null)
    setGoogleMapsError(null)
    setMovingItem(null)
    setMoveTargetDate('')
  }

  function toggleActivityForm(date: string) {
    setOpenDay((currentDate) => {
      const nextDate = currentDate === date ? null : date
      resetActivityForm()
      if (nextDate !== null) {
        setEditingItemType(plannerTab === 'meals' ? 'meal' : 'activity')
      }
      return nextDate
    })
    setActivityError(null)
  }

  function editActivity(activity: Activity) {
    setMovingItem(null)
    setOpenDay(activity.tripDate)
    setEditingItemType('activity')
    setEditingItemId(activity.id)
    setTitle(activity.title ?? '')
    setGoogleMapsUrl(activity.googleMapsUrl ?? '')
    setNotes(activity.notes ?? '')
    setStartTime(activity.startTime ?? '')
    setEndTime(activity.endTime ?? '')
    setAllDay(activity.allDay)
    setActivityError(null)
  }

  function editMeal(meal: Meal) {
    setMovingItem(null)
    setOpenDay(meal.tripDate)
    setEditingItemType('meal')
    setEditingItemId(meal.id)
    setTitle(meal.title ?? '')
    setGoogleMapsUrl(meal.googleMapsUrl ?? '')
    setNotes(meal.notes ?? '')
    setStartTime(meal.startTime ?? '')
    setEndTime(meal.endTime ?? '')
    setAllDay(meal.allDay)
    setActivityError(null)
  }

  function handleStartTimeChange(nextStartTime: string) {
    setStartTime(nextStartTime)

    if (nextStartTime && !endTime) {
      setEndTime(shiftTime(nextStartTime, 2))
    }
  }

  function handleEndTimeChange(nextEndTime: string) {
    setEndTime(nextEndTime)

    if (nextEndTime && !startTime) {
      setStartTime(shiftTime(nextEndTime, -2))
    }
  }

  function getDayRange(startDate: string, endDate: string) {
    const startIndex = currentTrip.days.findIndex(
      (day) => day.date === startDate,
    )
    const endIndex = currentTrip.days.findIndex(
      (day) => day.date === endDate,
    )

    if (startIndex < 0 || endIndex < 0) {
      return [endDate]
    }

    const rangeStart = Math.min(startIndex, endIndex)
    const rangeEnd = Math.max(startIndex, endIndex)
    return currentTrip.days
      .slice(rangeStart, rangeEnd + 1)
      .map((day) => day.date)
  }

  function selectOnlyDay(date: string, shiftKey: boolean) {
    const dates =
      shiftKey && lastClickedDayDate
        ? getDayRange(lastClickedDayDate, date)
        : [date]

    setSelectedDayDate(date)
    setSelectedDayDates(dates)
    setLastClickedDayDate(date)
    writeSelectedDayDates(currentTrip.id, dates)
  }

  function toggleDaySelection(date: string, shiftKey: boolean) {
    if (shiftKey && lastClickedDayDate) {
      const dates = getDayRange(lastClickedDayDate, date)
      setSelectedDayDate(date)
      setSelectedDayDates(dates)
      setLastClickedDayDate(date)
      writeSelectedDayDates(currentTrip.id, dates)
      return
    }

    setSelectedDayDates((currentDates) => {
      const nextDates = currentDates.includes(date)
        ? currentDates.filter((currentDate) => currentDate !== date)
        : [...currentDates, date]

      writeSelectedDayDates(currentTrip.id, nextDates)
      setLastClickedDayDate(date)

      if (
        nextDates.length > 0 &&
        !nextDates.includes(selectedDayDate)
      ) {
        setSelectedDayDate(nextDates[0])
      }

      return nextDates
    })
  }

  function selectAllDays() {
    const allDates = currentTrip.days.map((day) => day.date)
    setSelectedDayDates(allDates)
    writeSelectedDayDates(currentTrip.id, allDates)
  }

  function getDropIndex(
    event: DragEvent<HTMLDivElement>,
    itemIndex: number,
  ) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientY >= bounds.top + bounds.height / 2
      ? itemIndex + 1
      : itemIndex
  }

  function getDayItems(
    day: TripDetail['days'][number],
    meals = currentTrip.meals,
  ) {
    return sortDayItems([
      ...day.activities,
      ...meals.filter((meal) => meal.tripDate === day.date),
    ])
  }

  function getDayScheduleSummary(day: TripDetail['days'][number]) {
    const items = getDayItems(day)

    return items.length === 0
      ? t('tripDetails.noPlans')
      : t('tripDetails.plansCount', { count: items.length })
  }

  function getDayItemRecord(item: DayItem, meals = currentTrip.meals): DayItemRecord {
    const meal = meals.find(
      (currentMeal) => currentMeal.id === item.id,
    )

    return meal
      ? { itemType: 'meal', item: meal }
      : { itemType: 'activity', item: item as Activity }
  }

  function buildOptimisticTrip(
    trip: TripDetail,
    affectedDays: Map<string, DayItem[]>,
  ) {
    return {
      ...trip,
      days: trip.days.map((day) => {
        const items = affectedDays.get(day.date)

        if (!items) {
          return day
        }

        return {
          ...day,
          activities: items
            .filter(
              (item): item is Activity =>
                getDayItemRecord(item, trip.meals).itemType === 'activity',
            )
            .map((activity) => ({
              ...activity,
              tripDate: day.date,
              sortOrder: items.findIndex(
                (currentItem) => currentItem.id === activity.id,
              ),
            })),
        }
      }),
      meals: trip.meals.map((meal) => {
        const affectedEntry = Array.from(affectedDays.entries()).find(
          ([, items]) => items.some((item) => item.id === meal.id),
        )

        if (!affectedEntry) {
          return meal
        }

        const [dayDate, items] = affectedEntry
        return {
          ...meal,
          tripDate: dayDate,
          sortOrder: items.findIndex((item) => item.id === meal.id),
        }
      }),
    }
  }

  function getReorderInput(trip: TripDetail): ReorderDayItemInput[] {
    return trip.days.flatMap((day) =>
      getDayItems(day, trip.meals).map((item, sortOrder) => ({
        itemType: getDayItemRecord(item, trip.meals).itemType,
        itemId: item.id,
        tripDate: day.date,
        sortOrder,
      })),
    )
  }

  function insertDayItemByTime(
    items: DayItem[],
    item: DayItem,
    treatAsNewItem = false,
  ) {
    const currentIndex = items.findIndex(
      (currentItem) => currentItem.id === item.id,
    )
    const itemTime = getDayItemTime(item)

    if (itemTime === null && currentIndex >= 0 && !treatAsNewItem) {
      return items.map((currentItem) =>
        currentItem.id === item.id ? item : currentItem,
      )
    }

    const itemsWithoutItem = items.filter(
      (currentItem) => currentItem.id !== item.id,
    )

    if (itemTime === null) {
      return [item, ...itemsWithoutItem]
    }

    if (currentIndex >= 0) {
      const timedItems = items.filter(
        (currentItem) => getDayItemTime(currentItem) !== null,
      )
      const timedItemsWithoutItem = timedItems.filter(
        (currentItem) => currentItem.id !== item.id,
      )
      const firstLaterTimedIndex = timedItemsWithoutItem.findIndex(
        (currentItem) => {
          const candidateTime = getDayItemTime(currentItem)
          return candidateTime !== null && candidateTime > itemTime
        },
      )
      const insertionIndex =
        firstLaterTimedIndex >= 0
          ? firstLaterTimedIndex
          : timedItemsWithoutItem.length
      const reorderedTimedItems = [
        ...timedItemsWithoutItem.slice(0, insertionIndex),
        item,
        ...timedItemsWithoutItem.slice(insertionIndex),
      ]
      let timedItemIndex = 0

      return items.map((currentItem) => {
        if (getDayItemTime(currentItem) === null) {
          return currentItem
        }

        const reorderedItem = reorderedTimedItems[timedItemIndex]
        timedItemIndex += 1
        return reorderedItem
      })
    }

    const firstLaterItemIndex = itemsWithoutItem.findIndex((currentItem) => {
      const candidateTime = getDayItemTime(currentItem)
      return candidateTime !== null && candidateTime > itemTime
    })
    const insertionIndex =
      firstLaterItemIndex >= 0
        ? firstLaterItemIndex
        : itemsWithoutItem.length

    return [
      ...itemsWithoutItem.slice(0, insertionIndex),
      item,
      ...itemsWithoutItem.slice(insertionIndex),
    ]
  }

  function startMovingItem(record: DayItemRecord) {
    setMovingItem(record)
    setMoveTargetDate(record.item.tripDate)
    setEditingItemId(null)
    setEditingItemType(null)
    setActivityError(null)
  }

  function cancelMovingItem() {
    setMovingItem(null)
    setMoveTargetDate('')
  }

  function handleMoveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!movingItem || !moveTargetDate || movingItem.item.tripDate === moveTargetDate) {
      cancelMovingItem()
      return
    }

    const sourceDay = currentTrip.days.find(
      (day) => day.date === movingItem.item.tripDate,
    )
    const targetDay = currentTrip.days.find((day) => day.date === moveTargetDate)

    if (!sourceDay || !targetDay) {
      setActivityError(t('errors.activityOutsideTrip'))
      return
    }

    const sourceItems = getDayItems(sourceDay)
    const nextTargetItems = insertDayItemByTime(
      getDayItems(targetDay),
      movingItem.item,
      true,
    )
    const affectedDays = new Map<string, DayItem[]>([
      [sourceDay.date, sourceItems.filter((item) => item.id !== movingItem.item.id)],
      [targetDay.date, nextTargetItems],
    ])
    const optimisticTrip = buildOptimisticTrip(currentTrip, affectedDays)

    setActivityError(null)
    setMovingItem(null)
    setMoveTargetDate('')
    onTripUpdated(optimisticTrip)
    queueDayItemReorder(optimisticTrip, getReorderInput(optimisticTrip))
  }

  function handleDayItemDragStart(
    event: DragEvent<HTMLDivElement>,
    record: DayItemRecord,
  ) {
    if (window.innerWidth < 1024) {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(
      'text/plain',
      `${record.itemType}:${record.item.id}`,
    )
    setDraggedItem(record)
  }

  function handleDayItemDragOver(
    event: DragEvent<HTMLDivElement>,
    dayDate: string,
    itemIndex: number,
  ) {
    if (!draggedItem) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget({
      dayDate,
      index: getDropIndex(event, itemIndex),
    })
  }

  function handleDayDragOver(event: DragEvent<HTMLDivElement>, dayDate: string) {
    if (
      !draggedItem ||
      event.target !== event.currentTarget
    ) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const day = currentTrip.days.find((currentDay) => currentDay.date === dayDate)
    setDropTarget({
      dayDate,
      index: day ? getDayItems(day).length : 0,
    })
  }

  function queueDayItemReorder(
    trip: TripDetail,
    items: ReorderDayItemInput[],
  ) {
    pendingReorderCountRef.current += 1
    const queuedRequest = reorderQueueRef.current.then(() =>
      reorderDayItems(accessToken, trip.id, items).then(() => undefined),
    )
    reorderQueueRef.current = queuedRequest.catch(() => undefined)

    void queuedRequest
      .then(() => {
        setActivityError(null)
      })
      .catch(async (reason: unknown) => {
        setActivityError(getErrorMessage(reason))

        if (pendingReorderCountRef.current > 1) {
          return
        }

        try {
          const refreshedTrip = await getTrip(accessToken, trip.id)
          onTripUpdated(refreshedTrip)
        } catch (refreshReason: unknown) {
          setActivityError(
            `${getErrorMessage(reason)} ${getErrorMessage(refreshReason)}`,
          )
        }
      })
      .finally(() => {
        pendingReorderCountRef.current -= 1
      })
  }

  function handleDayItemDrop(
    event: DragEvent<HTMLDivElement>,
    targetDate: string,
    rawTargetIndex: number,
  ) {
    event.preventDefault()
    event.stopPropagation()

    const draggedItemKey =
      draggedItem
        ? `${draggedItem.itemType}:${draggedItem.item.id}`
        : event.dataTransfer.getData('text/plain')
    setDropTarget(null)
    setDraggedItem(null)

    if (!draggedItemKey) {
      return
    }

    const [itemType, itemId] = draggedItemKey.split(':')
    if (itemType !== 'activity' && itemType !== 'meal') {
      return
    }

    const draggedRecord =
      draggedItem ??
      (itemType === 'meal'
        ? (() => {
            const meal = currentTrip.meals.find(
              (currentMeal) => currentMeal.id === itemId,
            )
            return meal ? { itemType: 'meal' as const, item: meal } : null
          })()
        : (() => {
            const activity = currentTrip.days
              .flatMap((day) => day.activities)
              .find((currentActivity) => currentActivity.id === itemId)
            return activity
              ? { itemType: 'activity' as const, item: activity }
              : null
          })())
    const sourceDay = currentTrip.days.find((day) =>
      getDayItems(day).some((item) => item.id === itemId),
    )
    const targetDay = currentTrip.days.find((day) => day.date === targetDate)

    if (!sourceDay || !targetDay || !draggedRecord) {
      return
    }

    const sourceItems = getDayItems(sourceDay)
    const targetItems = getDayItems(targetDay).filter(
      (item) => item.id !== itemId,
    )
    const sourceIndex = sourceItems.findIndex((item) => item.id === itemId)
    const targetIndex =
      sourceDay.date === targetDate && sourceIndex < rawTargetIndex
        ? rawTargetIndex - 1
        : rawTargetIndex
    const desiredIndex = Math.max(
      0,
      Math.min(targetIndex, targetItems.length),
    )
    const itemTime = getDayItemTime(draggedRecord.item)
    const firstLaterActivityIndex =
      itemTime === null
        ? -1
        : targetItems.findIndex((item) => {
            const candidateTime = getDayItemTime(item)
            return candidateTime !== null && candidateTime > itemTime
          })
    const insertionIndex =
      firstLaterActivityIndex >= 0
        ? Math.min(desiredIndex, firstLaterActivityIndex)
        : desiredIndex
    const nextTargetItems = [
      ...targetItems.slice(0, insertionIndex),
      draggedRecord.item,
      ...targetItems.slice(insertionIndex),
    ]
    const nextSourceItems =
      sourceDay.date === targetDate
        ? nextTargetItems
        : sourceItems.filter((item) => item.id !== itemId)
    const affectedDays = new Map<string, DayItem[]>([
      [sourceDay.date, nextSourceItems],
      [targetDate, nextTargetItems],
    ])
    const updates = Array.from(affectedDays.entries()).flatMap(
      ([dayDate, items]) =>
        items.map((item, sortOrder) => ({
          item,
          dayDate,
          sortOrder,
          itemType: getDayItemRecord(item).itemType,
        })),
    )
    const changedUpdates = updates.filter(
      ({ item, dayDate, sortOrder }) =>
        item.tripDate !== dayDate || item.sortOrder !== sortOrder,
    )

    if (changedUpdates.length === 0) {
      return
    }

    setActivityError(null)

    const optimisticTrip = buildOptimisticTrip(currentTrip, affectedDays)
    const reorderInput = getReorderInput(optimisticTrip)

    onTripUpdated(optimisticTrip)
    queueDayItemReorder(optimisticTrip, reorderInput)
  }

  function selectNewItemType(itemType: DayItemRecord['itemType']) {
    resetActivityForm()
    setEditingItemType(itemType)
  }

  function renderDayItemForm(date: string) {
    const isMealForm =
      editingItemType === 'meal' ||
      (editingItemId === null && plannerTab === 'meals')

    return (
      <form
        className="mt-3 grid gap-3 rounded-xl border border-[#b9d1be] bg-[#f0f5ed] p-3"
        onSubmit={(event) => void handleSaveDayItem(event, date)}
      >
        {editingItemId === null && (
          <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
            {t('tripDetails.itemType')}
            <select
              className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
              onChange={(event) =>
                selectNewItemType(
                  event.target.value === 'meal' ? 'meal' : 'activity',
                )
              }
              value={editingItemType ?? 'activity'}
            >
              <option value="activity">{t('tripDetails.activity')}</option>
              <option value="meal">{t('tripDetails.meal')}</option>
            </select>
          </label>
        )}
        <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
          {isMealForm ? t('tripDetails.mealName') : t('tripDetails.whatToDo')}
          <input
            className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              isMealForm
                ? t('tripDetails.mealName')
                : t('tripDetails.activityPlaceholder')
            }
            required={!googleMapsUrl.trim()}
            value={title}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
          {t('tripDetails.googleMapsUrl')}
          <input
            aria-invalid={googleMapsUrlIsInvalid}
            className={`rounded-xl border bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none ${
              googleMapsUrlIsInvalid
                ? 'border-[#b42318] focus:border-[#b42318]'
                : 'border-[#d9d4ca] focus:border-[#274b48]'
            }`}
            onChange={(event) => {
              setGoogleMapsUrl(event.target.value)
              setGoogleMapsError(null)
            }}
            placeholder={t('tripDetails.googleMapsPlaceholder')}
            type="url"
            value={googleMapsUrl}
          />
          <span className="font-normal">{t('tripDetails.googleMapsHelp')}</span>
          {googleMapsUrlIsInvalid && (
            <span className="font-normal text-[#b42318]" role="alert">
              {t('errors.googleMapsInvalid')}
            </span>
          )}
          {googleMapsError && (
            <span className="font-normal text-[#b42318]" role="alert">
              {googleMapsError}
            </span>
          )}
        </label>
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
            <TimePicker
              label={t('common.from')}
              onChange={handleStartTimeChange}
              value={startTime}
            />
            <TimePicker
              label={t('common.to')}
              onChange={handleEndTimeChange}
              value={endTime}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
            onClick={() => {
              resetActivityForm()
              setOpenDay(null)
            }}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            className="rounded-xl bg-[#274b48] px-4 py-2.5 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving
              ? t(
                  editingItemType === 'meal'
                    ? 'tripDetails.savingMeal'
                    : 'tripDetails.savingActivity',
                )
              : isMealForm
                ? editingItemId
                  ? t('tripDetails.saveMealChanges')
                  : t('tripDetails.saveMeal')
                : editingItemId
                  ? t('tripDetails.saveActivityChanges')
                  : t('tripDetails.saveActivity')}
          </button>
        </div>
      </form>
    )
  }

  function renderDayItems(
    day: TripDetail['days'][number],
    itemType: PlannerTab = 'all',
  ) {
    const allItems = getDayItems(day)
    const orderedItems =
      itemType === 'meals'
        ? allItems.filter((item) => getDayItemRecord(item).itemType === 'meal')
        : itemType === 'activities'
          ? allItems.filter(
              (item) => getDayItemRecord(item).itemType === 'activity',
            )
          : allItems
    const draggedItemIndex = draggedItem
      ? orderedItems.findIndex((item) => item.id === draggedItem.item.id)
      : -1

    function shouldShowDropIndicator(index: number) {
      const isDraggingWithinThisDay = draggedItemIndex >= 0
      const isCurrentPosition =
        index === draggedItemIndex ||
        index === draggedItemIndex + 1

      return !isDraggingWithinThisDay || !isCurrentPosition
    }

    return (
      <div
        className={`mt-4 grid gap-2 border-t border-[#ded6ca] pt-3 ${
          orderedItems.length === 0 ? 'min-h-2' : ''
        }`}
        onDragOver={(event) => handleDayDragOver(event, day.date)}
        onDrop={(event) =>
          void handleDayItemDrop(event, day.date, getDayItems(day).length)
        }
      >
        {orderedItems.map((item, itemIndex) => {
          const record = getDayItemRecord(item)
          const fullItemIndex = allItems.findIndex(
            (currentItem) => currentItem.id === item.id,
          )

          return (
          <div
            className="rounded-xl bg-[#faf8f3] p-3"
            key={`${record.itemType}:${item.id}`}
          >
            {dropTarget?.dayDate === day.date &&
              dropTarget.index === fullItemIndex && (
                shouldShowDropIndicator(itemIndex) && (
                  <div className="mb-2 h-1 rounded-full bg-[#d06f4c]" />
                )
              )}
            <div
              className="flex items-start gap-3 lg:cursor-grab lg:active:cursor-grabbing"
              draggable
              onDragEnd={() => {
                setDraggedItem(null)
                setDropTarget(null)
              }}
              onDragOver={(event) =>
                handleDayItemDragOver(event, day.date, fullItemIndex)
              }
              onDragStart={(event) =>
                handleDayItemDragStart(event, record)
              }
              onDrop={(event) =>
                void handleDayItemDrop(
                  event,
                  day.date,
                  getDropIndex(event, fullItemIndex),
                )
              }
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#274b48]">
                  {getDayItemTitle(item, t('tripDetails.untitledItem'))}
                </p>
                {record.itemType === 'meal' && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#d06f4c]">
                    {t('tripDetails.meal')}
                  </p>
                )}
                {item.placeAddress && (
                  <p className="mt-1 text-sm text-[#69726c]">
                    {item.placeAddress}
                  </p>
                )}
                <p className="mt-1 text-sm text-[#69726c]">
                  {formatActivityTime(item, {
                    allDay: t('tripDetails.allDay'),
                    timeNotSet: t('tripDetails.timeNotSet'),
                  })}
                </p>
                {item.googleMapsUrl && (
                  <a
                    className="mt-2 inline-block text-sm font-semibold text-[#274b48] underline"
                    href={item.googleMapsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t('tripDetails.openGoogleMaps')}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#274b48] hover:bg-[#e6eee3] disabled:opacity-50"
                  disabled={editingItemId !== null || movingItem !== null}
                  onClick={() =>
                    startMovingItem(record)
                  }
                  type="button"
                >
                  {t('common.move')}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#274b48] hover:bg-[#e6eee3] disabled:opacity-50"
                  disabled={movingItem !== null}
                  onClick={() =>
                    record.itemType === 'meal'
                      ? editMeal(record.item)
                      : editActivity(record.item)
                  }
                  type="button"
                >
                  {t('common.edit')}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9b4e36] hover:bg-[#fff0e9] disabled:opacity-50"
                  disabled={
                    deletingActivityId === item.id ||
                    editingItemId !== null ||
                    movingItem !== null
                  }
                  onClick={() =>
                    void (record.itemType === 'meal'
                      ? handleDeleteMeal(record.item)
                      : handleDeleteActivity(record.item))
                  }
                  type="button"
                >
                  {deletingActivityId === item.id
                    ? '...'
                    : t('common.delete')}
                </button>
              </div>
            </div>
            {openDay === day.date && editingItemId === item.id &&
              renderDayItemForm(day.date)}
            {movingItem?.item.id === item.id && renderMoveItemForm()}
            {dropTarget?.dayDate === day.date &&
              dropTarget.index === fullItemIndex + 1 &&
              itemIndex === orderedItems.length - 1 && (
                shouldShowDropIndicator(itemIndex + 1) && (
                  <div className="mt-2 h-1 rounded-full bg-[#d06f4c]" />
                )
              )}
          </div>
          )
        })}
      </div>
    )
  }

  function renderMoveItemForm() {
    return (
      <form
        className="mt-3 grid gap-3 rounded-xl border border-[#b9d1be] bg-[#f0f5ed] p-3"
        onSubmit={handleMoveItem}
      >
        <DatePicker
          label={t('tripDetails.moveToDate')}
          maxDate={currentTrip.endDate}
          minDate={currentTrip.startDate}
          onChange={setMoveTargetDate}
          value={moveTargetDate}
        />
        <div className="flex justify-end gap-2">
          <button
            className="rounded-xl px-3 py-2 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
            onClick={cancelMovingItem}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            className="rounded-xl bg-[#274b48] px-3 py-2 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38]"
            type="submit"
          >
            {t('common.move')}
          </button>
        </div>
      </form>
    )
  }

  async function handleSaveDayItem(
    event: FormEvent<HTMLFormElement>,
    date: string,
  ) {
    event.preventDefault()
    const normalizedGoogleMapsUrl = googleMapsUrl.trim()

    if (
      normalizedGoogleMapsUrl &&
      !isAllowedGoogleMapsUrl(normalizedGoogleMapsUrl)
    ) {
      setGoogleMapsError(null)
      setActivityError(null)
      return
    }

    setIsSaving(true)
    setActivityError(null)
    setGoogleMapsError(null)

    try {
      const input = {
        tripDate: date,
        title: title.trim() || null,
        startTime: allDay || !startTime ? null : startTime,
        endTime: allDay || !endTime ? null : endTime,
        allDay,
        notes,
        googleMapsUrl: normalizedGoogleMapsUrl || null,
        placeName: null,
        placeAddress: null,
      }
      let nextTrip: TripDetail
      let savedItem: DayItem

      if (editingItemType === 'meal') {
        const meal = editingItemId
          ? await updateMeal(accessToken, currentTrip.id, editingItemId, input)
          : await createMeal(accessToken, currentTrip.id, {
              ...input,
              allDay: allDay,
              notes,
            })

        savedItem = meal
        nextTrip = {
          ...currentTrip,
          meals: editingItemId
            ? currentTrip.meals.map((currentMeal) =>
                currentMeal.id === meal.id ? meal : currentMeal,
              )
            : [...currentTrip.meals, meal],
        }
      } else {
        const activity = editingItemId
          ? await updateActivity(
              accessToken,
              currentTrip.id,
              editingItemId,
              input,
            )
          : await createActivity(accessToken, currentTrip.id, input)

        savedItem = activity
        nextTrip = {
          ...currentTrip,
          days: currentTrip.days.map((day) =>
            day.date === date
              ? {
                  ...day,
                  activities: sortActivities(
                    editingItemId
                      ? day.activities.map((currentActivity) =>
                          currentActivity.id === editingItemId
                            ? activity
                            : currentActivity,
                        )
                      : [...day.activities, activity],
                  ),
                }
              : day,
          ),
        }
      }

      const shouldReorderItem =
        editingItemId !== null ||
        (editingItemType === 'activity' &&
          getDayItemTime(savedItem) === null)
      const targetDay = nextTrip.days.find((day) => day.date === date)

      if (shouldReorderItem && targetDay) {
        const targetItems = insertDayItemByTime(
          getDayItems(targetDay, nextTrip.meals),
          savedItem,
          !editingItemId && editingItemType === 'activity',
        )
        const optimisticTrip = buildOptimisticTrip(
          nextTrip,
          new Map([[date, targetItems]]),
        )
        onTripUpdated(optimisticTrip)
        queueDayItemReorder(
          optimisticTrip,
          getReorderInput(optimisticTrip),
        )
      } else {
        onTripUpdated(nextTrip)
      }
      resetActivityForm()
      setOpenDay(null)
    } catch (reason: unknown) {
      const message = getErrorMessage(reason)
      if (isGoogleMapsError(reason)) {
        setGoogleMapsError(message)
      } else {
        setActivityError(message)
      }
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

  async function handleDeleteMeal(meal: Meal) {
    setDeletingActivityId(meal.id)
    setActivityError(null)

    try {
      await deleteMeal(accessToken, currentTrip.id, meal.id)
      onTripUpdated({
        ...currentTrip,
        meals: currentTrip.meals.filter((currentMeal) => currentMeal.id !== meal.id),
      })
    } catch (reason: unknown) {
      setActivityError(getErrorMessage(reason))
    } finally {
      setDeletingActivityId(null)
    }
  }

  function editDayDetails(
    date: string,
    title: string | null,
    note: string | null,
  ) {
    setEditingDayDate(date)
    setDayTitle(title ?? '')
    setDayNotes(note ?? '')
  }

  async function handleSaveDayDetails(date: string) {
    setIsSavingDayDetails(true)
    setActivityError(null)

    try {
      const updatedDay = await updateTripDay(accessToken, currentTrip.id, date, {
        title: dayTitle.trim() || null,
        notes: dayNotes,
      })
      onTripUpdated({
        ...currentTrip,
        days: currentTrip.days.map((day) =>
          day.date === date
            ? { ...day, title: updatedDay.title, notes: updatedDay.notes }
            : day,
        ),
      })
      setEditingDayDate(null)
    } catch (reason: unknown) {
      setActivityError(getErrorMessage(reason))
    } finally {
      setIsSavingDayDetails(false)
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
      <div className="mt-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-5">
        <aside className="sticky top-5 hidden self-start lg:block">
          <div className="rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-3">
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <h4 className="text-sm font-semibold text-[#274b48]">
                {t('tripDetails.dayNavigator')}
              </h4>
              <button
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#274b48] hover:bg-[#e6eee3]"
                onClick={selectAllDays}
                type="button"
              >
                {t('tripDetails.selectAllDays')}
              </button>
            </div>
            <div className="mt-1 grid gap-1">
              {trip.days.map((day) => {
                const isActive = day.date === selectedDay.date
                const isChecked = selectedDayDates.includes(day.date)

                return (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-2 py-2 transition ${
                      isActive
                        ? 'bg-[#274b48] text-[#f9f5ed]'
                        : 'text-[#69726c] hover:bg-[#e6eee3] hover:text-[#274b48]'
                    }`}
                    key={day.date}
                  >
                    <input
                      aria-label={t('tripDetails.selectDayForViewing', {
                        date: formatDate(day.date),
                      })}
                      checked={isChecked}
                      className="size-4 shrink-0 accent-[#e5b76b]"
                      onChange={(event) =>
                        toggleDaySelection(
                          day.date,
                          event.nativeEvent instanceof MouseEvent &&
                            event.nativeEvent.shiftKey,
                        )
                      }
                      type="checkbox"
                    />
                    <button
                      aria-label={t('tripDetails.selectDay', {
                        date: formatDate(day.date),
                      })}
                      className="flex min-w-0 flex-1 overflow-hidden text-left"
                      onClick={(event) =>
                        selectOnlyDay(day.date, event.shiftKey)
                      }
                      type="button"
                    >
                      <span className="w-0 min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {formatDate(day.date)}
                        </span>
                        {day.title?.trim() && (
                          <span
                            className={`mt-0.5 block truncate text-xs ${
                              isActive ? 'text-[#b9d1be]' : 'text-[#69726c]'
                            }`}
                            title={day.title}
                          >
                            {day.title}
                          </span>
                        )}
                        <span
                          className={`mt-0.5 block truncate text-xs ${
                            isActive ? 'text-[#b9d1be]' : 'text-[#8a918b]'
                          }`}
                        >
                          {getDayScheduleSummary(day)}
                        </span>
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-[#e6eee3] p-1">
            {(['all', 'activities', 'meals'] as const).map((tab) => (
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  plannerTab === tab
                    ? 'bg-[#faf8f3] text-[#274b48] shadow-sm'
                    : 'text-[#69726c]'
                }`}
                key={tab}
                onClick={() => setPlannerTab(tab)}
                type="button"
              >
                {tab === 'all'
                  ? t('tripDetails.all')
                  : tab === 'activities'
                    ? t('tripDetails.activities')
                    : t('tripDetails.meals')}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {trip.days.map((day) => (
              <div
                className={`rounded-2xl border border-[#e1dbd0] bg-[#f5f1ea] p-4 ${
                  selectedDayDates.includes(day.date) ? '' : 'lg:hidden'
                }`}
                key={day.date}
              >
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#274b48]">
                  {formatDate(day.date)}
                  {day.title?.trim() && (
                    <span className="ml-2 font-normal text-[#69726c]">
                      {day.title}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-[#69726c]">
                  {getDayScheduleSummary(day)}
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
                  disabled={editingItemId !== null}
                  onClick={() => {
                    if (editingItemId !== null) {
                      return
                    }

                    toggleActivityForm(day.date)
                  }}
                  type="button"
                >
                  {openDay === day.date && editingItemId === null
                    ? t('common.close')
                    : t('tripDetails.add')}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#69726c] hover:bg-[#e6eee3]"
                  onClick={() => editDayDetails(day.date, day.title, day.notes)}
                  type="button"
                >
                  {day.title?.trim() || day.notes?.trim()
                    ? t('tripDetails.editDayDetails')
                    : t('tripDetails.addDayDetails')}
                </button>
              </div>
            </div>

            {openDay === day.date && editingItemId === null &&
              renderDayItemForm(day.date)}

            {editingDayDate === day.date && (
              <div className="mt-4 grid gap-3 border-t border-[#ded6ca] pt-4">
                <label className="grid gap-1.5 text-sm font-medium text-[#69726c]">
                  {t('tripDetails.dayTitle')}
                  <input
                    className="rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 py-2.5 text-[#27302f] outline-none focus:border-[#274b48]"
                    maxLength={200}
                    onChange={(event) => setDayTitle(event.target.value)}
                    placeholder={t('tripDetails.dayTitlePlaceholder')}
                    type="text"
                    value={dayTitle}
                  />
                </label>
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
                    disabled={isSavingDayDetails}
                    onClick={() => void handleSaveDayDetails(day.date)}
                    type="button"
                  >
                    {isSavingDayDetails ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </div>
            )}

            {renderDayItems(day, plannerTab)}

              </div>
            ))}
          </div>
          <div className="lg:hidden">
            <TripAuxiliaryDetails
              accessToken={accessToken}
              onTripUpdated={onTripUpdated}
              selectedDayDate={selectedDay.date}
              selectedDayDates={selectedDayDates}
              trip={currentTrip}
            />
          </div>
        </div>
        <aside className="hidden lg:block">
          <TripAuxiliaryDetails
            accessToken={accessToken}
            onTripUpdated={onTripUpdated}
            selectedDayDate={selectedDay.date}
            selectedDayDates={selectedDayDates}
            trip={currentTrip}
          />
        </aside>
      </div>
    </div>
  )
}
