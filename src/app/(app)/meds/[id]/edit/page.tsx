'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/sync'
import { Header, PageContainer } from '@/components/layout/header'
import { MedicationForm } from '@/components/medications/MedicationForm'
import { LoadingState } from '@/components/ui'

export default function EditMedicationPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [medicationId, setMedicationId] = useState<string>('')

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p) => setMedicationId(p.id))
    } else {
      setMedicationId(params.id)
    }
  }, [params])

  const medication = useLiveQuery(
    () => (medicationId ? db.medications.get(medicationId) : undefined),
    [medicationId]
  )

  if (!medicationId || !medication) {
    return (
      <>
        <Header title="Edit Medication" showBack />
        <PageContainer>
          <LoadingState message="Loading medication..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Edit Medication" showBack />
      <PageContainer className="pt-4">
        <MedicationForm initialData={medication} isEditing />
      </PageContainer>
    </>
  )
}
