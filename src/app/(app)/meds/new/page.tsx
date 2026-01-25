'use client'

import { Header, PageContainer } from '@/components/layout/header'
import { MedicationForm } from '@/components/medications/MedicationForm'

export default function NewMedicationPage() {
  return (
    <>
      <Header title="New Medication" showBack backHref="/meds" />
      <PageContainer className="pt-4">
        <MedicationForm />
      </PageContainer>
    </>
  )
}