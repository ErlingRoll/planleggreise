import type { Activity, Meal } from "../../api"

export type PlannerTab = "all" | "activities" | "meals"

export type DayItemRecord =
  { itemType: "activity"; item: Activity } | { itemType: "meal"; item: Meal }

export type DropTarget = {
  dayDate: string
  index: number
}

export type MovingItem = DayItemRecord
