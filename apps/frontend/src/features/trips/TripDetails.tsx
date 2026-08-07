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
import {
  getDayItemTime,
  sortDayItems,
  sortActivities,
  type DayItem,
} from '../../lib/activity-format'
import { LoadingCover } from '../../components/LoadingCover'
import { TripAuxiliaryDetails } from './TripAuxiliaryDetails'
import { TripSettings } from './TripSettings'
import { DayItemForm } from './DayItemForm'
import { DayItemList } from './DayItemList'
import { MoveDayItemForm } from './MoveDayItemForm'
import { TripDayCard } from './TripDayCard'
import { TripDayNavigator } from './TripDayNavigator'
import { TripDetailsHeader } from './TripDetailsHeader'
import { useTripRealtime } from './useTripRealtime'
import type {
  DayItemRecord,
  DropTarget,
  MovingItem,
  PlannerTab,
} from './planner-types'
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
  const reorderGenerationRef = useRef(0)

  useTripRealtime({
    accessToken,
    isPaused: () => pendingReorderCountRef.current > 0,
    onError: setActivityError,
    onTripUpdated,
    tripId: trip?.id,
  })

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
    return <p className="mt-6 text-sm text-error">{error}</p>
  }

  if (!trip) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-border-dashed p-6 text-sm text-muted">
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
    const normalizedItemsByDate = new Map(
      trip.days.map((day) => [
        day.date,
        normalizeTimedDayItems(
          affectedDays.get(day.date) ?? getDayItems(day, trip.meals),
        ),
      ]),
    )

    return {
      ...trip,
      days: trip.days.map((day) => {
        const normalizedItems = normalizedItemsByDate.get(day.date) ?? []

        return {
          ...day,
          activities: normalizedItems
            .filter(
              (item): item is Activity =>
                getDayItemRecord(item, trip.meals).itemType === 'activity',
            )
            .map((activity) => ({
              ...activity,
              tripDate: day.date,
              sortOrder: normalizedItems.findIndex(
                (currentItem) => currentItem.id === activity.id,
              ),
            })),
        }
      }),
      meals: trip.meals.map((meal) => {
        const normalizedEntry = Array.from(normalizedItemsByDate.entries()).find(
          ([, items]) => items.some((item) => item.id === meal.id),
        )

        if (!normalizedEntry) {
          return meal
        }

        const [dayDate, normalizedItems] = normalizedEntry
        return {
          ...meal,
          tripDate: dayDate,
          sortOrder: normalizedItems.findIndex(
            (item) => item.id === meal.id,
          ),
        }
      }),
    }
  }

  function normalizeTimedDayItems(items: DayItem[]) {
    const timedItems = items
      .filter((item) => getDayItemTime(item) !== null)
      .sort((left, right) =>
        (getDayItemTime(left) ?? '').localeCompare(getDayItemTime(right) ?? ''),
      )
    let timedItemIndex = 0

    return items.map((item) => {
      if (getDayItemTime(item) === null) {
        return item
      }

      const normalizedItem = timedItems[timedItemIndex]
      timedItemIndex += 1
      return normalizedItem
    })
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
    const nextDropTarget = {
      dayDate,
      index: getDropIndex(event, itemIndex),
    }
    setDropTarget((currentTarget) =>
      currentTarget?.dayDate === nextDropTarget.dayDate &&
      currentTarget.index === nextDropTarget.index
        ? currentTarget
        : nextDropTarget,
    )
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
    const nextDropTarget = {
      dayDate,
      index: day ? getDayItems(day).length : 0,
    }
    setDropTarget((currentTarget) =>
      currentTarget?.dayDate === nextDropTarget.dayDate &&
      currentTarget.index === nextDropTarget.index
        ? currentTarget
        : nextDropTarget,
    )
  }

  function queueDayItemReorder(
    trip: TripDetail,
    items: ReorderDayItemInput[],
  ) {
    const reorderGeneration = ++reorderGenerationRef.current
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

        if (
          pendingReorderCountRef.current > 1 ||
          reorderGeneration !== reorderGenerationRef.current
        ) {
          return
        }

        try {
          const refreshedTrip = await getTrip(accessToken, trip.id)
          if (
            pendingReorderCountRef.current === 1 &&
            reorderGeneration === reorderGenerationRef.current
          ) {
            onTripUpdated(refreshedTrip)
          }
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
    const lastEarlierActivityIndex =
      itemTime === null
        ? -1
        : targetItems.reduce(
            (lastIndex, item, index) => {
              const candidateTime = getDayItemTime(item)
              return candidateTime !== null && candidateTime < itemTime
                ? index
                : lastIndex
            },
            -1,
          )
    const earliestLegalIndex =
      itemTime === null ? 0 : lastEarlierActivityIndex + 1
    const latestLegalIndex =
      firstLaterActivityIndex >= 0
        ? firstLaterActivityIndex
        : targetItems.length
    const insertionIndex =
      itemTime === null
        ? desiredIndex
        : Math.max(
            earliestLegalIndex,
            Math.min(desiredIndex, latestLegalIndex),
          )
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
    return (
      <DayItemForm
        allDay={allDay}
        editingItemId={editingItemId}
        editingItemType={editingItemType}
        endTime={endTime}
        googleMapsError={googleMapsError}
        googleMapsUrl={googleMapsUrl}
        googleMapsUrlIsInvalid={googleMapsUrlIsInvalid}
        isMealForm={
          editingItemType === 'meal' ||
          (editingItemId === null && plannerTab === 'meals')
        }
        isSaving={isSaving}
        notes={notes}
        onAllDayChange={setAllDay}
        onCancel={() => {
          resetActivityForm()
          setOpenDay(null)
        }}
        onEndTimeChange={handleEndTimeChange}
        onGoogleMapsUrlChange={(value) => {
          setGoogleMapsUrl(value)
          setGoogleMapsError(null)
        }}
        onNotesChange={setNotes}
        onSelectItemType={selectNewItemType}
        onStartTimeChange={handleStartTimeChange}
        onSubmit={(event) => void handleSaveDayItem(event, date)}
        onTitleChange={setTitle}
        startTime={startTime}
        title={title}
      />
    )
  }

  function renderMoveItemForm() {
    return (
      <MoveDayItemForm
        endDate={currentTrip.endDate}
        onCancel={cancelMovingItem}
        onSubmit={handleMoveItem}
        onTargetDateChange={setMoveTargetDate}
        startDate={currentTrip.startDate}
        targetDate={moveTargetDate}
      />
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
      <TripDetailsHeader
        onToggleSettings={() => setShowSettings((current) => !current)}
        showSettings={showSettings}
        trip={trip}
      />
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
        <p className="mt-4 rounded-xl border border-danger-border bg-error-surface p-3 text-sm text-error">
          {activityError}
        </p>
      )}
      <div className="mt-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-5">
        <TripDayNavigator
          days={trip.days}
          getDayScheduleSummary={getDayScheduleSummary}
          onSelectAll={selectAllDays}
          onSelectDay={selectOnlyDay}
          onToggleDay={toggleDaySelection}
          selectedDay={selectedDay}
          selectedDayDates={selectedDayDates}
        />

        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
            {(['all', 'activities', 'meals'] as const).map((tab) => (
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  plannerTab === tab
                    ? 'bg-surface text-brand shadow-sm'
                    : 'text-muted'
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
              <TripDayCard
                day={day}
                dayNotes={dayNotes}
                dayTitle={dayTitle}
                editingDayDate={editingDayDate}
                editingItemId={editingItemId}
                isSavingDayDetails={isSavingDayDetails}
                isSelected={selectedDayDates.includes(day.date)}
                key={day.date}
                onCancelDayDetails={() => setEditingDayDate(null)}
                onDayNotesChange={setDayNotes}
                onDayTitleChange={setDayTitle}
                onEditDayDetails={editDayDetails}
                onSaveDayDetails={(date) => void handleSaveDayDetails(date)}
                onToggleActivityForm={toggleActivityForm}
                openDay={openDay}
                renderItemForm={renderDayItemForm}
                scheduleSummary={getDayScheduleSummary(day)}
              >
                <DayItemList
                  day={day}
                  deletingItemId={deletingActivityId}
                  draggedItem={draggedItem}
                  dropTarget={dropTarget}
                  editingItemId={editingItemId}
                  getDayItemRecord={getDayItemRecord}
                  getDropIndex={getDropIndex}
                  itemType={plannerTab}
                  items={getDayItems(day)}
                  movingItem={movingItem}
                  onDayDragOver={handleDayDragOver}
                  onDayDrop={(event, date, itemCount) => {
                    void handleDayItemDrop(event, date, itemCount)
                  }}
                  onDeleteActivity={(activity) => {
                    void handleDeleteActivity(activity)
                  }}
                  onDeleteMeal={(meal) => {
                    void handleDeleteMeal(meal)
                  }}
                  onEditActivity={editActivity}
                  onEditMeal={editMeal}
                  onItemDragEnd={() => {
                    setDraggedItem(null)
                    setDropTarget(null)
                  }}
                  onItemDragOver={handleDayItemDragOver}
                  onItemDragStart={handleDayItemDragStart}
                  onItemDrop={(event, date, itemIndex) => {
                    void handleDayItemDrop(event, date, itemIndex)
                  }}
                  onStartMoving={startMovingItem}
                  renderEditForm={renderDayItemForm}
                  renderMoveForm={renderMoveItemForm}
                />
              </TripDayCard>
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
