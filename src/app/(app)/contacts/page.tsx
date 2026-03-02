'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { ContactCard } from '@/components/contacts/ContactCard'
import { ContactForm } from '@/components/contacts/ContactForm'
import { CategoryTabs } from '@/components/contacts/CategoryTabs'
import { useApp } from '../provider'

export default function ContactsPage() {
  const { currentWorkspace, refreshData } = useApp()
  const [serverContacts, setServerContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)
  const [category, setCategory] = useState('')

  const localContacts = useLiveQuery(
    () =>
      db.contacts
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((c) => !c.deletedAt)
        .toArray(),
    [currentWorkspace.id]
  )

  const fetchContacts = useCallback(async () => {
    try {
      const url = `/api/workspaces/${currentWorkspace.id}/contacts${category ? `?category=${category}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setServerContacts(data.contacts)
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id, category])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleSaved = () => {
    fetchContacts()
    refreshData()
    setEditContact(null)
  }

  const contacts = serverContacts.length > 0 ? serverContacts : localContacts || []
  const filteredContacts = category
    ? contacts.filter((c: any) => c.category === category)
    : contacts

  // Separate emergency contacts
  const emergencyContacts = filteredContacts.filter((c: any) => c.isEmergency)
  const regularContacts = filteredContacts.filter((c: any) => !c.isEmergency)

  if (loading && !localContacts) {
    return (
      <>
        <Header title="Care Team" />
        <PageContainer><LoadingState message="Loading contacts..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Care Team"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Add',
          onClick: () => setShowForm(true),
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Category Filter */}
        <CategoryTabs selected={category} onChange={setCategory} />

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Emergency Contacts</h2>
            <div className="space-y-3">
              {emergencyContacts.map((contact: any) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={() => { setEditContact(contact); setShowForm(true) }}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Contacts */}
        <section>
          {regularContacts.length === 0 && emergencyContacts.length === 0 ? (
            <Card variant="outline" className="text-center py-8">
              <Users className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No contacts yet</p>
              <p className="text-sm text-secondary-400 mt-1">Add your care team members and important contacts</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {regularContacts.map((contact: any) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={() => { setEditContact(contact); setShowForm(true) }}
                />
              ))}
            </div>
          )}
        </section>
      </PageContainer>

      {/* Contact Form Modal */}
      <ContactForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditContact(null) }}
        onSaved={handleSaved}
        workspaceId={currentWorkspace.id}
        initialData={editContact || undefined}
      />
    </>
  )
}
