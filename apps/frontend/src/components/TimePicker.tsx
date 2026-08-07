import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../i18n'

type TimePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

type TimeParts = {
  hours: number
  minutes: number
}

function parseTime(value: string): TimeParts | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return hours < 24 && minutes < 60 ? { hours, minutes } : null
}

function formatTimeValue(value: string, locale: string) {
  const time = parseTime(value)

  if (!time) {
    return value
  }

  const date = new Date(Date.UTC(1970, 0, 1, time.hours, time.minutes))

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(date)
}

function formatTime(hours: number, minutes: number) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const { i18n, t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [draftHourInput, setDraftHourInput] = useState(
    parseTime(value)?.hours.toString().padStart(2, '0') ?? '',
  )
  const [draftMinuteInput, setDraftMinuteInput] = useState(
    parseTime(value)?.minutes.toString().padStart(2, '0') ?? '',
  )
  const locale = getDateLocale(i18n.language)
  const enteredHour =
    draftHourInput === '' ? null : Number(draftHourInput)
  const enteredMinute =
    draftMinuteInput === '' ? null : Number(draftMinuteInput)
  const hasInvalidHour =
    enteredHour === null ||
    !Number.isInteger(enteredHour) ||
    enteredHour < 0 ||
    enteredHour > 23
  const hasInvalidMinute =
    enteredMinute === null ||
    !Number.isInteger(enteredMinute) ||
    enteredMinute < 0 ||
    enteredMinute > 59
  const draftTime =
    enteredHour !== null &&
    enteredMinute !== null &&
    !hasInvalidHour &&
    !hasInvalidMinute
      ? { hours: enteredHour, minutes: enteredMinute }
      : null
  const cancelPicker = useCallback(() => {
    const time = parseTime(value)
    setDraftHourInput(
      time ? String(time.hours).padStart(2, '0') : '',
    )
    setDraftMinuteInput(
      time ? String(time.minutes).padStart(2, '0') : '',
    )
    setIsOpen(false)
  }, [value])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelPicker()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [cancelPicker, isOpen])

  function setDraftFromValue(nextValue: string) {
    const time = parseTime(nextValue)
    setDraftHourInput(
      time ? String(time.hours).padStart(2, '0') : '',
    )
    setDraftMinuteInput(
      time ? String(time.minutes).padStart(2, '0') : '',
    )
  }

  function openPicker() {
    setDraftFromValue(value)
    setIsOpen(true)
  }

  function handleNumericInput(input: string) {
    return input.replace(/\D/g, '').slice(0, 2)
  }

  function clearPicker() {
    setDraftFromValue('')
    onChange('')
    setIsOpen(false)
  }

  function savePicker() {
    if (!draftTime) {
      return
    }

    onChange(formatTime(draftTime.hours, draftTime.minutes))
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <span className="grid gap-2 text-sm font-medium text-[#69726c]">
        {label}
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={
            value
              ? `${label}: ${formatTimeValue(value, locale)}`
              : t('timePicker.chooseTime')
          }
          className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 text-left text-[#27302f] outline-none transition hover:border-[#274b48] focus:border-[#274b48] focus:ring-2 focus:ring-[#b9d1be]"
          onClick={isOpen ? cancelPicker : openPicker}
          type="button"
        >
          <span className={value ? 'text-[#27302f]' : 'text-[#8b918b]'}>
            {value ? formatTimeValue(value, locale) : t('timePicker.chooseTime')}
          </span>
          <span aria-hidden="true" className="text-lg text-[#274b48]">
            ▾
          </span>
        </button>
      </span>

      {isOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-[#27302f]/25 sm:hidden"
            onClick={cancelPicker}
          />
          <div
            aria-label={t('timePicker.select', { label: label.toLowerCase() })}
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-40 max-h-[90vh] overflow-y-auto rounded-t-3xl border border-[#d9d4ca] bg-[#faf8f3] p-5 shadow-[0_-16px_40px_rgba(39,75,72,0.16)] sm:absolute sm:inset-x-0 sm:bottom-auto sm:mt-2 sm:max-h-none sm:rounded-2xl sm:p-4 sm:shadow-[0_16px_40px_rgba(39,75,72,0.16)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#69726c]">
                  {label}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-[#274b48]">
                  {draftTime
                    ? formatTimeValue(
                        formatTime(draftTime.hours, draftTime.minutes),
                        locale,
                      )
                    : '--:--'}
                </p>
              </div>
              {(value || draftHourInput || draftMinuteInput) && (
                <button
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#69726c] hover:bg-[#e6eee3]"
                  onClick={clearPicker}
                  type="button"
                >
                  {t('timePicker.clearTime')}
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="grid content-start gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#69726c]">
                  {t('timePicker.hour')}
                </span>
                <input
                  aria-invalid={hasInvalidHour && draftHourInput !== ''}
                  aria-label={t('timePicker.hour')}
                  autoComplete="off"
                  className={`min-h-12 w-full rounded-xl border bg-[#faf8f3] px-3 text-center text-2xl font-semibold tabular-nums text-[#274b48] outline-none transition focus:ring-2 focus:ring-[#b9d1be] ${
                    hasInvalidHour && draftHourInput !== ''
                      ? 'border-[#b42318] focus:border-[#b42318]'
                      : 'border-[#d9d4ca] focus:border-[#274b48]'
                  }`}
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) =>
                    setDraftHourInput(handleNumericInput(event.target.value))
                  }
                  placeholder="HH"
                  type="text"
                  value={draftHourInput}
                />
                <span className="text-center text-xs font-normal text-[#69726c]">
                  {t('timePicker.hourHint')}
                </span>
              </label>
              <label className="grid content-start gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#69726c]">
                  {t('timePicker.minute')}
                </span>
                <input
                  aria-invalid={hasInvalidMinute && draftMinuteInput !== ''}
                  aria-label={t('timePicker.minute')}
                  className={`min-h-12 w-full rounded-xl border bg-[#faf8f3] px-3 text-center text-2xl font-semibold tabular-nums text-[#274b48] outline-none transition focus:ring-2 focus:ring-[#b9d1be] ${
                    hasInvalidMinute && draftMinuteInput !== ''
                      ? 'border-[#b42318] focus:border-[#b42318]'
                      : 'border-[#d9d4ca] focus:border-[#274b48]'
                  }`}
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) =>
                    setDraftMinuteInput(handleNumericInput(event.target.value))
                  }
                  placeholder="00"
                  type="text"
                  value={draftMinuteInput}
                />
                <span className="text-center text-xs font-normal text-[#69726c]">
                  {t('timePicker.minuteHint')}
                </span>
              </label>
            </div>

            {hasInvalidHour && draftHourInput !== '' && (
              <p className="mt-2 text-sm text-[#b42318]" role="alert">
                {t('timePicker.hourInvalid')}
              </p>
            )}
            {hasInvalidMinute && draftMinuteInput !== '' && (
              <p className="mt-2 text-sm text-[#b42318]" role="alert">
                {t('timePicker.minuteInvalid')}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-[#ded6ca] pt-4">
              <button
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#69726c] hover:bg-[#e6eee3]"
                onClick={cancelPicker}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="rounded-xl bg-[#274b48] px-4 py-2.5 text-sm font-semibold text-[#f9f5ed] hover:bg-[#1c3b38] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!draftTime}
                onClick={savePicker}
                type="button"
              >
                {t('timePicker.done')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
