import type { DragEvent, ReactNode } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { formatActivityTime, getDayItemTitle, type DayItem } from "../../lib/activity-format"
import type { Activity, Meal, TripDetail } from "../../api"
import { MobileMenuButton } from "../../components/MobileMenuButton"
import { TripItemPreference } from "../../components/TripItemPreference"
import type { TripItemPreferenceValue, TripItemType } from "@turprep/models"
import type { DayItemRecord, DropTarget, MovingItem, PlannerTab } from "./planner-types"

type DayItemListProps = {
  day: TripDetail["days"][number]
  items: DayItem[]
  itemType: PlannerTab
  draggedItem: DayItemRecord | null
  dropTarget: DropTarget | null
  editingItemId: string | null
  movingItem: MovingItem | null
  deletingItemId: string | null
  getDayItemRecord: (item: DayItem) => DayItemRecord
  getDropIndex: (event: DragEvent<HTMLDivElement>, itemIndex: number) => number
  onDayDragOver: (event: DragEvent<HTMLDivElement>, dayDate: string) => void
  onDayDrop: (event: DragEvent<HTMLDivElement>, dayDate: string, itemCount: number) => void
  onItemDragStart: (event: DragEvent<HTMLDivElement>, record: DayItemRecord) => void
  onItemDragOver: (event: DragEvent<HTMLDivElement>, dayDate: string, itemIndex: number) => void
  onItemDrop: (event: DragEvent<HTMLDivElement>, dayDate: string, itemIndex: number) => void
  onItemDragEnd: () => void
  onStartMoving: (record: DayItemRecord) => void
  onEditActivity: (activity: Activity) => void
  onEditMeal: (meal: Meal) => void
  onMoveActivityToBackup: (activity: Activity) => void
  onMoveMealToBackup: (meal: Meal) => void
  onDeleteActivity: (activity: Activity) => void
  onDeleteMeal: (meal: Meal) => void
  renderEditForm: (date: string) => ReactNode
  renderMoveForm: () => ReactNode
  preferences: TripDetail["preferences"]
  userId: string
  savingPreferenceKey: string | null
  onPreferenceChange: (
    itemType: TripItemType,
    itemId: string,
    value: TripItemPreferenceValue | null,
  ) => void
}

export function DayItemList({
  day,
  items,
  itemType,
  draggedItem,
  dropTarget,
  editingItemId,
  movingItem,
  deletingItemId,
  getDayItemRecord,
  getDropIndex,
  onDayDragOver,
  onDayDrop,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  onItemDragEnd,
  onStartMoving,
  onEditActivity,
  onEditMeal,
  onMoveActivityToBackup,
  onMoveMealToBackup,
  onDeleteActivity,
  onDeleteMeal,
  renderEditForm,
  renderMoveForm,
  preferences,
  userId,
  savingPreferenceKey,
  onPreferenceChange,
}: DayItemListProps) {
  const { t } = useTranslation()
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null)
  const orderedItems =
    itemType === "meals"
      ? items.filter((item) => getDayItemRecord(item).itemType === "meal")
      : itemType === "activities"
        ? items.filter((item) => getDayItemRecord(item).itemType === "activity")
        : items
  const draggedItemIndex = draggedItem
    ? orderedItems.findIndex((item) => item.id === draggedItem.item.id)
    : -1

  function shouldShowDropIndicator(index: number) {
    const isDraggingWithinThisDay = draggedItemIndex >= 0
    const isCurrentPosition = index === draggedItemIndex || index === draggedItemIndex + 1

    return !isDraggingWithinThisDay || !isCurrentPosition
  }

  return (
    <div
      className={`mt-4 grid gap-2 border-t border-border-divider pt-3 ${
        orderedItems.length === 0 ? "min-h-2" : ""
      }`}
      onDragOver={(event) => onDayDragOver(event, day.date)}
      onDrop={(event) => onDayDrop(event, day.date, items.length)}
    >
      {orderedItems.map((item, itemIndex) => {
        const record = getDayItemRecord(item)
        const fullItemIndex = items.findIndex((currentItem) => currentItem.id === item.id)

        return (
          <div className="rounded-xl bg-surface p-3" key={`${record.itemType}:${item.id}`}>
            {dropTarget?.dayDate === day.date &&
              dropTarget.index === fullItemIndex &&
              shouldShowDropIndicator(itemIndex) && (
                <div className="mb-2 h-1 rounded-full bg-accent" />
              )}
            <div
              className="flex items-start gap-3 lg:cursor-grab lg:active:cursor-grabbing"
              draggable
              onDragEnd={onItemDragEnd}
              onDragOver={(event) => onItemDragOver(event, day.date, fullItemIndex)}
              onDragStart={(event) => onItemDragStart(event, record)}
              onDrop={(event) => onItemDrop(event, day.date, getDropIndex(event, fullItemIndex))}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand">
                  {getDayItemTitle(item, t("tripDetails.untitledItem"))}
                </p>
                <p className="mt-1">
                  {formatActivityTime(item, {
                    allDay: t("tripDetails.allDay"),
                    timeNotSet: t("tripDetails.timeNotSet"),
                  })}
                </p>
                {record.itemType === "meal" && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent-text">
                    {t("tripDetails.meal")}
                  </p>
                )}
                {item.placeAddress && (
                  <p className="mt-1 text-sm text-muted">{item.placeAddress}</p>
                )}
                {item.googleMapsUrl && (
                  <a
                    className="mt-2 inline-block text-sm font-semibold text-brand underline"
                    href={item.googleMapsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t("tripDetails.openGoogleMaps")}
                  </a>
                )}
              </div>
              <div className="relative shrink-0">
                <MobileMenuButton
                  closeLabel={t("common.close")}
                  isOpen={openMenuItemId === item.id}
                  menuLabel={t("common.menu")}
                  onToggle={() =>
                    setOpenMenuItemId((currentId) => (currentId === item.id ? null : item.id))
                  }
                  openLabel={t("common.menu")}
                />
                {openMenuItemId === item.id && (
                  <div className="absolute right-0 z-10 mt-1 grid min-w-40 gap-1 rounded-xl border border-border bg-surface p-1 shadow-popover sm:hidden">
                    <button
                      className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-muted disabled:opacity-50"
                      disabled={editingItemId !== null || movingItem !== null}
                      onClick={() => {
                        setOpenMenuItemId(null)
                        onStartMoving(record)
                      }}
                      type="button"
                    >
                      {t("common.move")}
                    </button>
                    <button
                      className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-muted disabled:opacity-50"
                      disabled={editingItemId !== null || movingItem !== null}
                      onClick={() => {
                        setOpenMenuItemId(null)
                        if (record.itemType === "meal") {
                          onMoveMealToBackup(record.item)
                        } else {
                          onMoveActivityToBackup(record.item)
                        }
                      }}
                      type="button"
                    >
                      {t("backup.moveToBackup")}
                    </button>
                    <button
                      className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-muted disabled:opacity-50"
                      disabled={movingItem !== null}
                      onClick={() => {
                        setOpenMenuItemId(null)
                        if (record.itemType === "meal") {
                          onEditMeal(record.item)
                        } else {
                          onEditActivity(record.item)
                        }
                      }}
                      type="button"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-error hover:bg-danger-surface disabled:opacity-50"
                      disabled={
                        deletingItemId === item.id || editingItemId !== null || movingItem !== null
                      }
                      onClick={() => {
                        setOpenMenuItemId(null)
                        if (record.itemType === "meal") {
                          onDeleteMeal(record.item)
                        } else {
                          onDeleteActivity(record.item)
                        }
                      }}
                      type="button"
                    >
                      {deletingItemId === item.id ? "..." : t("common.delete")}
                    </button>
                  </div>
                )}
                <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface-muted disabled:opacity-50"
                    disabled={editingItemId !== null || movingItem !== null}
                    onClick={() => onStartMoving(record)}
                    type="button"
                  >
                    {t("common.move")}
                  </button>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface-muted disabled:opacity-50"
                    disabled={editingItemId !== null || movingItem !== null}
                    onClick={() =>
                      record.itemType === "meal"
                        ? onMoveMealToBackup(record.item)
                        : onMoveActivityToBackup(record.item)
                    }
                    type="button"
                  >
                    {t("backup.moveToBackup")}
                  </button>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface-muted disabled:opacity-50"
                    disabled={movingItem !== null}
                    onClick={() =>
                      record.itemType === "meal"
                        ? onEditMeal(record.item)
                        : onEditActivity(record.item)
                    }
                    type="button"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-danger-surface disabled:opacity-50"
                    disabled={
                      deletingItemId === item.id || editingItemId !== null || movingItem !== null
                    }
                    onClick={() =>
                      record.itemType === "meal"
                        ? onDeleteMeal(record.item)
                        : onDeleteActivity(record.item)
                    }
                    type="button"
                  >
                    {deletingItemId === item.id ? "..." : t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
            {item.notes?.trim() && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{item.notes}</p>
            )}
            {editingItemId === item.id && renderEditForm(day.date)}
            <TripItemPreference
              disabled={savingPreferenceKey === `${record.itemType}:${item.id}`}
              itemId={item.id}
              itemType={record.itemType}
              onChange={(value) => onPreferenceChange(record.itemType, item.id, value)}
              preferences={preferences}
              userId={userId}
            />
            {movingItem?.item.id === item.id && renderMoveForm()}
            {dropTarget?.dayDate === day.date &&
              dropTarget.index === fullItemIndex + 1 &&
              itemIndex === orderedItems.length - 1 &&
              shouldShowDropIndicator(itemIndex + 1) && (
                <div className="mt-2 h-1 rounded-full bg-accent" />
              )}
          </div>
        )
      })}
    </div>
  )
}
