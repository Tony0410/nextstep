'use client'

import { Shield, Phone, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'

export default function DisclaimerPage() {
  return (
    <>
      <Header title="Disclaimer" showBack backHref="/settings" />
      <PageContainer className="pt-4 space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-secondary-900">
              Important Information
            </h2>
          </div>

          <div className="space-y-4 text-secondary-700">
            <p>
              <strong>Next Step is a tracking and organizational tool only.</strong> It is
              designed to help you and your family keep track of appointments, medications,
              and notes during your healthcare journey.
            </p>

            <div className="bg-red-50 border border-red-100 rounded-card p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">
                    This app does not provide medical advice.
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    Never use this app to make medical decisions. Always consult your
                    healthcare team for any questions about your treatment.
                  </p>
                </div>
              </div>
            </div>

            <p>
              The medication reminders in this app are for tracking purposes only. They are
              not a substitute for professional medical advice, and the app does not verify
              the accuracy of medication schedules.
            </p>

            <p>
              <strong>If you experience a medical emergency:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Call 000 (Australia) or your local emergency services</li>
              <li>Go to your nearest emergency department</li>
              <li>Contact your healthcare team directly</li>
            </ul>

            <div className="bg-primary-50 border border-primary-100 rounded-card p-4">
              <div className="flex gap-3">
                <Phone className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-primary-800">
                    Questions about your treatment?
                  </p>
                  <p className="text-primary-700 text-sm mt-1">
                    Use the "Call Clinic" button on the Today screen to contact your
                    healthcare team directly.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-secondary-500 pt-4 border-t border-border">
              By using Next Step, you acknowledge that this application is for organizational
              purposes only and does not replace professional medical advice, diagnosis, or
              treatment.
            </p>
          </div>
        </Card>
      </PageContainer>
    </>
  )
}
