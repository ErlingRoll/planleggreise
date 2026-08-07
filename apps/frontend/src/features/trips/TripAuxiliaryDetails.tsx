import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import {
  createHousingStay,
  deleteHousingStay,
  updateHousingStay,
  type HousingStay,
  type TripDetail,
} from "../../api"
import { DatePicker } from "../../components/DatePicker"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { TripItemPreference } from "../../components/TripItemPreference"
import { getErrorMessage } from "../../lib/errors"
import { shiftDate } from "../../lib/trip-dates"
import { formatDate } from "../../lib/date-format"
import type { TripItemPreferenceValue } from "@turprep/models"

type TripAuxiliaryDetailsProps = {
  accessToken: string
  trip: TripDetail
  onTripUpdated: (trip: TripDetail) => void
  onMoveHousingToBackup: (stay: HousingStay) => void
  selectedDayDate?: string
  selectedDayDates?: string[]
  userId: string
  savingPreferenceKey: string | null
  onPreferenceChange: (
    itemType: "housing",
    itemId: string,
    value: TripItemPreferenceValue | null,
  ) => void
}

type FormMode = "housing" | null

export function TripAuxiliaryDetails({
  accessToken,
  trip,
  onTripUpdated,
  onMoveHousingToBackup,
  selectedDayDate,
  selectedDayDates,
  userId,
  savingPreferenceKey,
  onPreferenceChange,
}: TripAuxiliaryDetailsProps) {
  const { t } = useTranslation()
  const visibleHousingStays = selectedDayDates
    ? trip.housingStays.filter((stay) => {
        if (stay.isBackup || stay.checkIn === null || stay.checkOut === null) {
          return false
        }

        const { checkIn, checkOut } = stay
        return selectedDayDates.some((dayDate) => checkIn <= dayDate && dayDate < checkOut)
      })
    : trip.housingStays.filter(
        (stay) => !stay.isBackup && stay.checkIn !== null && stay.checkOut !== null,
      )
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [checkIn, setCheckIn] = useState(trip.startDate)
  const [checkOut, setCheckOut] = useState(shiftDate(trip.endDate, 1))
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingHousingId, setDeletingHousingId] = useState<string | null>(null)
  const [pendingHousingDeletion, setPendingHousingDeletion] = useState<HousingStay | null>(null)

  function resetForm() {
    setFormMode(null)
    setEditingId(null)
    setName("")
    setCheckIn(trip.startDate)
    setCheckOut(shiftDate(trip.endDate, 1))
    setNotes("")
    setError(null)
  }

  function startNewForm() {
    resetForm()
    if (selectedDayDate) {
      setCheckIn(selectedDayDate)
      setCheckOut(shiftDate(selectedDayDate, 1))
    }
    setFormMode("housing")
  }

  function editHousing(stay: HousingStay) {
    setFormMode("housing")
    setEditingId(stay.id)
    setName(stay.name)
    setCheckIn(stay.checkIn ?? trip.startDate)
    setCheckOut(stay.checkOut ?? shiftDate(trip.endDate, 1))
    setNotes(stay.notes ?? "")
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      if (formMode === "housing") {
        const stay = editingId
          ? await updateHousingStay(accessToken, trip.id, editingId, {
              name,
              checkIn,
              checkOut,
              isBackup: false,
              notes,
            })
          : await createHousingStay(accessToken, trip.id, {
              name,
              checkIn,
              checkOut,
              isBackup: false,
              notes,
            })
        onTripUpdated({
          ...trip,
          housingStays: editingId
            ? trip.housingStays.map((current) => (current.id === stay.id ? stay : current))
            : [...trip.housingStays, stay],
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
    setDeletingHousingId(stay.id)
    try {
      await deleteHousingStay(accessToken, trip.id, stay.id)
      onTripUpdated({
        ...trip,
        housingStays: trip.housingStays.filter((current) => current.id !== stay.id),
      })
    } catch (reason: unknown) {
      setError(getErrorMessage(reason))
    } finally {
      setDeletingHousingId(null)
      setPendingHousingDeletion(null)
    }
  }

  function renderHousingForm(inline = false) {
    return (
      <form
        className={
          inline
            ? "mt-3 grid gap-3 border-t border-border-divider pt-3"
            : "rounded-2xl border border-border-soft bg-surface-soft p-4"
        }
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h3 className="font-semibold text-brand">{t("tripDetails.housingFormTitle")}</h3>
        <div className={inline ? "mt-3 grid gap-3" : "mt-4 grid gap-3"}>
          <label className="grid gap-1.5 text-sm font-medium text-muted">
            {t("tripDetails.housingName")}
            <input
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker label={t("tripDetails.checkIn")} onChange={setCheckIn} value={checkIn} />
            <DatePicker label={t("tripDetails.checkOut")} onChange={setCheckOut} value={checkOut} />
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-muted">
            {t("tripDetails.notes")}
            <textarea
              className="min-h-20 resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("tripDetails.notesPlaceholder")}
              value={notes}
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted"
              onClick={resetForm}
              type="button"
            >
              {t("common.cancel")}
            </button>
            <button
              className="rounded-xl bg-brand-surface px-3 py-2 text-sm font-semibold text-on-brand hover:bg-brand-surface-hover disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <section className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-border-card bg-page p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-brand">{t("tripDetails.housing")}</h3>
          <button
            className="rounded-lg px-2 py-1 text-sm font-semibold text-on-surface hover:bg-surface-muted"
            onClick={startNewForm}
            type="button"
          >
            {t("tripDetails.add")}
          </button>
        </div>
        {visibleHousingStays.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("tripDetails.noHousing")}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {visibleHousingStays.map((stay) => (
              <div className="rounded-xl bg-surface p-3" key={stay.id}>
                <div className="flex flex-col gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand">{stay.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(stay.checkIn ?? trip.startDate)} –{" "}
                      {formatDate(stay.checkOut ?? shiftDate(trip.endDate, 1))}
                    </p>
                  </div>
                  {stay.notes?.trim() && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{stay.notes}</p>
                  )}
                  <TripItemPreference
                    disabled={savingPreferenceKey === `housing:${stay.id}`}
                    itemId={stay.id}
                    itemType="housing"
                    onChange={(value) => onPreferenceChange("housing", stay.id, value)}
                    preferences={trip.preferences}
                    userId={userId}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface-muted"
                      onClick={() => onMoveHousingToBackup(stay)}
                      type="button"
                    >
                      {t("backup.moveToBackup")}
                    </button>
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface-muted"
                      onClick={() => editHousing(stay)}
                      type="button"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-error hover:bg-danger-surface"
                      onClick={() => setPendingHousingDeletion(stay)}
                      type="button"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                  {editingId === stay.id && renderHousingForm(true)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formMode && editingId === null && renderHousingForm()}
      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        isConfirming={deletingHousingId !== null}
        isOpen={pendingHousingDeletion !== null}
        message={
          pendingHousingDeletion
            ? t("tripDetails.deleteHousingConfirmation", { name: pendingHousingDeletion.name })
            : ""
        }
        onCancel={() => setPendingHousingDeletion(null)}
        onConfirm={() => {
          if (pendingHousingDeletion) {
            void handleDeleteHousing(pendingHousingDeletion)
          }
        }}
        title={t("common.confirmDeletionTitle")}
      />
    </section>
  )
}
