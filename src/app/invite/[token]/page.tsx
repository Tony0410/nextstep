'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, Users, AlertCircle } from 'lucide-react'
import { Button, Card, LoadingState, showToast } from '@/components/ui'

interface InviteInfo {
  workspaceName: string
  role: string
  expiresAt: string
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/invite/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invite link')
          return
        }

        setInviteInfo(data.invite)
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    setError('')

    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.status === 401) {
        setNeedsAuth(true)
        return
      }

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite')
        return
      }

      showToast(`Joined ${data.workspace.name}!`, 'success')
      router.push('/today')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading invite..." />
      </div>
    )
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">
            Invite Not Available
          </h1>
          <p className="text-secondary-500 mb-6">{error}</p>
          <Link href="/login">
            <Button fullWidth variant="secondary">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">
            Sign In Required
          </h1>
          <p className="text-secondary-500 mb-6">
            Create an account or sign in to join {inviteInfo?.workspaceName}
          </p>
          <div className="space-y-3">
            <Link href={`/register?redirect=/invite/${token}`}>
              <Button fullWidth>Create Account</Button>
            </Link>
            <Link href={`/login?redirect=/invite/${token}`}>
              <Button fullWidth variant="secondary">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900">
            You're Invited!
          </h1>
        </div>

        <Card className="mb-6 text-center">
          <p className="text-secondary-600 mb-4">
            You've been invited to join
          </p>
          <p className="text-xl font-bold text-secondary-900 mb-2">
            {inviteInfo?.workspaceName}
          </p>
          <p className="text-sm text-secondary-500">
            as {inviteInfo?.role === 'EDITOR' ? 'an Editor' : 'a Viewer'}
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-button mt-4">
              {error}
            </p>
          )}
        </Card>

        <Button onClick={handleAccept} fullWidth loading={accepting}>
          Accept Invite
        </Button>

        <p className="text-center text-sm text-secondary-500 mt-4">
          This invite expires on{' '}
          {inviteInfo && new Date(inviteInfo.expiresAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
