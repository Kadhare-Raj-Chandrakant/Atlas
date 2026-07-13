import { useRef, useEffect, useState } from 'react'
import { getDatesWithEntries } from '@/core/memory/entry-service'
import { CalendarPopover } from './CalendarPopover'

interface DateNavigationProps {
  currentDate: string
  onSelectDate: (date: string) => void
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function moveDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta)
  return date.toISOString().split('T')[0]
}

export function DateNavigation({
  currentDate,
  onSelectDate,
}: DateNavigationProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set())
  const calendarRef = useRef<HTMLDivElement>(null)

  const [year, month] = currentDate.split('-').map(Number)

  useEffect(() => {
    if (calendarOpen) {
      getDatesWithEntries(year, month).then((dates) => {
        setEntryDates(new Set(dates))
      })
    }
  }, [calendarOpen, year, month])

  useEffect(() => {
    if (!calendarOpen) return
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [calendarOpen])

  return (
    <div className="relative flex items-center justify-between">
      <button
        type="button"
        onClick={() => onSelectDate(moveDay(currentDate, -1))}
        className="rounded-md p-1 text-neutral-500 transition-colors duration-150 hover:bg-neutral-800 hover:text-neutral-200"
        aria-label="Previous day"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 15l-5-5 5-5" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setCalendarOpen(!calendarOpen)}
        aria-label="Open calendar"
        aria-expanded={calendarOpen}
        aria-haspopup="dialog"
        className="rounded-md px-2 py-1 text-sm font-medium tracking-wide text-neutral-400 transition-colors duration-150 hover:bg-neutral-800 hover:text-neutral-200"
      >
        {formatDateHeader(currentDate)}
      </button>

      <button
        type="button"
        onClick={() => onSelectDate(moveDay(currentDate, 1))}
        className="rounded-md p-1 text-neutral-500 transition-colors duration-150 hover:bg-neutral-800 hover:text-neutral-200"
        aria-label="Next day"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 15l5-5-5-5" />
        </svg>
      </button>

      {calendarOpen && (
        <div
          ref={calendarRef}
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
        >
          <CalendarPopover
            currentDate={currentDate}
            entryDates={entryDates}
            onSelectDate={(date) => {
              onSelectDate(date)
              setCalendarOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
