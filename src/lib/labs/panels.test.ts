import { describe, it, expect } from 'vitest'
import { computeFlag, LAB_PANELS } from './panels'

describe('computeFlag', () => {
  it('returns null when value is within normal range', () => {
    expect(computeFlag(7.0, 4.5, 11.0)).toBeNull()
    expect(computeFlag(4.5, 4.5, 11.0)).toBeNull()
    expect(computeFlag(11.0, 4.5, 11.0)).toBeNull()
  })

  it('returns LOW when value is below refMin but not critical', () => {
    // refMin is 4.5, 80% of refMin is 3.6
    // Value 4.0 is below 4.5 but above 3.6
    expect(computeFlag(4.0, 4.5, 11.0)).toBe('LOW')
  })

  it('returns CRITICAL_LOW when value is > 20% below refMin', () => {
    // refMin is 4.5, 80% of refMin is 3.6
    // Value 3.0 is below 3.6
    expect(computeFlag(3.0, 4.5, 11.0)).toBe('CRITICAL_LOW')
  })

  it('returns HIGH when value is above refMax but not critical', () => {
    // refMax is 11.0, 120% of refMax is 13.2
    // Value 12.0 is above 11.0 but below 13.2
    expect(computeFlag(12.0, 4.5, 11.0)).toBe('HIGH')
  })

  it('returns CRITICAL_HIGH when value is > 20% above refMax', () => {
    // refMax is 11.0, 120% of refMax is 13.2
    // Value 14.0 is above 13.2
    expect(computeFlag(14.0, 4.5, 11.0)).toBe('CRITICAL_HIGH')
  })

  it('returns null when both refMin and refMax are null', () => {
    expect(computeFlag(50.0, null, null)).toBeNull()
  })

  it('handles refMin-only check (no refMax)', () => {
    expect(computeFlag(3.0, 4.5, null)).toBe('CRITICAL_LOW')
    expect(computeFlag(4.0, 4.5, null)).toBe('LOW')
    expect(computeFlag(5.0, 4.5, null)).toBeNull()
  })

  it('handles refMax-only check (no refMin)', () => {
    // Tumor markers: refMin is null, refMax is 3.0
    expect(computeFlag(2.5, null, 3.0)).toBeNull()
    expect(computeFlag(3.5, null, 3.0)).toBe('HIGH')
    expect(computeFlag(4.0, null, 3.0)).toBe('CRITICAL_HIGH')
  })

  it('flags exact boundary as within range', () => {
    expect(computeFlag(4.5, 4.5, 11.0)).toBeNull()
    expect(computeFlag(11.0, 4.5, 11.0)).toBeNull()
  })

  it('flags value just below refMin as LOW', () => {
    expect(computeFlag(4.49, 4.5, 11.0)).toBe('LOW')
  })

  it('flags value just above refMax as HIGH', () => {
    expect(computeFlag(11.01, 4.5, 11.0)).toBe('HIGH')
  })
})

describe('LAB_PANELS', () => {
  it('contains at least 4 panel templates', () => {
    expect(LAB_PANELS.length).toBeGreaterThanOrEqual(4)
  })

  it('each panel has a name and markers array', () => {
    for (const panel of LAB_PANELS) {
      expect(panel.name).toBeTruthy()
      expect(Array.isArray(panel.markers)).toBe(true)
    }
  })

  it('CBC panel has expected markers', () => {
    const cbc = LAB_PANELS.find((p) => p.name.includes('CBC'))
    expect(cbc).toBeDefined()
    const markerNames = cbc!.markers.map((m) => m.marker)
    expect(markerNames).toContain('WBC')
    expect(markerNames).toContain('RBC')
    expect(markerNames).toContain('Hemoglobin')
    expect(markerNames).toContain('Platelets')
  })

  it('each marker in standard panels has unit and at least one reference bound', () => {
    for (const panel of LAB_PANELS) {
      if (panel.name === 'Custom Panel') continue
      for (const marker of panel.markers) {
        expect(marker.unit).toBeTruthy()
        expect(marker.refMin !== null || marker.refMax !== null).toBe(true)
      }
    }
  })
})
