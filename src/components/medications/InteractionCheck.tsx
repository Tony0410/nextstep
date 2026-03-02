'use client'

import { useState } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { Modal, Button, showToast } from '@/components/ui'
import { InteractionCard } from './InteractionCard'

interface InteractionResult {
  drug1Name: string
  drug2Name: string
  severity: string
  description: string
  recommendation: string
}

interface InteractionCheckProps {
  workspaceId: string
}

export function InteractionCheck({ workspaceId }: InteractionCheckProps) {
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState<InteractionResult[] | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [medCount, setMedCount] = useState(0)

  const handleCheck = async () => {
    setChecking(true)
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/medications/check-interactions`,
        { method: 'POST' }
      )
      if (!response.ok) throw new Error('Failed to check interactions')

      const data = await response.json()
      setResults(data.interactions)
      setMedCount(data.medicationCount)
      setShowResults(true)

      if (data.interactions.length === 0) {
        showToast('No interactions found', 'success')
      }
    } catch {
      showToast('Failed to check interactions', 'error')
    } finally {
      setChecking(false)
    }
  }

  const majorCount = results?.filter(
    (r) => r.severity === 'MAJOR' || r.severity === 'CONTRAINDICATED'
  ).length ?? 0

  return (
    <>
      {/* Check button */}
      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-card p-3 transition-colors disabled:opacity-50"
      >
        {checking ? (
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        ) : (
          <Shield className="w-5 h-5 text-primary-600" />
        )}
        <span className="text-sm font-semibold text-primary-700">
          {checking ? 'Checking...' : 'Check Drug Interactions'}
        </span>
      </button>

      {/* Results Modal */}
      <Modal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        title="Drug Interactions"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Summary */}
          <div className="text-sm text-secondary-600">
            Checked {medCount} active medications.
          </div>

          {results && results.length === 0 && (
            <div className="text-center py-6">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-green-700">No Interactions Found</p>
              <p className="text-sm text-secondary-500 mt-1">
                No known interactions between your current medications.
              </p>
            </div>
          )}

          {results && results.length > 0 && (
            <>
              {majorCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 font-medium">
                  {majorCount} major interaction{majorCount !== 1 ? 's' : ''} found — discuss with your care team
                </div>
              )}
              <div className="space-y-3">
                {results.map((interaction, i) => (
                  <InteractionCard key={i} interaction={interaction} />
                ))}
              </div>
            </>
          )}

          <div className="pt-2">
            <Button variant="secondary" onClick={() => setShowResults(false)} fullWidth>
              Close
            </Button>
          </div>

          <p className="text-xs text-secondary-400 text-center">
            This is a simplified check using a local database. Always consult your pharmacist or oncologist.
          </p>
        </div>
      </Modal>
    </>
  )
}
