'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Shield, ArrowRight, Sparkles, Users, Bell } from 'lucide-react'
import { Button, Input, showToast } from '@/components/ui'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'disclaimer' | 'workspace'>('disclaimer')
  const [workspaceName, setWorkspaceName] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

      showToast('Welcome to Next Step', 'success')
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
      <div className="min-h-screen paper-texture flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Decorative blobs */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="blob blob-primary w-96 h-96 -top-48 -right-48" />
            <div className="blob blob-accent w-80 h-80 bottom-20 -left-40" />
            <div className="blob blob-cream w-64 h-64 top-1/2 right-1/4" />
          </div>

          <div className={`relative transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Logo/Icon */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-card-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-6 shadow-elevated">
                <Heart className="w-12 h-12 text-white" />
              </div>
              
              <h1 className="font-display text-display-md text-secondary-900 mb-2">
                Next Step
              </h1>
              <p className="text-secondary-500 text-lg">
                Supporting you through every step
              </p>
            </div>

            {/* Disclaimer Card */}
            <div className="section-warm mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-accent-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent-600" />
                </div>
                <h2 className="font-display text-xl text-secondary-900">Important Notice</h2>
              </div>

              <div className="space-y-4 text-secondary-700">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-secondary-900">Next Step is a tracking tool only.</strong>{' '}
                    It helps you and your family stay organized with appointments and medications.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-alert-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-alert-600 text-xs font-bold">!</span>
                  </div>
                  <p>
                    <strong className="text-alert-600">This app does not provide medical advice.</strong>{' '}
                    Always consult your healthcare team for medical decisions.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-alert-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">000</span>
                  </div>
                  <p>
                    <strong>For emergencies:</strong> Call 000 (Australia) or your local emergency services immediately.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Users className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <p>
                    Have questions about your treatment? Contact your clinic directly using the button we'll help you set up.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-cream-200">
                <p className="text-sm text-secondary-500 text-center">
                  By continuing, you acknowledge that Next Step is for tracking purposes only and does not replace professional medical advice.
                </p>
              </div>
            </div>

            <button
              onClick={handleAcceptDisclaimer}
              className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
            >
              I Understand
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen paper-texture flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Decorative blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="blob blob-primary w-80 h-80 -top-32 right-0" />
          <div className="blob blob-cream w-64 h-64 bottom-0 left-0" />
        </div>

        <div className={`relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-card-lg bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-elevated">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="font-display text-display-sm text-secondary-900 mb-2">
              Set Up Your Plan
            </h1>
            <p className="text-secondary-500 text-lg">Create a workspace to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateWorkspace} className="section-warm space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Workspace Name
                <span className="text-alert-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g., Grace's Plan"
                className="input-sanctuary w-full"
                required
              />
              <p className="text-xs text-secondary-400 mt-2">
                This is how family members will identify this workspace
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Clinic Phone Number
                <span className="text-secondary-400 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="tel"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                  placeholder="e.g., 08 9400 1234"
                  className="input-sanctuary w-full pl-10"
                />
              </div>
              <p className="text-xs text-secondary-400 mt-2">
                We'll add a quick "Call Clinic" button for easy access
              </p>
            </div>

            {error && (
              <div className="bg-alert-50 border border-alert-200 rounded-card p-4">
                <p className="text-sm text-alert-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-4 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>

          <p className="text-center text-sm text-secondary-400 mt-6">
            You can add family members later from Settings
          </p>
        </div>
      </div>
    </div>
  )
}
