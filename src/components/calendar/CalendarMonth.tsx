'use client'

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { CalendarDayCell } from './CalendarDayCell'

interface Appointment {
  id: string
  title: string
  datetime: string
  location: string | null
}

interface CalendarMonthProps {
  appointments: Appointment[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onMonthChange: (date: Date) => void
  currentMonth: Date
}

export function CalendarMonth({
  appointments,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
}: CalendarMonthProps) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  // Generate all days in the calendar view
  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  // Group into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1))
  }

  const handleToday = () => {
    const today = new Date()
    onMonthChange(today)
    onDateSelect(today)
  }

  // Get appointments for selected date
  const selectedDateAppointments = appointments
    .filter((a) => isSameDay(new Date(a.datetime), selectedDate))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-secondary-600" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-secondary-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={handleToday}
            className="text-sm text-primary-600 font-medium hover:underline"
          >
            Today
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-secondary-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div
            key={dayName}
            className="text-center text-xs font-medium text-secondary-500 py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, weekIdx) =>
          week.map((date, dayIdx) => (
            <CalendarDayCell
              key={`${weekIdx}-${dayIdx}`}
              date={date}
              currentMonth={currentMonth}
              appointments={appointments}
              selectedDate={selectedDate}
              onSelect={onDateSelect}
            />
          ))
        )}
      </div>

      {/* Selected date appointments */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-secondary-600 mb-3">
          {format(selectedDate, 'EEEE, MMMM d')}
        </h3>

        {selectedDateAppointments.length === 0 ? (
          <p className="text-secondary-500 text-sm">No appointments</p>
        ) : (
          <div className="space-y-2">
            {selectedDateAppointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg"
              >
                <div className="text-sm font-medium text-primary-600 whitespace-nowrap">
                  {format(new Date(appt.datetime), 'h:mm a')}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-secondary-900">{appt.title}</p>
                  {appt.location && (
                    <p className="text-sm text-secondary-500">{appt.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
