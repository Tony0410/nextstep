import { describe, it, expect } from 'vitest'
import {
  temperatureLogSchema,
  contactSchema,
  weightLogSchema,
  milestoneSchema,
  caregiverTaskSchema,
  labResultSchema,
  labMarkerSchema,
  medicalDocumentSchema,
  interactionCheckSchema,
} from './schemas'

describe('temperatureLogSchema', () => {
  it('accepts valid temperature log', () => {
    const result = temperatureLogSchema.safeParse({
      tempCelsius: 37.2,
      method: 'oral',
      notes: 'Feeling warm',
    })
    expect(result.success).toBe(true)
  })

  it('accepts temperature without optional fields', () => {
    const result = temperatureLogSchema.safeParse({ tempCelsius: 36.5 })
    expect(result.success).toBe(true)
  })

  it('rejects temperature below 30°C', () => {
    const result = temperatureLogSchema.safeParse({ tempCelsius: 29.9 })
    expect(result.success).toBe(false)
  })

  it('rejects temperature above 45°C', () => {
    const result = temperatureLogSchema.safeParse({ tempCelsius: 45.1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid method', () => {
    const result = temperatureLogSchema.safeParse({
      tempCelsius: 37.0,
      method: 'rectal',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null method', () => {
    const result = temperatureLogSchema.safeParse({
      tempCelsius: 37.0,
      method: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('contactSchema', () => {
  const validContact = {
    name: 'Dr. Smith',
    role: 'Oncologist',
    category: 'ONCOLOGY',
    phone: '+61 2 1234 5678',
  }

  it('accepts valid contact', () => {
    const result = contactSchema.safeParse(validContact)
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = contactSchema.safeParse({ ...validContact, name: '' })
    expect(result.success).toBe(false)
  })

  it('requires phone', () => {
    const result = contactSchema.safeParse({ ...validContact, phone: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid category', () => {
    const result = contactSchema.safeParse({ ...validContact, category: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid categories', () => {
    const categories = ['ONCOLOGY', 'HOSPITAL', 'PHARMACY', 'INSURANCE', 'FAMILY', 'OTHER']
    for (const category of categories) {
      const result = contactSchema.safeParse({ ...validContact, category })
      expect(result.success).toBe(true)
    }
  })

  it('validates email format when provided', () => {
    const result = contactSchema.safeParse({ ...validContact, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts valid email', () => {
    const result = contactSchema.safeParse({ ...validContact, email: 'dr@clinic.com' })
    expect(result.success).toBe(true)
  })

  it('defaults isEmergency to false', () => {
    const result = contactSchema.safeParse(validContact)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isEmergency).toBe(false)
    }
  })
})

describe('weightLogSchema', () => {
  it('accepts valid weight', () => {
    const result = weightLogSchema.safeParse({ weightKg: 65.5 })
    expect(result.success).toBe(true)
  })

  it('rejects weight below 1kg', () => {
    const result = weightLogSchema.safeParse({ weightKg: 0.5 })
    expect(result.success).toBe(false)
  })

  it('rejects weight above 500kg', () => {
    const result = weightLogSchema.safeParse({ weightKg: 501 })
    expect(result.success).toBe(false)
  })

  it('accepts optional notes', () => {
    const result = weightLogSchema.safeParse({
      weightKg: 70,
      notes: 'After breakfast',
    })
    expect(result.success).toBe(true)
  })
})

describe('milestoneSchema', () => {
  const validMilestone = {
    type: 'CHEMO_CYCLE',
    title: 'Cycle 4 - Carboplatin',
    plannedDate: '2026-03-15T09:00:00.000Z',
  }

  it('accepts valid milestone', () => {
    const result = milestoneSchema.safeParse(validMilestone)
    expect(result.success).toBe(true)
  })

  it('requires title', () => {
    const result = milestoneSchema.safeParse({ ...validMilestone, title: '' })
    expect(result.success).toBe(false)
  })

  it('requires plannedDate as valid datetime', () => {
    const result = milestoneSchema.safeParse({ ...validMilestone, plannedDate: 'not-a-date' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid types', () => {
    const types = ['CHEMO_CYCLE', 'SURGERY', 'RADIATION', 'SCAN', 'CONSULTATION', 'OTHER']
    for (const type of types) {
      const result = milestoneSchema.safeParse({ ...validMilestone, type })
      expect(result.success).toBe(true)
    }
  })

  it('defaults status to SCHEDULED', () => {
    const result = milestoneSchema.safeParse(validMilestone)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('SCHEDULED')
    }
  })

  it('accepts all valid statuses', () => {
    const statuses = ['SCHEDULED', 'COMPLETED', 'DELAYED', 'CANCELLED']
    for (const status of statuses) {
      const result = milestoneSchema.safeParse({ ...validMilestone, status })
      expect(result.success).toBe(true)
    }
  })
})

describe('caregiverTaskSchema', () => {
  const validTask = {
    title: 'Pick up prescription',
    category: 'ERRANDS',
  }

  it('accepts valid task', () => {
    const result = caregiverTaskSchema.safeParse(validTask)
    expect(result.success).toBe(true)
  })

  it('requires title', () => {
    const result = caregiverTaskSchema.safeParse({ ...validTask, title: '' })
    expect(result.success).toBe(false)
  })

  it('defaults priority to NORMAL', () => {
    const result = caregiverTaskSchema.safeParse(validTask)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe('NORMAL')
    }
  })

  it('defaults status to TODO', () => {
    const result = caregiverTaskSchema.safeParse(validTask)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('TODO')
    }
  })

  it('accepts all categories', () => {
    const cats = ['MEDICAL', 'ERRANDS', 'MEALS', 'EMOTIONAL', 'OTHER']
    for (const category of cats) {
      const result = caregiverTaskSchema.safeParse({ ...validTask, category })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all priority levels', () => {
    const pris = ['URGENT', 'HIGH', 'NORMAL', 'LOW']
    for (const priority of pris) {
      const result = caregiverTaskSchema.safeParse({ ...validTask, priority })
      expect(result.success).toBe(true)
    }
  })

  it('accepts optional dueDate', () => {
    const result = caregiverTaskSchema.safeParse({
      ...validTask,
      dueDate: '2026-03-15T09:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid dueDate format', () => {
    const result = caregiverTaskSchema.safeParse({
      ...validTask,
      dueDate: 'next tuesday',
    })
    expect(result.success).toBe(false)
  })
})

describe('labMarkerSchema', () => {
  it('accepts valid marker', () => {
    const result = labMarkerSchema.safeParse({
      marker: 'WBC',
      value: 7.5,
      unit: 'K/uL',
      refMin: 4.5,
      refMax: 11.0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts marker without reference ranges', () => {
    const result = labMarkerSchema.safeParse({
      marker: 'WBC',
      value: 7.5,
      unit: 'K/uL',
    })
    expect(result.success).toBe(true)
  })

  it('requires marker name', () => {
    const result = labMarkerSchema.safeParse({
      marker: '',
      value: 7.5,
      unit: 'K/uL',
    })
    expect(result.success).toBe(false)
  })

  it('accepts flag values', () => {
    const flags = ['LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH']
    for (const flag of flags) {
      const result = labMarkerSchema.safeParse({
        marker: 'WBC',
        value: 3.0,
        unit: 'K/uL',
        flag,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid flag', () => {
    const result = labMarkerSchema.safeParse({
      marker: 'WBC',
      value: 3.0,
      unit: 'K/uL',
      flag: 'VERY_HIGH',
    })
    expect(result.success).toBe(false)
  })
})

describe('labResultSchema', () => {
  const validResult = {
    testDate: '2026-03-01T09:00:00.000Z',
    panelName: 'Complete Blood Count',
    results: [
      { marker: 'WBC', value: 7.5, unit: 'K/uL', refMin: 4.5, refMax: 11.0 },
    ],
  }

  it('accepts valid lab result', () => {
    const result = labResultSchema.safeParse(validResult)
    expect(result.success).toBe(true)
  })

  it('requires at least one marker', () => {
    const result = labResultSchema.safeParse({ ...validResult, results: [] })
    expect(result.success).toBe(false)
  })

  it('requires testDate', () => {
    const { testDate, ...noDate } = validResult
    const result = labResultSchema.safeParse(noDate)
    expect(result.success).toBe(false)
  })

  it('requires panelName', () => {
    const result = labResultSchema.safeParse({ ...validResult, panelName: '' })
    expect(result.success).toBe(false)
  })
})

describe('medicalDocumentSchema', () => {
  it('accepts valid document metadata', () => {
    const result = medicalDocumentSchema.safeParse({
      title: 'Blood work Feb 2026',
      category: 'LAB_REPORT',
    })
    expect(result.success).toBe(true)
  })

  it('requires title', () => {
    const result = medicalDocumentSchema.safeParse({
      title: '',
      category: 'LAB_REPORT',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid categories', () => {
    const cats = ['LAB_REPORT', 'SCAN', 'INSURANCE', 'ID_CARD', 'PRESCRIPTION', 'OTHER']
    for (const category of cats) {
      const result = medicalDocumentSchema.safeParse({ title: 'Test', category })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid category', () => {
    const result = medicalDocumentSchema.safeParse({
      title: 'Test',
      category: 'XRAY',
    })
    expect(result.success).toBe(false)
  })
})

describe('interactionCheckSchema', () => {
  it('accepts valid list of medication IDs', () => {
    const result = interactionCheckSchema.safeParse({
      medicationIds: ['clxxxxxxxxxxxxxxxxxxxxxxxxx', 'clyyyyyyyyyyyyyyyyyyyyyyyy'],
    })
    expect(result.success).toBe(true)
  })

  it('requires at least 2 IDs', () => {
    const result = interactionCheckSchema.safeParse({
      medicationIds: ['clxxxxxxxxxxxxxxxxxxxxxxxxx'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than 20 IDs', () => {
    const ids = Array.from({ length: 21 }, (_, i) => `cl${'x'.repeat(24)}${i}`)
    const result = interactionCheckSchema.safeParse({ medicationIds: ids })
    expect(result.success).toBe(false)
  })
})
