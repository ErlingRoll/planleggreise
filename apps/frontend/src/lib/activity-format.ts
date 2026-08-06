import type { Activity } from '@planleggreise/models'

export function sortActivities(activities: Activity[]) {
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

export function formatActivityTime(
  activity: Pick<Activity, 'allDay' | 'startTime' | 'endTime'>,
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
