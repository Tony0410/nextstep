'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone,
  Users,
  Type,
  Download,
  LogOut,
  ChevronRight,
  Shield,
  ExternalLink,
  Copy,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, Button, Input, Modal, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../provider'

export default function SettingsPage() {
  const router = useRouter()
  const { user, currentWorkspace, workspaces, refreshData } = useApp()

  const [showPhoneEdit, setShowPhoneEdit] = useState(false)
  const [clinicPhone, setClinicPhone] = useState(currentWorkspace.clinicPhone || '')
  const [emergencyPhone, setEmergencyPhone] = useState(currentWorkspace.emergencyPhone || '')
  const [saving, setSaving] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER')

  // Get workspace from IndexedDB for large text mode
  const workspace = useLiveQuery(
    () => db.workspaces.get(currentWorkspace.id),
    [currentWorkspace.id]
  )

  const handleUpdatePhones = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicPhone: clinicPhone.trim() || null,
          emergencyPhone: emergencyPhone.trim() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to update')

      await refreshData()
      setShowPhoneEdit(false)
      showToast('Phone numbers updated', 'success')
    } catch {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLargeText = async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          largeTextMode: !currentWorkspace.largeTextMode,
        }),
      })

      if (!response.ok) throw new Error('Failed to update')

      await refreshData()
      window.location.reload()
    } catch {
      showToast('Failed to update', 'error')
    }
  }

  const handleCreateInvite = async () => {
    setInviteLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: inviteRole, expiresInDays: 7 }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setInviteUrl(data.invite.url)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create invite', 'error')
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    showToast('Link copied!', 'success')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      showToast('Failed to log out', 'error')
    }
  }

  const handleExportJSON = async () => {
    try {
      // Fetch all data
      const [appointments, medications, notes, doseLogs] = await Promise.all([
        db.appointments.where('workspaceId').equals(currentWorkspace.id).toArray(),
        db.medications.where('workspaceId').equals(currentWorkspace.id).toArray(),
        db.notes.where('workspaceId').equals(currentWorkspace.id).toArray(),
        db.doseLogs.where('workspaceId').equals(currentWorkspace.id).toArray(),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        workspace: currentWorkspace.name,
        appointments: appointments.filter((a) => !a.deletedAt),
        medications: medications.filter((m) => !m.deletedAt),
        notes: notes.filter((n) => !n.deletedAt),
        doseLogs: doseLogs.filter((d) => !d.undoneAt),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nextstep-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      showToast('Data exported', 'success')
    } catch {
      showToast('Export failed', 'error')
    }
  }

  return (
    <>
      <Header title="Settings" />
      <PageContainer className="pt-4 space-y-6">
        {/* Workspace info */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Workspace
          </h2>
          <Card>
            <p className="font-semibold text-secondary-900">{currentWorkspace.name}</p>
            <p className="text-sm text-secondary-500 capitalize mt-1">
              You're the {currentWorkspace.role.toLowerCase()}
            </p>
          </Card>
        </section>

        {/* Contact numbers */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Contact Numbers
          </h2>
          <Card padding="none">
            <button
              onClick={() => setShowPhoneEdit(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors"
            >
              <Phone className="w-5 h-5 text-secondary-500" />
              <div className="flex-1 text-left">
                <p className="font-medium text-secondary-900">Clinic</p>
                <p className="text-sm text-secondary-500">
                  {currentWorkspace.clinicPhone || 'Not set'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary-300" />
            </button>
            <div className="border-t border-border">
              <button
                onClick={() => setShowPhoneEdit(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5 text-secondary-500" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-secondary-900">Emergency Contact</p>
                  <p className="text-sm text-secondary-500">
                    {currentWorkspace.emergencyPhone || 'Not set'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary-300" />
              </button>
            </div>
          </Card>
        </section>

        {/* Family members */}
        {currentWorkspace.role === 'OWNER' && (
          <section>
            <h2 className="text-sm font-semibold text-secondary-600 mb-3">
              Family Access
            </h2>
            <Card padding="none">
              <button
                onClick={() => setShowInvite(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors"
              >
                <Users className="w-5 h-5 text-secondary-500" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-secondary-900">Invite Family Member</p>
                  <p className="text-sm text-secondary-500">Share access to this workspace</p>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary-300" />
              </button>
            </Card>
          </section>
        )}

        {/* Accessibility */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Accessibility
          </h2>
          <Card padding="none">
            <button
              onClick={handleToggleLargeText}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors"
            >
              <Type className="w-5 h-5 text-secondary-500" />
              <div className="flex-1 text-left">
                <p className="font-medium text-secondary-900">Large Text</p>
                <p className="text-sm text-secondary-500">
                  {currentWorkspace.largeTextMode ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div
                className={`w-12 h-7 rounded-full transition-colors ${
                  currentWorkspace.largeTextMode ? 'bg-primary-500' : 'bg-secondary-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm mt-1 transition-transform ${
                    currentWorkspace.largeTextMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
            </button>
          </Card>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">Data</h2>
          <Card padding="none">
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors"
            >
              <Download className="w-5 h-5 text-secondary-500" />
              <div className="flex-1 text-left">
                <p className="font-medium text-secondary-900">Export Data</p>
                <p className="text-sm text-secondary-500">Download as JSON</p>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary-300" />
            </button>
          </Card>
        </section>

        {/* Legal */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">About</h2>
          <Card padding="none">
            <button
              onClick={() => router.push('/settings/disclaimer')}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors"
            >
              <Shield className="w-5 h-5 text-secondary-500" />
              <div className="flex-1 text-left">
                <p className="font-medium text-secondary-900">Disclaimer</p>
                <p className="text-sm text-secondary-500">Important information</p>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary-300" />
            </button>
          </Card>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">Account</h2>
          <Card>
            <p className="text-secondary-700">{user.name}</p>
            <p className="text-sm text-secondary-500">{user.email}</p>
            <Button
              variant="ghost"
              className="mt-4 text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </Card>
        </section>
      </PageContainer>

      {/* Phone edit modal */}
      <Modal
        isOpen={showPhoneEdit}
        onClose={() => setShowPhoneEdit(false)}
        title="Contact Numbers"
      >
        <div className="space-y-4">
          <Input
            label="Clinic Phone"
            type="tel"
            value={clinicPhone}
            onChange={(e) => setClinicPhone(e.target.value)}
            placeholder="e.g., 08 9400 1234"
          />
          <Input
            label="Emergency Contact"
            type="tel"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="e.g., 0412 345 678"
          />
          <Button onClick={handleUpdatePhones} fullWidth loading={saving}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => {
          setShowInvite(false)
          setInviteUrl('')
        }}
        title="Invite Family Member"
      >
        {!inviteUrl ? (
          <div className="space-y-4">
            <p className="text-secondary-600">
              Create an invite link to share with a family member. They'll be able to
              view and help manage {currentWorkspace.name}.
            </p>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Permission Level
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInviteRole('VIEWER')}
                  className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-colors ${
                    inviteRole === 'VIEWER'
                      ? 'bg-primary-500 text-white'
                      : 'bg-muted text-secondary-600'
                  }`}
                >
                  Viewer
                </button>
                <button
                  onClick={() => setInviteRole('EDITOR')}
                  className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-colors ${
                    inviteRole === 'EDITOR'
                      ? 'bg-primary-500 text-white'
                      : 'bg-muted text-secondary-600'
                  }`}
                >
                  Editor
                </button>
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                {inviteRole === 'VIEWER'
                  ? 'Can view everything but not make changes'
                  : 'Can add appointments, log doses, and add notes'}
              </p>
            </div>

            <Button onClick={handleCreateInvite} fullWidth loading={inviteLoading}>
              Create Invite Link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-secondary-600">
              Share this link with your family member. It expires in 7 days.
            </p>

            <div className="bg-muted p-3 rounded-button break-all text-sm text-secondary-700">
              {inviteUrl}
            </div>

            <Button onClick={copyInviteLink} fullWidth>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
