'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Textarea, Select, Card, showToast } from '@/components/ui'
import { useApp } from '@/app/(app)/provider'

type ScheduleType = 'FIXED_TIMES' | 'INTERVAL' | 'WEEKDAYS' | 'PRN'

const scheduleTypeOptions = [
  { value: 'FIXED_TIMES', label: 'Fixed times daily' },
  { value: 'INTERVAL', label: 'Every X hours' },
  { value: 'WEEKDAYS', label: 'Specific days of week' },
  { value: 'PRN', label: 'As needed (PRN)' },
]

const weekdays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

interface MedicationFormProps {
  initialData?: {
    id?: string
    name: string
    instructions?: string | null
    scheduleType: string
    scheduleData: any
    active?: boolean
    pillCount?: number | null
    pillsPerDose?: number | null
    refillThreshold?: number | null
  }
  isEditing?: boolean
}

export function MedicationForm({ initialData, isEditing = false }: MedicationFormProps) {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()

  const [name, setName] = useState(initialData?.name || '')
  const [instructions, setInstructions] = useState(initialData?.instructions || '')
  const [scheduleType, setScheduleType] = useState<ScheduleType>((initialData?.scheduleType as ScheduleType) || 'FIXED_TIMES')

  // Fixed times
  const [times, setTimes] = useState<string[]>(initialData?.scheduleData?.times || ['08:00'])

  // Interval
  const [intervalHours, setIntervalHours] = useState(initialData?.scheduleData?.hours || 8)
  const [startTime, setStartTime] = useState(initialData?.scheduleData?.startTime || '08:00')

  // Weekdays
  const [selectedDays, setSelectedDays] = useState<number[]>(initialData?.scheduleData?.days || [1, 3, 5])
  const [weekdayTime, setWeekdayTime] = useState(initialData?.scheduleData?.time || '09:00')

  // PRN
  const [minHoursBetween, setMinHoursBetween] = useState(initialData?.scheduleData?.minHoursBetween || 4)

  // Refill tracking (optional)
  const hasRefillInfo = initialData?.pillCount !== null && initialData?.pillCount !== undefined
  const [trackRefills, setTrackRefills] = useState(hasRefillInfo)
  const [pillCount, setPillCount] = useState<number | ''>(initialData?.pillCount ?? '')
  const [pillsPerDose, setPillsPerDose] = useState(initialData?.pillsPerDose || 1)
  const [refillThreshold, setRefillThreshold] = useState(initialData?.refillThreshold || 7)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Reset defaults if switching types and no initial data for that type
    if (initialData?.scheduleType !== scheduleType) {
        // Keep current state if user is just switching around in new mode
    }
  }, [scheduleType, initialData])

  const addTime = () => {
    setTimes([...times, '12:00'])
  }

  const removeTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index))
  }

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times]
    newTimes[index] = value
    setTimes(newTimes)
  }

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day))
    } else {
      setSelectedDays([...selectedDays, day].sort())
    }
  }

  const buildScheduleData = () => {
    switch (scheduleType) {
      case 'FIXED_TIMES':
        return { type: 'FIXED_TIMES', times }
      case 'INTERVAL':
        return { type: 'INTERVAL', hours: intervalHours, startTime }
      case 'WEEKDAYS':
        return { type: 'WEEKDAYS', days: selectedDays, time: weekdayTime }
      case 'PRN':
        return { type: 'PRN', minHoursBetween }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = isEditing && initialData?.id
        ? `/api/workspaces/${currentWorkspace.id}/medications/${initialData.id}`
        : `/api/workspaces/${currentWorkspace.id}/medications`
      
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          instructions: instructions || null,
          scheduleType,
          scheduleData: buildScheduleData(),
          active: true,
          // Refill tracking
          ...(trackRefills && pillCount !== '' && {
            pillCount: Number(pillCount),
            pillsPerDose,
            refillThreshold,
          }),
          // Explicitly nullify if disabled during edit
          ...(isEditing && !trackRefills && {
             pillCount: null,
             pillsPerDose: null,
             refillThreshold: null,
          })
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save medication')
      }

      await refreshData()
      showToast(isEditing ? 'Medication updated' : 'Medication added', 'success')
      router.push('/meds')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Medication Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Paracetamol 500mg"
          required
        />

        <Textarea
          label="Instructions (optional)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g., Take with food"
          rows={2}
        />

        <Select
          label="Schedule Type"
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
          options={scheduleTypeOptions}
        />

        {/* Schedule-specific options */}
        {scheduleType === 'FIXED_TIMES' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-secondary-700">
              Times to take
            </label>
            {times.map((time, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="flex-1"
                />
                {times.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeTime(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addTime} size="sm">
              + Add time
            </Button>
          </div>
        )}

        {scheduleType === 'INTERVAL' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Every (hours)"
                type="number"
                min={1}
                max={72}
                value={intervalHours}
                onChange={(e) => setIntervalHours(parseInt(e.target.value) || 1)}
              />
              <Input
                label="Starting at"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {scheduleType === 'WEEKDAYS' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Days
              </label>
              <div className="flex gap-2 flex-wrap">
                {weekdays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-primary-500 text-white'
                        : 'bg-muted text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Time"
              type="time"
              value={weekdayTime}
              onChange={(e) => setWeekdayTime(e.target.value)}
            />
          </div>
        )}

        {scheduleType === 'PRN' && (
          <Input
            label="Minimum hours between doses"
            type="number"
            min={0.5}
            max={72}
            step={0.5}
            value={minHoursBetween}
            onChange={(e) => setMinHoursBetween(parseFloat(e.target.value) || 4)}
            helperText="Shows 'Available' when enough time has passed since last dose"
          />
        )}

        {/* Refill Tracking (optional) */}
        <div className="border-t border-border pt-5">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="trackRefills"
              checked={trackRefills}
              onChange={(e) => setTrackRefills(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="trackRefills" className="text-sm font-medium text-secondary-700">
              Track pill count for refill reminders (optional)
            </label>
          </div>

          {trackRefills && (
            <div className="space-y-4 pl-8">
              <Input
                label="Current pill count"
                type="number"
                min={0}
                value={pillCount}
                onChange={(e) => setPillCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="e.g., 30"
                helperText="How many pills do you have now?"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Pills per dose"
                  type="number"
                  min={1}
                  value={pillsPerDose}
                  onChange={(e) => setPillsPerDose(parseInt(e.target.value) || 1)}
                />
                <Input
                  label="Alert when below"
                  type="number"
                  min={0}
                  value={refillThreshold}
                  onChange={(e) => setRefillThreshold(parseInt(e.target.value) || 7)}
                  helperText="pills"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-button">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading}>
            {isEditing ? 'Update Medication' : 'Save Medication'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
