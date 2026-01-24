'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Users,
  UserPlus,
  Trash2,
  Key,
  Shield,
  Edit2,
  Loader,
  AlertTriangle,
} from 'lucide-react'
import { Button, Card, Input, Modal, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'

interface Member {
  id: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    lastLoginAt: string | null
    forcePasswordReset: boolean
    createdAt: string
  }
}

export default function MembersPage() {
  const router = useRouter()
  const { currentWorkspace, user } = useApp()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditRole, setShowEditRole] = useState<Member | null>(null)
  const [showResetPassword, setShowResetPassword] = useState<Member | null>(null)
  const [showRemove, setShowRemove] = useState<Member | null>(null)

  // Form states
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER' as 'OWNER' | 'EDITOR' | 'VIEWER',
    forcePasswordReset: true,
  })
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    forceChange: true,
  })
  const [newRole, setNewRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>('VIEWER')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`)
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      setMembers(data.members)
    } catch (err) {
      setError('Failed to load members')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id])

  useEffect(() => {
    if (currentWorkspace.role !== 'OWNER') {
      router.push('/settings')
      return
    }
    fetchMembers()
  }, [currentWorkspace.role, fetchMembers, router])

  const handleAddUser = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserForm),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      showToast(data.message || 'User added', 'success')
      setShowAddUser(false)
      setAddUserForm({
        name: '',
        email: '',
        password: '',
        role: 'VIEWER',
        forcePasswordReset: true,
      })
      fetchMembers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add user', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!showEditRole) return
    setActionLoading(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${showEditRole.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      showToast('Role updated', 'success')
      setShowEditRole(null)
      fetchMembers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!showResetPassword) return
    setActionLoading(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${showResetPassword.id}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resetPasswordForm),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      showToast(data.message || 'Password reset', 'success')
      setShowResetPassword(null)
      setResetPasswordForm({ newPassword: '', forceChange: true })
      fetchMembers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset password', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!showRemove) return
    setActionLoading(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members/${showRemove.id}`,
        { method: 'DELETE' }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      showToast('Member removed', 'success')
      setShowRemove(null)
      fetchMembers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove member', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800'
      case 'EDITOR':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-secondary-100 text-secondary-800'
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Manage Members" showBack />
        <PageContainer className="pt-4">
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-secondary-400" />
          </div>
        </PageContainer>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Manage Members" showBack />
        <PageContainer className="pt-4">
          <Card className="text-center py-8">
            <p className="text-secondary-500">{error}</p>
          </Card>
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Manage Members" showBack />
      <PageContainer className="pt-4 space-y-4">
        {/* Add user button */}
        <Button onClick={() => setShowAddUser(true)} className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>

        {/* Members list */}
        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.user.id === user.id

            return (
              <Card key={member.id} padding="none">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-secondary-900">
                          {member.user.name}
                          {isCurrentUser && (
                            <span className="text-secondary-500 font-normal"> (you)</span>
                          )}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(member.role)}`}
                        >
                          {member.role}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-500 mt-0.5">{member.user.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-secondary-400">
                        <span>
                          Joined {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                        </span>
                        {member.user.lastLoginAt && (
                          <span>
                            Last login{' '}
                            {format(new Date(member.user.lastLoginAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      {member.user.forcePasswordReset && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Must change password on next login</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isCurrentUser && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowEditRole(member)
                          setNewRole(member.role)
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowResetPassword(member)
                          setResetPasswordForm({ newPassword: '', forceChange: true })
                        }}
                      >
                        <Key className="w-3.5 h-3.5 mr-1" />
                        Reset Password
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setShowRemove(member)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        {members.length === 0 && (
          <Card className="text-center py-8">
            <Users className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
            <p className="text-secondary-500">No members yet</p>
          </Card>
        )}
      </PageContainer>

      {/* Add User Modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Add User">
        <div className="space-y-4">
          <Input
            label="Name"
            value={addUserForm.name}
            onChange={(e) => setAddUserForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Enter name"
          />
          <Input
            label="Email"
            type="email"
            value={addUserForm.email}
            onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Enter email"
          />
          <Input
            label="Temporary Password"
            type="text"
            value={addUserForm.password}
            onChange={(e) => setAddUserForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="At least 8 characters"
            helperText="User will be required to change this on first login"
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Role</label>
            <div className="flex gap-2">
              {(['VIEWER', 'EDITOR', 'OWNER'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setAddUserForm((f) => ({ ...f, role }))}
                  className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-colors ${
                    addUserForm.role === role
                      ? 'bg-primary-500 text-white'
                      : 'bg-muted text-secondary-600'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleAddUser}
            fullWidth
            loading={actionLoading}
            disabled={!addUserForm.name || !addUserForm.email || addUserForm.password.length < 8}
          >
            Add User
          </Button>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!showEditRole}
        onClose={() => setShowEditRole(null)}
        title="Change Role"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Change role for <strong>{showEditRole?.user.name}</strong>
          </p>
          <div className="flex gap-2">
            {(['VIEWER', 'EDITOR', 'OWNER'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setNewRole(role)}
                className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-colors ${
                  newRole === role
                    ? 'bg-primary-500 text-white'
                    : 'bg-muted text-secondary-600'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <div className="text-sm text-secondary-500">
            <p><strong>Viewer:</strong> Can view everything but not make changes</p>
            <p><strong>Editor:</strong> Can add and edit appointments, medications, notes</p>
            <p><strong>Owner:</strong> Full access including member management</p>
          </div>
          <Button onClick={handleUpdateRole} fullWidth loading={actionLoading}>
            Update Role
          </Button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!showResetPassword}
        onClose={() => setShowResetPassword(null)}
        title="Reset Password"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Reset password for <strong>{showResetPassword?.user.name}</strong>
          </p>
          <Input
            label="New Password"
            type="text"
            value={resetPasswordForm.newPassword}
            onChange={(e) =>
              setResetPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
            }
            placeholder="At least 8 characters"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={resetPasswordForm.forceChange}
              onChange={(e) =>
                setResetPasswordForm((f) => ({ ...f, forceChange: e.target.checked }))
              }
              className="w-4 h-4 rounded border-secondary-300"
            />
            <span className="text-sm text-secondary-700">
              Require password change on next login
            </span>
          </label>
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            This will log the user out of all devices.
          </p>
          <Button
            onClick={handleResetPassword}
            fullWidth
            loading={actionLoading}
            disabled={resetPasswordForm.newPassword.length < 8}
          >
            Reset Password
          </Button>
        </div>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        isOpen={!!showRemove}
        onClose={() => setShowRemove(null)}
        title="Remove Member"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to remove <strong>{showRemove?.user.name}</strong> from
            this workspace? They will lose access to all data.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowRemove(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              fullWidth
              loading={actionLoading}
              onClick={handleRemoveMember}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
