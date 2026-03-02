import { describe, it, expect } from 'vitest'
import { checkInteractions } from './checker'

describe('checkInteractions', () => {
  it('returns empty array for fewer than 2 medications', () => {
    expect(checkInteractions([])).toEqual([])
    expect(checkInteractions(['methotrexate'])).toEqual([])
  })

  it('finds a known CONTRAINDICATED interaction', () => {
    const results = checkInteractions(['Methotrexate', 'Trimethoprim'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('CONTRAINDICATED')
    expect(results[0].drug1Name).toBe('Methotrexate')
    expect(results[0].drug2Name).toBe('Trimethoprim')
  })

  it('finds a known MAJOR interaction', () => {
    const results = checkInteractions(['Fluorouracil', 'Warfarin'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('MAJOR')
  })

  it('finds a known MODERATE interaction', () => {
    const results = checkInteractions(['Methotrexate', 'Aspirin'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('MODERATE')
  })

  it('finds a known MINOR interaction', () => {
    const results = checkInteractions(['Ondansetron', 'Aprepitant'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('MINOR')
  })

  it('returns empty for medications with no known interactions', () => {
    const results = checkInteractions(['Acetaminophen', 'Vitamin D'])
    expect(results).toEqual([])
  })

  it('handles case-insensitive matching', () => {
    const results = checkInteractions(['METHOTREXATE', 'trimethoprim'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('CONTRAINDICATED')
  })

  it('strips dosage suffixes when matching', () => {
    const results = checkInteractions(['Methotrexate 500mg', 'Trimethoprim 200mg'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('CONTRAINDICATED')
  })

  it('strips dosage form suffixes when matching', () => {
    const results = checkInteractions(['Methotrexate tablets', 'Ibuprofen capsules'])
    expect(results.length).toBe(1)
    expect(results[0].severity).toBe('MAJOR')
  })

  it('finds multiple interactions for a drug with many conflicts', () => {
    const results = checkInteractions([
      'Methotrexate',
      'Ibuprofen',
      'Trimethoprim',
      'Omeprazole',
    ])
    expect(results.length).toBeGreaterThanOrEqual(3)
    // Should be sorted: CONTRAINDICATED first, then MAJOR, then MODERATE
    expect(results[0].severity).toBe('CONTRAINDICATED')
  })

  it('sorts results by severity (most severe first)', () => {
    const results = checkInteractions([
      'Methotrexate',
      'Ibuprofen',
      'Trimethoprim',
      'Aspirin',
    ])
    const severities = results.map((r) => r.severity)
    const order = { CONTRAINDICATED: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 }
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]])
    }
  })

  it('does not produce duplicate interaction entries', () => {
    const results = checkInteractions(['Warfarin', 'Fluorouracil'])
    expect(results.length).toBe(1)
  })

  it('handles reversed drug order correctly', () => {
    const r1 = checkInteractions(['Fluorouracil', 'Warfarin'])
    const r2 = checkInteractions(['Warfarin', 'Fluorouracil'])
    expect(r1.length).toBe(r2.length)
    expect(r1[0].severity).toBe(r2[0].severity)
  })
})
