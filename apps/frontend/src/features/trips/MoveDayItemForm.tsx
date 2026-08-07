import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '../../components/DatePicker'

type MoveDayItemFormProps = {
  startDate: string
  endDate: string
  targetDate: string
  onTargetDateChange: (date: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function MoveDayItemForm({
  startDate,
  endDate,
  targetDate,
  onTargetDateChange,
  onSubmit,
  onCancel,
}: MoveDayItemFormProps) {
  const { t } = useTranslation()

  return (
    <form
      className="mt-3 grid gap-3 rounded-xl border border-border-soft bg-surface-soft p-3"
      onSubmit={onSubmit}
    >
      <DatePicker
        label={t('tripDetails.moveToDate')}
        maxDate={endDate}
        minDate={startDate}
        onChange={onTargetDateChange}
        value={targetDate}
      />
      <div className="flex justify-end gap-2">
        <button
          className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted"
          onClick={onCancel}
          type="button"
        >
          {t('common.cancel')}
        </button>
        <button
          className="rounded-xl bg-brand-surface px-3 py-2 text-sm font-semibold text-on-brand hover:bg-brand-surface-hover"
          type="submit"
        >
          {t('common.move')}
        </button>
      </div>
    </form>
  )
}
