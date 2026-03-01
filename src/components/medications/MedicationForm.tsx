'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Calendar, Repeat, Pill, Package, ChevronDown, Plus, X } from 'lucide-react'
import { Button, Input, Textarea, Select, showToast } from '@/components/ui'
import { useApp } from '@/app/(app)/provider'

type ScheduleType = 'FIXED_TIMES' | 'INTERVAL' | 'WEEKDAYS' | 'PRN'

const scheduleTypeOptions = [
  { value: 'FIXED_TIMES', label: 'Fixed times daily', icon: Clock, desc: 'Same times every day' },
  { value: 'INTERVAL', label: 'Every X hours', icon: Repeat, desc: 'Regular intervals' },
  { value: 'WEEKDAYS', label: 'Specific days', icon: Calendar, desc: 'Certain days of the week' },
  { value: 'PRN', label: 'As needed (PRN)', icon: Pill, desc: 'When you need it' },
]

const weekdays = [
  { value: 0, label: 'Sun', full: 'Sunday' },
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
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
  const [mounted, setMounted] = useState(false)

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
    setMounted(true)
  }, [])

  useEffect(() => {
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
          ...(trackRefills && pillCount !== '' && {
            pillCount: Number(pillCount),
            pillsPerDose,
            refillThreshold,
          }),
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

  const currentScheduleOption = scheduleTypeOptions.find(opt => opt.value === scheduleType)
  const ScheduleIcon = currentScheduleOption?.icon || Clock

  return (
    <div className={`space-y-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Form Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Pill className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="font-display text-display-sm text-secondary-900">
          {isEditing ? 'Edit Medication' : 'Add Medication'}
        </h2>
        <p className="text-secondary-500 mt-2">
          {isEditing ? 'Update your medication details' : 'Keep track of your medications'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="section-warm space-y-5">
          <h3 className="font-display text-lg text-secondary-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-semibold">1</span>
            Basic Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Medication Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Paracetamol 500mg"
                className="input-sanctuary w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Instructions
                <span className="text-secondary-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., Take with food, Avoid grapefruit..."
                rows={2}
                className="input-sanctuary w-full resize-none"
              />
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="section-warm space-y-5">
          <h3 className="font-display text-lg text-secondary-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-semibold">2</span>
            Schedule
          </h3>

          {/* Schedule Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            {scheduleTypeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = scheduleType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScheduleType(option.value as ScheduleType)}
                  className={`p-4 rounded-card border-2 text-left transition-all duration-300 ${
                    isSelected
                      ? 'border-primary-400 bg-primary-50/50 shadow-soft'
                      : 'border-cream-200 bg-surface hover:border-cream-300 hover:shadow-soft'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary-600' : 'text-secondary-400'}`} />
                  <p className={`font-semibold text-sm ${isSelected ? 'text-primary-800' : 'text-secondary-700'}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-secondary-400 mt-0.5">{option.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Schedule-specific options */}
          <div className="bg-cream-50/50 rounded-card p-5 border border-cream-200/60">
            {scheduleType === 'FIXED_TIMES' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-secondary-700">
                  Times to take each day
                </label>
                <div className="space-y-3">
                  {times.map((time, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => updateTime(index, e.target.value)}
                          className="input-sanctuary w-full pl-10"
                        />
                      </div>
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTime(index)}
                          className="w-10 h-10 rounded-button bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-secondary-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTime}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add another time
                </button>
              </div>
            )}

            {scheduleType === 'INTERVAL' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Every (hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(parseInt(e.target.value) || 1)}
                      className="input-sanctuary w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Starting at
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="input-sanctuary w-full pl-10"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-secondary-500">
                  Example: Every {intervalHours} hours starting at {startTime}
                </p>
              </div>
            )}

            {scheduleType === 'WEEKDAYS' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-3">
                    Which days?
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {weekdays.map((day) => {
                      const isSelected = selectedDays.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`aspect-square rounded-button text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-primary-500 text-white shadow-lg scale-105'
                              : 'bg-cream-100 text-secondary-600 hover:bg-cream-200'
                          }`}
                          title={day.full}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    At what time?
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                    <input
                      type="time"
                      value={weekdayTime}
                      onChange={(e) => setWeekdayTime(e.target.value)}
                      className="input-sanctuary w-full pl-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {scheduleType === 'PRN' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Minimum hours between doses
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={72}
                    step={0.5}
                    value={minHoursBetween}
                    onChange={(e) => setMinHoursBetween(parseFloat(e.target.value) || 4)}
                    className="input-sanctuary w-full"
                  />
                </div>
                <p className="text-sm text-secondary-500">
                  Shows "Available" when enough time has passed since your last dose
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Refill Tracking Section */}
        <div className="section-warm space-y-5">
          <h3 className="font-display text-lg text-secondary-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-secondary-600 text-sm font-semibold">
              <Package className="w-4 h-4" />
            </span>
            Refill Tracking
            <span className="text-sm font-normal text-secondary-400 ml-auto">Optional</span>
          </h3>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="trackRefills"
              checked={trackRefills}
              onChange={(e) => setTrackRefills(e.target.checked)}
              className="w-5 h-5 rounded border-cream-300 text-primary-500 focus:ring-primary-400"
            />
            <label htmlFor="trackRefills" className="text-sm text-secondary-700">
              Track pill count and get refill reminders
            </label>
          </div>

          {trackRefills && (
            <div className="space-y-4 pt-2 pl-8 border-l-2 border-cream-200">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Current pill count
                </label>
                <input
                  type="number"
                  min={0}
                  value={pillCount}
                  onChange={(e) => setPillCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g., 30"
                  className="input-sanctuary w-full"
                />
                <p className="text-xs text-secondary-400 mt-1.5">How many pills do you have now?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Pills per dose
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={pillsPerDose}
                    onChange={(e) => setPillsPerDose(parseInt(e.target.value) || 1)}
                    className="input-sanctuary w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Alert when below
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={refillThreshold}
                    onChange={(e) => setRefillThreshold(parseInt(e.target.value) || 7)}
                    className="input-sanctuary w-full"
                  />
                  <p className="text-xs text-secondary-400 mt-1.5">pills remaining</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-alert-50 border border-alert-200 rounded-card p-4">
            <p className="text-sm text-alert-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Medication' : 'Save Medication'}
          </button>
        </div>
      </form>
    </div>
  )
}
