'use client'

import { format, isToday, isSameMonth, isSameDay } from 'date-fns'
import { clsx } from 'clsx'

interface Appointment {
  id: string
  title: string
  datetime: string
}

interface CalendarDayCellProps {
  date: Date
  currentMonth: Date
  appointments: Appointment[]
  selectedDate?: Date
  onSelect: (date: Date) => void
}

export function CalendarDayCell({
  date,
  currentMonth,
  appointments,
  selectedDate,
  onSelect,
}: CalendarDayCellProps) {
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isSelected = selectedDate && isSameDay(date, selectedDate)
  const dayAppointments = appointments.filter((a) =>
    isSameDay(new Date(a.datetime), date)
  )
  const hasAppointments = dayAppointments.length > 0

  return (
    <button
      onClick={() => onSelect(date)}
      className={clsx(
        'flex flex-col items-center justify-start p-1 min-h-[60px] rounded-lg transition-colors',
        isCurrentMonth ? 'text-secondary-900' : 'text-secondary-300',
        isToday(date) && 'bg-primary-50 ring-1 ring-primary-200',
        isSelected && 'bg-primary-100 ring-2 ring-primary-500',
        !isSelected && isCurrentMonth && 'hover:bg-secondary-50'
      )}
    >
      <span
        className={clsx(
          'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
          isToday(date) && 'bg-primary-500 text-white'
        )}
      >
        {format(date, 'd')}
      </span>

      {hasAppointments && (
        <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
          {dayAppointments.slice(0, 3).map((_, idx) => (
            <div
              key={idx}
              className="w-1.5 h-1.5 rounded-full bg-primary-500"
            />
          ))}
          {dayAppointments.length > 3 && (
            <span className="text-[10px] text-primary-600 font-medium">
              +{dayAppointments.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
