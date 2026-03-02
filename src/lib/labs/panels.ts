/**
 * Lab panel templates for common blood work panels.
 * Each template defines the expected markers with their units and reference ranges.
 */

export interface PanelMarker {
  marker: string
  unit: string
  refMin: number | null
  refMax: number | null
}

export interface PanelTemplate {
  name: string
  description: string
  markers: PanelMarker[]
}

export const LAB_PANELS: PanelTemplate[] = [
  {
    name: 'Complete Blood Count (CBC)',
    description: 'White cells, red cells, hemoglobin, platelets',
    markers: [
      { marker: 'WBC', unit: 'K/uL', refMin: 4.5, refMax: 11.0 },
      { marker: 'RBC', unit: 'M/uL', refMin: 4.0, refMax: 5.5 },
      { marker: 'Hemoglobin', unit: 'g/dL', refMin: 12.0, refMax: 17.5 },
      { marker: 'Hematocrit', unit: '%', refMin: 36.0, refMax: 50.0 },
      { marker: 'Platelets', unit: 'K/uL', refMin: 150, refMax: 400 },
      { marker: 'MCV', unit: 'fL', refMin: 80, refMax: 100 },
      { marker: 'Neutrophils', unit: 'K/uL', refMin: 1.8, refMax: 7.7 },
      { marker: 'Lymphocytes', unit: 'K/uL', refMin: 1.0, refMax: 4.8 },
    ],
  },
  {
    name: 'Comprehensive Metabolic Panel (CMP)',
    description: 'Glucose, electrolytes, kidney & liver function',
    markers: [
      { marker: 'Glucose', unit: 'mg/dL', refMin: 70, refMax: 100 },
      { marker: 'BUN', unit: 'mg/dL', refMin: 7, refMax: 20 },
      { marker: 'Creatinine', unit: 'mg/dL', refMin: 0.6, refMax: 1.2 },
      { marker: 'Sodium', unit: 'mEq/L', refMin: 136, refMax: 145 },
      { marker: 'Potassium', unit: 'mEq/L', refMin: 3.5, refMax: 5.1 },
      { marker: 'Chloride', unit: 'mEq/L', refMin: 98, refMax: 106 },
      { marker: 'CO2', unit: 'mEq/L', refMin: 23, refMax: 29 },
      { marker: 'Calcium', unit: 'mg/dL', refMin: 8.5, refMax: 10.5 },
      { marker: 'Total Protein', unit: 'g/dL', refMin: 6.0, refMax: 8.3 },
      { marker: 'Albumin', unit: 'g/dL', refMin: 3.5, refMax: 5.5 },
    ],
  },
  {
    name: 'Liver Function Panel',
    description: 'AST, ALT, bilirubin, alkaline phosphatase',
    markers: [
      { marker: 'AST', unit: 'U/L', refMin: 10, refMax: 40 },
      { marker: 'ALT', unit: 'U/L', refMin: 7, refMax: 56 },
      { marker: 'ALP', unit: 'U/L', refMin: 44, refMax: 147 },
      { marker: 'Total Bilirubin', unit: 'mg/dL', refMin: 0.1, refMax: 1.2 },
      { marker: 'Direct Bilirubin', unit: 'mg/dL', refMin: 0.0, refMax: 0.3 },
      { marker: 'GGT', unit: 'U/L', refMin: 9, refMax: 48 },
    ],
  },
  {
    name: 'Tumor Markers',
    description: 'Common cancer-related markers',
    markers: [
      { marker: 'CEA', unit: 'ng/mL', refMin: null, refMax: 3.0 },
      { marker: 'CA 19-9', unit: 'U/mL', refMin: null, refMax: 37 },
      { marker: 'CA 125', unit: 'U/mL', refMin: null, refMax: 35 },
      { marker: 'AFP', unit: 'ng/mL', refMin: null, refMax: 10 },
      { marker: 'PSA', unit: 'ng/mL', refMin: null, refMax: 4.0 },
    ],
  },
  {
    name: 'Custom Panel',
    description: 'Add your own markers',
    markers: [],
  },
]

/**
 * Determine flag status for a marker value given reference ranges.
 */
export function computeFlag(
  value: number,
  refMin: number | null,
  refMax: number | null
): 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | null {
  if (refMin === null && refMax === null) return null

  if (refMin !== null && value < refMin) {
    // Critical if > 20% below refMin
    const criticalThreshold = refMin * 0.8
    return value < criticalThreshold ? 'CRITICAL_LOW' : 'LOW'
  }

  if (refMax !== null && value > refMax) {
    // Critical if > 20% above refMax
    const criticalThreshold = refMax * 1.2
    return value > criticalThreshold ? 'CRITICAL_HIGH' : 'HIGH'
  }

  return null
}
