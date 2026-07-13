import { useState } from 'react'

interface CalendarPopoverProps {
  currentDate: string
  entryDates: Set<string>
  onSelectDate: (date: string) => void
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = []

  for (let i = 0; i < firstDay; i++) {
    week.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null)
    }
    weeks.push(week)
  }

  return weeks
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function CalendarPopover({
  currentDate,
  entryDates,
  onSelectDate,
}: CalendarPopoverProps) {
  const [year, rawMonth] = currentDate.split('-').map(Number)
  const [viewYear, setViewYear] = useState(year)
  const [viewMonth, setViewMonth] = useState(rawMonth)

  const grid = getMonthGrid(viewYear, viewMonth)
  const today = todayStr()

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1)
      setViewMonth(12)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1)
      setViewMonth(1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function isToday(year: number, month: number, day: number): boolean {
    return today === `${year}-${pad(month)}-${pad(day)}`
  }

  function isSelected(year: number, month: number, day: number): boolean {
    return currentDate === `${year}-${pad(month)}-${pad(day)}`
  }

  function hasEntry(year: number, month: number, day: number): boolean {
    return entryDates.has(`${year}-${pad(month)}-${pad(day)}`)
  }

  const monthName = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' },
  )

  return (
    <div className="w-64 rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-md p-1 text-neutral-500 transition-colors duration-150 hover:bg-neutral-800 hover:text-neutral-200"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10 12l-4-4 4-4" />
          </svg>
        </button>

        <span className="text-sm font-medium text-neutral-300">{monthName}</span>

        <button
          type="button"
          onClick={nextMonth}
          className="rounded-md p-1 text-neutral-500 transition-colors duration-150 hover:bg-neutral-800 hover:text-neutral-200"
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 12l4-4-4-4" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
            {name}
          </div>
        ))}

        {grid.map((week, wi) =>
          week.map((day, di) => {
            if (day === null) {
              return <div key={`${wi}-${di}`} />
            }

            const selected = isSelected(viewYear, viewMonth, day)
            const todayDay = isToday(viewYear, viewMonth, day)
            const hasEntryDay = hasEntry(viewYear, viewMonth, day)

            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() =>
                  onSelectDate(
                    `${viewYear}-${pad(viewMonth)}-${pad(day)}`,
                  )
                }
                aria-label={`${monthName} ${day}${hasEntryDay ? ', has entries' : ''}`}
                aria-selected={selected}
                className={`
                  relative flex items-center justify-center rounded-md py-1.5 text-sm
                  transition-colors duration-150
                  ${
                    selected
                      ? 'bg-primary-500 text-white'
                      : todayDay
                        ? 'text-primary-400'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }
                `}
              >
                {day}
                {hasEntryDay && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full ${
                      selected ? 'bg-white/70' : 'bg-primary-500/60'
                    }`}
                  />
                )}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
