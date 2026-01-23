'use client'

import { Printer, Pill, Calendar, Stethoscope } from 'lucide-react'
import Link from 'next/link'

import { Card } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'

const printOptions = [
  {
    href: '/print/daily-meds',
    icon: Pill,
    title: 'Daily Medication Schedule',
    description: 'Large checkboxes for tracking daily doses. Great for posting on the fridge.',
  },
  {
    href: '/print/appointments',
    icon: Calendar,
    title: 'Upcoming Appointments',
    description: 'List of upcoming appointments with dates, times, and locations.',
  },
  {
    href: '/print/doctor-visit',
    icon: Stethoscope,
    title: "Doctor's Visit Summary",
    description: 'Complete summary with medications, symptoms, and questions to ask.',
  },
]

export default function PrintPage() {
  return (
    <>
      <Header title="Print" showBack />
      <PageContainer className="pt-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Printer className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-secondary-900">Print Documents</h2>
          </div>
          <p className="text-secondary-600 text-sm">
            Generate printable documents for caregiving, appointments, and medication tracking.
          </p>
        </div>

        <div className="space-y-3">
          {printOptions.map((option) => (
            <Link key={option.href} href={option.href}>
              <Card className="hover:bg-secondary-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-secondary-100 rounded-lg">
                    <option.icon className="w-5 h-5 text-secondary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-secondary-900">{option.title}</h3>
                    <p className="text-sm text-secondary-500 mt-0.5">{option.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> After opening a print page, use your browser's print function
            (Ctrl/Cmd + P) to print or save as PDF.
          </p>
        </div>
      </PageContainer>
    </>
  )
}
