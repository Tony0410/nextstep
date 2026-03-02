import { INTERACTION_DATABASE, type DrugInteractionEntry } from './data'

export interface InteractionResult {
  drug1Name: string
  drug2Name: string
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED'
  description: string
  recommendation: string
}

/**
 * Normalize a drug name for matching against the interaction database.
 * Strips common suffixes, lowercases, and trims.
 */
function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+(tablets?|capsules?|injection|solution|cream|gel|patch|oral|iv|im|sc)\s*$/i, '')
    .replace(/\s+\d+\s*m?g\s*$/i, '') // Remove dosage (e.g. "500mg")
    .trim()
}

/**
 * Check for known interactions between a list of medication names.
 * Returns all found interactions sorted by severity.
 */
export function checkInteractions(medicationNames: string[]): InteractionResult[] {
  if (medicationNames.length < 2) return []

  const normalized = medicationNames.map((name) => ({
    original: name,
    normalized: normalizeDrugName(name),
  }))

  const results: InteractionResult[] = []
  const seen = new Set<string>()

  // Check each pair of medications
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const nameA = normalized[i].normalized
      const nameB = normalized[j].normalized

      // Find matching interactions (both orderings)
      const matches = INTERACTION_DATABASE.filter(
        (entry) =>
          (entry.drug1 === nameA && entry.drug2 === nameB) ||
          (entry.drug1 === nameB && entry.drug2 === nameA) ||
          (nameA.includes(entry.drug1) && nameB.includes(entry.drug2)) ||
          (nameA.includes(entry.drug2) && nameB.includes(entry.drug1))
      )

      for (const match of matches) {
        const key = [nameA, nameB].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)

        results.push({
          drug1Name: normalized[i].original,
          drug2Name: normalized[j].original,
          severity: match.severity,
          description: match.description,
          recommendation: match.recommendation,
        })
      }
    }
  }

  // Sort by severity (most severe first)
  const severityOrder: Record<string, number> = {
    CONTRAINDICATED: 0,
    MAJOR: 1,
    MODERATE: 2,
    MINOR: 3,
  }

  results.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99))

  return results
}
