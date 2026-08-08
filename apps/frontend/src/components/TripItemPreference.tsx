import { useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  TripItemPreference as TripItemPreferenceRecord,
  TripItemPreferenceValue,
  TripItemType,
} from "@turprep/models"

type TripItemPreferenceProps = {
  itemId: string
  itemType: TripItemType
  preferences: TripItemPreferenceRecord[]
  userId: string
  disabled?: boolean
  onChange: (value: TripItemPreferenceValue | null) => void
}

const preferenceValues: TripItemPreferenceValue[] = ["red", "yellow", "green"]

const preferenceClasses: Record<TripItemPreferenceValue, string> = {
  green: "bg-preference-green",
  yellow: "bg-preference-yellow",
  red: "bg-preference-red",
}

export function TripItemPreference({
  itemId,
  itemType,
  preferences,
  userId,
  disabled = false,
  onChange,
}: TripItemPreferenceProps) {
  const { t } = useTranslation()
  const [isVotingOpen, setIsVotingOpen] = useState(false)
  const itemPreferences = preferences.filter(
    (preference) => preference.itemType === itemType && preference.itemId === itemId,
  )
  const totalVotes = itemPreferences.length
  const currentValue =
    itemPreferences.find((preference) => preference.userId === userId)?.value ?? null
  const counts = Object.fromEntries(
    preferenceValues.map((value) => [
      value,
      itemPreferences.filter((preference) => preference.value === value).length,
    ]),
  ) as Record<TripItemPreferenceValue, number>

  function getPercentage(value: TripItemPreferenceValue) {
    return totalVotes === 0 ? 0 : Math.round((counts[value] / totalVotes) * 100)
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-border-divider pt-2">
      <div className="flex items-center gap-2">
        {totalVotes > 0 ? (
          <div
            aria-label={t("tripPreferences.summary", {
              green: counts.green,
              yellow: counts.yellow,
              red: counts.red,
            })}
            className="flex h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted text-[0.625rem] font-bold text-white"
            role="img"
          >
            {preferenceValues.map((value) => {
              const percentage = getPercentage(value)

              return percentage > 0 ? (
                <div
                  className={`flex min-w-0 items-center justify-center overflow-hidden px-1 ${preferenceClasses[value]}`}
                  key={value}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage >= 25 && (
                    <span className="truncate">
                      {t(`tripPreferences.${value}`)} {percentage}%
                    </span>
                  )}
                </div>
              ) : null
            })}
          </div>
        ) : (
          <div className="h-2 min-w-0 flex-1 rounded-full bg-surface-muted" />
        )}
        <button
          aria-expanded={isVotingOpen}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-on-surface"
          onClick={() => setIsVotingOpen((isOpen) => !isOpen)}
          type="button"
        >
          {currentValue && (
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${preferenceClasses[currentValue]}`}
            />
          )}
          {isVotingOpen ? t("common.close") : t("tripPreferences.vote")}
        </button>
      </div>
      {isVotingOpen && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {preferenceValues.map((value) => {
            const isSelected = currentValue === value

            return (
              <button
                aria-pressed={isSelected}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-on-surface ${
                  isSelected ? "bg-surface-muted text-on-surface ring-1 ring-border" : ""
                }`}
                disabled={disabled}
                key={value}
                onClick={() => {
                  onChange(isSelected ? null : value)
                  setIsVotingOpen(false)
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${preferenceClasses[value]}`}
                />
                {t(`tripPreferences.${value}`)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
