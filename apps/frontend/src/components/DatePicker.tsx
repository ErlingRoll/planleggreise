import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale, getWeekdayLabels } from '../i18n'

type DatePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
  minDate?: string
  maxDate?: string
}

function parseDate(value: string) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getUTCFullYear()
  const month = viewDate.getUTCMonth()
  const firstDay = new Date(Date.UTC(year, month, 1))
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) {
      return null
    }

    return new Date(Date.UTC(year, month, index - firstWeekday + 1))
  })
}

export function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: DatePickerProps) {
  const { i18n, t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseDate(value) ?? getToday())
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate])
  const locale = getDateLocale(i18n.language)
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  })
  const language = i18n.language === 'en' ? 'en' : 'nb'
  const weekdayLabels = getWeekdayLabels(language)

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
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function openPicker() {
    setViewDate(parseDate(value) ?? parseDate(minDate ?? '') ?? getToday())
    setIsOpen(true)
  }

  function moveMonth(monthOffset: number) {
    setViewDate(
      (currentDate) =>
        new Date(
          Date.UTC(
            currentDate.getUTCFullYear(),
            currentDate.getUTCMonth() + monthOffset,
            1,
          ),
        ),
    )
  }

  function selectDate(date: Date) {
    const nextValue = formatDateValue(date)

    if (
      (minDate && nextValue < minDate) ||
      (maxDate && nextValue > maxDate)
    ) {
      return
    }

    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <span className="grid gap-2 text-sm font-medium text-[#69726c]">
        {label}
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={value ? `${label}: ${dateFormatter.format(parseDate(value)!)}` : t('datePicker.chooseDate')}
          className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#d9d4ca] bg-[#faf8f3] px-3 text-left text-[#27302f] outline-none transition hover:border-[#274b48] focus:border-[#274b48] focus:ring-2 focus:ring-[#b9d1be]"
          onClick={isOpen ? () => setIsOpen(false) : openPicker}
          type="button"
        >
          <span className={value ? 'text-[#27302f]' : 'text-[#8b918b]'}>
            {value ? dateFormatter.format(parseDate(value)!) : t('datePicker.chooseDate')}
          </span>
          <span aria-hidden="true" className="text-lg text-[#274b48]">▾</span>
        </button>
      </span>

      {isOpen && (
        <div
          aria-label={t('datePicker.select', { label: label.toLowerCase() })}
          className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-[#d9d4ca] bg-[#faf8f3] p-4 shadow-[0_16px_40px_rgba(39,75,72,0.16)]"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label={t('common.previousMonth')}
              className="grid size-11 place-items-center rounded-xl text-2xl text-[#274b48] hover:bg-[#e6eee3]"
              onClick={() => moveMonth(-1)}
              type="button"
            >
              ‹
            </button>
            <p className="capitalize font-semibold text-[#274b48]">
              {monthFormatter.format(viewDate)}
            </p>
            <button
              aria-label={t('common.nextMonth')}
              className="grid size-11 place-items-center rounded-xl text-2xl text-[#274b48] hover:bg-[#e6eee3]"
              onClick={() => moveMonth(1)}
              type="button"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-[#69726c]">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <span aria-hidden="true" key={`empty-${index}`} />
              }

              const dateValue = formatDateValue(date)
              const isDisabled = Boolean(
                (minDate && dateValue < minDate) ||
                  (maxDate && dateValue > maxDate),
              )
              const isSelected = value === dateValue

              return (
                <button
                  aria-label={dateFormatter.format(date)}
                  aria-pressed={isSelected}
                  className={`min-h-11 rounded-xl text-sm font-medium transition ${
                    isSelected
                      ? 'bg-[#274b48] text-[#f9f5ed]'
                      : isDisabled
                        ? 'cursor-not-allowed text-[#c4c4bd]'
                        : 'text-[#27302f] hover:bg-[#e6eee3]'
                  }`}
                  disabled={isDisabled}
                  key={dateValue}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getUTCDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
