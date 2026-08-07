import type { Activity, Meal } from "@planleggreise/models"

export type DayItem = Activity | Meal

export function getDayItemTitle(item: Pick<DayItem, "title" | "placeName">, fallback: string) {
  return item.title?.trim() || item.placeName || fallback
}

export function getDayItemTime(item: Pick<DayItem, "allDay" | "startTime" | "endTime">) {
  if (item.allDay) {
    return null
  }

  return item.startTime ?? item.endTime
}

export function sortDayItems<T extends DayItem>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    const leftTime = getDayItemTime(left)
    const rightTime = getDayItemTime(right)

    if (!leftTime && !rightTime) {
      return 0
    }
    if (!leftTime) {
      return 1
    }
    if (!rightTime) {
      return -1
    }
    return leftTime.localeCompare(rightTime)
  })
}

export function sortActivities(activities: Activity[]) {
  return sortDayItems(activities)
}

export function formatActivityTime(
  activity: Pick<Activity, "allDay" | "startTime" | "endTime">,
  labels: { allDay: string; timeNotSet: string },
) {
  if (activity.allDay) {
    return labels.allDay
  }
  if (activity.startTime && activity.endTime) {
    return `${activity.startTime}–${activity.endTime}`
  }
  return activity.startTime ?? activity.endTime ?? labels.timeNotSet
}
