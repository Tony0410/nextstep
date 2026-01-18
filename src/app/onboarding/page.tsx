'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Shield, ArrowRight } from 'lucide-react'
import { Button, Input, Card, showToast } from '@/components/ui'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'disclaimer' | 'workspace'>('disclaimer')
  const [workspaceName, setWorkspaceName] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAcceptDisclaimer = () => {
    setStep('workspace')
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create workspace
      const createRes = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName }),
      })

      const createData = await createRes.json()

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create workspace')
      }

      // Update with clinic phone if provided
      if (clinicPhone.trim()) {
        await fetch(`/api/workspaces/${createData.workspace.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicPhone: clinicPhone.trim() }),
        })
      }

      showToast('All set! Welcome to Next Step.', 'success')
      router.push('/today')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'disclaimer') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">Important Notice</h1>
          </div>

          <Card className="mb-6">
            <div className="space-y-4 text-secondary-700">
              <p>
                <strong>Next Step is a tracking tool only.</strong> It helps you and your family
                stay organized with appointments and medications.
              </p>

              <p>
                <strong className="text-red-600">This app does not provide medical advice.</strong>{' '}
                Always consult your healthcare team for medical decisions.
              </p>

              <p>
                <strong>For emergencies:</strong> Call 000 (Australia) or your local emergency
                services immediately.
              </p>

              <p>
                If you have questions about your treatment, contact your clinic directly using the
                button we'll help you set up.
              </p>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-secondary-500">
                  By continuing, you acknowledge that Next Step is for tracking purposes only and
                  does not replace professional medical advice.
                </p>
              </div>
            </div>
          </Card>

          <Button onClick={handleAcceptDisclaimer} fullWidth>
            I Understand
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">Set Up Your Plan</h1>
          <p className="text-secondary-500 mt-1">Create a workspace to get started</p>
        </div>

        <Card className="mb-6">
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <Input
              label="Workspace Name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g., Grace's Plan"
              helperText="This is how family members will identify this workspace"
              required
            />
            <Input
              label="Clinic Phone Number"
              type="tel"
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
              placeholder="e.g., 08 9400 1234"
              helperText="We'll add a 'Call Clinic' button for quick access"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-button">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Create Workspace
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-secondary-500">
          You can add family members later from Settings
        </p>
      </div>
    </div>
  )
}
